use chrono::prelude::*;
use futures::{future::join4, pin_mut};
use log::{debug, error, warn};
use postgres_types::{FromSql, Kind, ToSql, Type};
use protocol::{
    board_protocol::{server_message::Msg, Edit, PushData, ServerMessage},
    decode_server_msg, encode_server_msg,
};
use std::{collections::HashMap, fmt::Write as _, time::SystemTime};
use tokio::{sync::oneshot, task::spawn_blocking};
use tokio_postgres::binary_copy::BinaryCopyInWriter;
use uuid::Uuid;

use crate::libs::{
    db_queue::{DbQueueSender, EditCreateChunk, EditReadChunk, EditUpdateChunk},
    state::{DbClient, ExposeId, QueueOp},
};

// helpers

async fn encode_edit_async(edit: Edit) -> Vec<u8> {
    let (tx, rx) = oneshot::channel();
    spawn_blocking(move || {
        let encoded = encode_server_msg(&ServerMessage {
            msg: Some(Msg::PushData(PushData { data: vec![edit] })),
        });
        tx.send(encoded).unwrap();
    })
    .await
    .unwrap();
    rx.await.unwrap()
}

async fn decode_edit_async(buf: Vec<u8>) -> Edit {
    let (tx, rx) = oneshot::channel();
    spawn_blocking(move || {
        let msg = decode_server_msg(&buf).unwrap().msg.unwrap();
        match msg {
            Msg::PushData(mut data) => tx.send(data.data.swap_remove(0)).unwrap(),
            _ => panic!("Msg is not PushData"),
        };
    })
    .await
    .unwrap();
    rx.await.unwrap()
}

// types

pub type IdAction = (SystemTime, Box<str>);
pub type EditAction = (SystemTime, Edit);

// enums

#[derive(Debug, ToSql, FromSql, PartialEq)]
#[postgres(name = "edit_status")]
pub enum EditStatus {
    #[postgres(name = "current")]
    Current,
    #[postgres(name = "undone")]
    Undone,
}

// structs

#[derive(PartialEq, Debug)]
struct SyncData {
    current_create: Vec<EditAction>,
    undone_create: Vec<EditAction>,
    set_status_current: Vec<IdAction>,
    set_status_undone: Vec<IdAction>,
}

#[derive(PartialEq, Debug)]
pub struct EditState {
    pub current: Vec<Edit>,
    pub undone: Vec<Edit>,
}

// methods

fn get_sync_data(queue: Vec<QueueOp>) -> SyncData {
    let mut current = HashMap::new();
    let mut undone = HashMap::new();
    let mut set_current_ids = HashMap::new();
    let mut set_undone_ids = HashMap::new();
    // remove possible dublicates from out future db queries
    for op in queue {
        match op {
            QueueOp::Push(stamp, edit) => {
                current.insert(edit.edit.as_ref().unwrap().id().into(), (stamp, edit));
            }
            QueueOp::Undo(stamp, id) => {
                if let Some((_, edit)) = current.remove(&id) {
                    undone.insert(id, (stamp, edit));
                } else {
                    let _ = set_current_ids.remove(id.as_ref());
                    set_undone_ids.insert(id.clone(), (stamp, id));
                }
            }
            QueueOp::Redo(stamp, id) => {
                if let Some((_, edit)) = undone.remove(id.as_ref()) {
                    current.insert(id, (stamp, edit));
                } else {
                    let _ = set_undone_ids.remove(id.as_ref());
                    set_current_ids.insert(id.clone(), (stamp, id));
                }
            }
        }
    }
    // return data
    SyncData {
        current_create: current.into_values().collect(),
        undone_create: undone.into_values().collect(),
        set_status_current: set_current_ids
            .into_iter()
            .map(|(id, (stamp, _))| (stamp, id))
            .collect(),
        set_status_undone: set_undone_ids
            .into_iter()
            .map(|(id, (stamp, _))| (stamp, id))
            .collect(),
    }
}

pub async fn sync_with_queue(
    edit_queue: &DbQueueSender,
    public_id: Uuid,
    queue: Vec<QueueOp>,
) -> Result<u64, tokio_postgres::Error> {
    let data = get_sync_data(queue);
    let (tx1, rx1) = oneshot::channel();
    let (tx2, rx2) = oneshot::channel();
    let (tx3, rx3) = oneshot::channel();
    let (tx4, rx4) = oneshot::channel();
    // execute the ops
    let _ = join4(
        async {
            if !data.current_create.is_empty() {
                return edit_queue
                    .create_edit
                    .send(EditCreateChunk {
                        public_id,
                        status: EditStatus::Current,
                        items: data.current_create,
                        ready: tx1,
                    })
                    .await;
            }
            Ok(())
        },
        async {
            if !data.undone_create.is_empty() {
                return edit_queue
                    .create_edit
                    .send(EditCreateChunk {
                        public_id,
                        status: EditStatus::Undone,
                        items: data.undone_create,
                        ready: tx2,
                    })
                    .await;
            }
            Ok(())
        },
        async {
            if !data.set_status_current.is_empty() {
                return edit_queue
                    .update_edit
                    .send(EditUpdateChunk {
                        status: EditStatus::Current,
                        items: data.set_status_current,
                        ready: tx3,
                    })
                    .await;
            }
            Ok(())
        },
        async {
            if !data.set_status_undone.is_empty() {
                return edit_queue
                    .update_edit
                    .send(EditUpdateChunk {
                        status: EditStatus::Undone,
                        items: data.set_status_undone,
                        ready: tx4,
                    })
                    .await;
            }
            Ok(())
        },
    )
    .await;

    let _ = join4(rx1, rx2, rx3, rx4).await;

    Ok(4)
}

pub async fn create(
    db_client: &DbClient<'_>,
    chunks: Vec<EditCreateChunk>,
) -> Result<u64, tokio_postgres::Error> {
    if chunks.is_empty() {
        return Ok(0);
    }
    let edit_status_type: Type = Type::new(
        "edit_status".to_owned(),
        0, // Scary but works
        Kind::Enum(vec!["current".to_owned(), "undone".to_owned()]),
        "".to_owned(),
    );

    let sink = db_client
        .copy_in("COPY edits (board_id, edit_id, status, changed_at, data) FROM STDIN BINARY")
        .await?;
    let writer = BinaryCopyInWriter::new(
        sink,
        &[
            Type::UUID,
            Type::UUID,
            edit_status_type,
            Type::TIMESTAMP,
            Type::BYTEA,
        ],
    );
    pin_mut!(writer);
    let mut ready_list = Vec::new();

    for chunk in chunks {
        for (stamp, edit) in chunk.items {
            let id = Uuid::try_parse(edit.edit.as_ref().unwrap().id()).unwrap();
            writer
                .as_mut()
                .write(&[
                    &chunk.public_id,
                    &id,
                    &chunk.status,
                    &stamp,
                    &encode_edit_async(edit).await,
                ])
                .await
                .unwrap();
        }
        ready_list.push(chunk.ready);
    }

    match writer.finish().await {
        Ok(r) => {
            ready_list.into_iter().for_each(|c| {
                if let Err(_) = c.send(()) {
                    warn!("Cannot send create result to the room");
                }
            });
            Ok(r)
        }
        Err(e) => {
            error!("Failed to finish COPY: {}", e);
            Ok(0)
        }
    }
}

pub async fn read(
    db_client: &DbClient<'_>,
    chunks: Vec<EditReadChunk>,
) -> Result<(), tokio_postgres::Error> {
    let mut res: HashMap<Uuid, EditState> = HashMap::with_capacity(chunks.len());
    if chunks.len() == 0 {
        return Ok(());
    }
    // form query
    let mut statement =
        String::from("SELECT status, board_id, data FROM edits WHERE board_id in (");
    for chunk in chunks.iter() {
        write!(&mut statement, "'{}',", chunk.public_id).unwrap();
    }
    statement.pop();
    statement.push_str(") ORDER BY changed_at ASC");
    // store results
    for row in db_client.query(&statement, &[]).await.unwrap() {
        let status = row.get("status");
        let data = decode_edit_async(row.get::<&str, Vec<u8>>("data")).await;
        let id = row.get("board_id");
        match res.get_mut(&id) {
            Some(entry) => match status {
                EditStatus::Current => entry.current.push(data),
                EditStatus::Undone => entry.undone.push(data),
            },
            None => match status {
                EditStatus::Current => {
                    res.insert(
                        id,
                        EditState {
                            current: vec![data],
                            undone: vec![],
                        },
                    );
                }

                EditStatus::Undone => {
                    res.insert(
                        id,
                        EditState {
                            current: vec![],
                            undone: vec![data],
                        },
                    );
                }
            },
        }
    }
    // send results
    for chunk in chunks {
        let _ = chunk
            .ready
            .send(res.remove(&chunk.public_id).unwrap_or(EditState {
                current: vec![],
                undone: vec![],
            }));
    }

    Ok(())
}

pub async fn set_status(
    db_client: &DbClient<'_>,
    chunks: Vec<EditUpdateChunk>,
) -> Result<u64, tokio_postgres::Error> {
    if chunks.is_empty() {
        return Ok(0);
    }
    let mut statement = String::from("BEGIN;");
    let mut ready_list = Vec::with_capacity(chunks.len());

    // form query
    for chunk in chunks {
        let status = match chunk.status {
            EditStatus::Current => "'current'",
            EditStatus::Undone => "'undone'",
        };

        for (stamp, id) in chunk.items {
            let dt: DateTime<Utc> = stamp.into();
            write!(
                &mut statement,
                "UPDATE edits SET status = {}, changed_at = '{}' WHERE edit_id = '{}';",
                status,
                dt.format("%Y-%m-%d %H:%M:%S%.3f"),
                id
            )
            .unwrap();
        }
        ready_list.push(chunk.ready);
    }
    statement.push_str("COMMIT;");

    // execute
    db_client.batch_execute(&statement).await?;
    // notify listeners
    ready_list.into_iter().for_each(|c| {
        if let Err(_) = c.send(()) {
            warn!("Failed to send update result");
        }
    });

    Ok(1)
}

pub async fn delete(
    db_client: &DbClient<'_>,
    public_id: Uuid,
    status: &EditStatus,
) -> Result<u64, tokio_postgres::Error> {
    db_client
        .execute(
            "DELETE FROM edits WHERE status = $1 AND board_id = $2",
            &[&status, &public_id],
        )
        .await
}

// tests

#[cfg(test)]
mod tests {
    use std::time::Duration;

    use super::*;

    const SEC: Duration = Duration::from_secs(1);

    fn get_edit_sample(id: &str) -> Edit {
        Edit {
            edit: Some(protocol::board_protocol::edit::Edit::Add(
                protocol::board_protocol::Add {
                    id: id.to_owned(),
                    shape: None,
                },
            )),
        }
    }

    #[test]
    fn get_sync_data_same_undo_operation_not_repeat() {
        let t_1 = SystemTime::now();
        let t_2 = t_1 + SEC;
        let t_3 = t_2 + SEC;
        let queue = vec![
            QueueOp::Undo(t_1, "1".into()),
            QueueOp::Undo(t_2, "1".into()),
            QueueOp::Undo(t_3, "1".into()),
        ];
        let data = get_sync_data(queue);

        assert_eq!(data.set_status_undone.len(), 1);
    }

    #[test]
    fn get_sync_data_same_redo_operation_not_repeat() {
        let t_1 = SystemTime::now();
        let t_2 = t_1 + SEC;
        let t_3 = t_2 + SEC;
        let queue = vec![
            QueueOp::Redo(t_1, "1".into()),
            QueueOp::Redo(t_2, "1".into()),
            QueueOp::Redo(t_3, "1".into()),
        ];
        let data = get_sync_data(queue);

        assert_eq!(data.set_status_current.len(), 1);
    }

    #[test]
    fn get_sync_data_undo_push_case() {
        let t_1 = SystemTime::now();
        let t_2 = t_1 + SEC;
        let queue = vec![
            QueueOp::Undo(t_1, "1".into()),
            QueueOp::Push(t_2, get_edit_sample("2")),
        ];

        let data = get_sync_data(queue);

        assert_eq!(
            data,
            SyncData {
                current_create: vec![(t_2, get_edit_sample("2"))],
                undone_create: vec![],
                set_status_undone: vec![(t_1, "1".into())],
                set_status_current: vec![]
            }
        );
    }

    #[test]
    fn get_sync_data_redo_push_case() {
        let t_1 = SystemTime::now();
        let t_2 = t_1 + SEC;
        let queue = vec![
            QueueOp::Redo(t_1, "1".into()),
            QueueOp::Push(t_2, get_edit_sample("2")),
        ];

        let data = get_sync_data(queue);

        assert_eq!(
            data,
            SyncData {
                current_create: vec![(t_2, get_edit_sample("2"))],
                undone_create: vec![],
                set_status_undone: vec![],
                set_status_current: vec![(t_1, "1".into())],
            }
        );
    }

    #[test]
    fn get_sync_data_undo_redo_push_case() {
        let t_0 = SystemTime::now();
        let t_1 = t_0 + SEC;
        let t_2 = t_1 + SEC;
        let queue = vec![
            QueueOp::Undo(t_0, "0".into()),
            QueueOp::Redo(t_1, "1".into()),
            QueueOp::Push(t_2, get_edit_sample("2")),
        ];

        let data = get_sync_data(queue);

        assert_eq!(data.set_status_current, vec![(t_1, "1".into())],);
        assert_eq!(data.set_status_undone, vec![(t_0, "0".into())],);
        assert_eq!(data.current_create, vec![(t_2, get_edit_sample("2"))],);
        assert_eq!(data.undone_create, vec![],);
    }

    #[test]
    fn get_sync_data_undone_shape_not_push() {
        let t_0 = SystemTime::now();
        let t_1 = t_0 + SEC;
        let t_2 = t_1 + SEC;
        let t_3 = t_2 + SEC;
        let queue = vec![
            QueueOp::Undo(t_0, "0".into()),
            QueueOp::Push(t_1, get_edit_sample("1")),
            QueueOp::Undo(t_2, "1".into()),
            QueueOp::Undo(t_3, "3".into()),
        ];

        let data = get_sync_data(queue);

        assert_eq!(data.undone_create, vec![(t_2, get_edit_sample("1"))]);
    }
}
