use postgres_types::{FromSql, ToSql};
use protocol::{
    board_protocol::{server_message::Msg, Edit, PushData, ServerMessage},
    decode_server_msg, encode_server_msg,
};
use std::{collections::HashMap, time::SystemTime};
use tokio::{sync::oneshot, task::spawn_blocking};

use crate::libs::state::{DbClient, ExposeId, QueueOp};

// helpers
fn get_status_value(status: &EditStatus) -> &'static str {
    match status {
        EditStatus::Current => "'current'",
        EditStatus::Undone => "'undone'",
    }
}

async fn encode_edit_async(edit: Edit) -> Vec<u8> {
    let (tx, rx) = oneshot::channel();
    spawn_blocking(move || {
        tx.send(encode_server_msg(&ServerMessage {
            msg: Some(Msg::PushData(PushData { data: vec![edit] })),
        }))
        .unwrap();
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

type IdAction = (SystemTime, Box<str>);
type IdActionRef<'a> = (SystemTime, &'a str);
type EditAction = (SystemTime, Edit);

// enums

#[derive(Debug, ToSql, FromSql, PartialEq)]
#[postgres(name = "edit_status")]
pub enum EditStatus {
    #[postgres(name = "current")]
    Current,
    #[postgres(name = "undone")]
    Undone,
}

// methods

#[derive(PartialEq, Debug)]
struct SyncData {
    current_create: Vec<EditAction>,
    undone_create: Vec<EditAction>,
    set_status_current: Vec<IdAction>,
    set_status_undone: Vec<IdAction>,
}

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
    db_client: &DbClient<'_>,
    board_id: i32,
    queue: Vec<QueueOp>,
) -> Result<u64, tokio_postgres::Error> {
    let data = get_sync_data(queue);
    // execute the ops
    let (q1, q2, q3, q4) = futures_util::join!(
        create(
            db_client,
            board_id,
            &EditStatus::Current,
            data.current_create
        ),
        create(db_client, board_id, &EditStatus::Undone, data.undone_create),
        set_status(
            db_client,
            data.set_status_current
                .iter()
                .map(|(stamp, id)| (*stamp, id.as_ref()))
                .collect(),
            &EditStatus::Current,
        ),
        set_status(
            db_client,
            data.set_status_undone
                .iter()
                .map(|(stamp, id)| (*stamp, id.as_ref()))
                .collect(),
            &EditStatus::Undone,
        ),
    );

    Ok(q1? + q2? + q3? + q4?)
}

pub async fn create(
    db_client: &DbClient<'_>,
    board_id: i32,
    status: &EditStatus,
    edits: Vec<EditAction>,
) -> Result<u64, tokio_postgres::Error> {
    let statement = db_client.prepare("INSERT INTO edits (board_id, edit_id, status, changed_at, data) VALUES ($1, $2, $3, $4, $5)").await?;
    let mut count = 0;

    for (stamp, edit) in edits {
        count += db_client
            .execute(
                &statement,
                &[
                    &board_id,
                    &edit.edit.as_ref().unwrap().id().to_owned(),
                    &status,
                    &stamp,
                    &encode_edit_async(edit).await,
                ],
            )
            .await?;
    }

    Ok(count)
}

pub async fn read(
    db_client: &DbClient<'_>,
    board_id: i32,
    status: &EditStatus,
) -> Result<Vec<Edit>, tokio_postgres::Error> {
    let query = db_client
        .query(
            "SELECT (data) FROM edits WHERE board_id = $1 AND status = $2 ORDER BY changed_at ASC",
            &[&board_id, &status],
        )
        .await?;
    let mut output = Vec::with_capacity(query.len());

    for row in query {
        output.push(decode_edit_async(row.get::<&str, Vec<u8>>("data")).await);
    }

    Ok(output)
}

pub async fn set_status(
    db_client: &DbClient<'_>,
    edit_ids: Vec<IdActionRef<'_>>,
    status: &EditStatus,
) -> Result<u64, tokio_postgres::Error> {
    let mut count = 0;
    let query = db_client
        .prepare("UPDATE edits SET status = $1, changed_at = $2 WHERE edit_id = $3")
        .await?;

    for (stamp, id) in edit_ids {
        count += db_client.execute(&query, &[status, &stamp, &id]).await?;
    }

    Ok(count)
}

pub async fn delete(
    db_client: &DbClient<'_>,
    board_id: i32,
    status: &EditStatus,
) -> Result<u64, tokio_postgres::Error> {
    db_client
        .execute(
            "DELETE FROM edits WHERE status = $1 AND board_id = $2",
            &[&status, &board_id],
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
