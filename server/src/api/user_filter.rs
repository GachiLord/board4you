use crate::{
    entities::user::{self, verify_password, User},
    libs::{
        auth::get_access_token_cookie,
        state::{DbClient, JwtKey},
    },
    with_db_client,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use warp::http::{header::SET_COOKIE, Response, StatusCode};
use warp::{
    reply::{json, with_status, Json, WithStatus},
    Filter,
};

use super::common::{
    as_string, with_user_data, Reply, ReplyWithPayload, UserDataFromJwt, CONTENT_LENGTH_LIMIT,
};

pub fn user_filter(
    client: DbClient,
    jwt_key: JwtKey,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    let base_route = warp::path("user");

    let create = base_route
        .and(warp::post())
        .and(as_string(CONTENT_LENGTH_LIMIT))
        .and(with_db_client(client.clone()))
        .and_then(create_user);
    let read = base_route
        .and(warp::get())
        .and(as_string(CONTENT_LENGTH_LIMIT))
        .and(with_db_client(client.clone()))
        .and_then(read_user);
    let read_private = base_route
        .and(warp::path("private"))
        .and(warp::post())
        .and(with_user_data(&client, jwt_key.clone()))
        .and_then(read_user_private);
    let update = base_route
        .and(warp::put())
        .and(as_string(CONTENT_LENGTH_LIMIT))
        .and(with_user_data(&client, jwt_key.clone()))
        .and(with_db_client(client.clone()))
        .and_then(update_user);
    let delete = base_route
        .and(warp::delete())
        .and(as_string(CONTENT_LENGTH_LIMIT))
        .and(with_user_data(&client, jwt_key))
        .and(with_db_client(client.clone()))
        .and_then(delete_user);

    read_private.or(read).or(create).or(update).or(delete)
}

async fn create_user(user: String, client: DbClient) -> Result<WithStatus<Json>, warp::Rejection> {
    let user: User = match serde_json::from_str(&user) {
        Ok(u) => u,
        Err(e) => {
            return Ok(with_status(
                json(&ReplyWithPayload {
                    message: "cannot parse body".to_string(),
                    payload: e.to_string(),
                }),
                StatusCode::BAD_REQUEST,
            ))
        }
    };

    match user::create(&client, &user).await {
        Ok(_) => {
            return Ok(with_status(
                json(&Reply {
                    message: "user created".to_string(),
                }),
                StatusCode::OK,
            ))
        }
        Err(e) => {
            return Ok(with_status(
                json(&Reply {
                    message: e.to_string(),
                }),
                StatusCode::BAD_REQUEST,
            ))
        }
    }
}

#[derive(Serialize, Deserialize)]
struct UserInfo {
    public_login: String,
}

async fn read_user_private(
    retrived_user_data: UserDataFromJwt,
) -> Result<impl warp::Reply, warp::Rejection> {
    if let Some(user) = retrived_user_data.user_data {
        let body = serde_json::to_string(&user).unwrap();
        let res = match retrived_user_data.new_jwt_cookie_values {
            Some((c1, c2)) => Response::builder()
                .header(SET_COOKIE, c1)
                .header(SET_COOKIE, c2)
                .status(StatusCode::OK)
                .body(body),
            None => Response::builder().status(StatusCode::OK).body(body),
        };
        return Ok(res);
    }
    return Ok(Response::builder()
        .status(StatusCode::UNAUTHORIZED)
        .body("auth to get this info".to_string()));
}

async fn read_user(user: String, client: DbClient) -> Result<impl warp::Reply, warp::Rejection> {
    let user_info: UserInfo = match serde_json::from_str(&user) {
        Ok(u) => u,
        Err(e) => {
            return Ok(Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .body(e.to_string()))
        }
    };

    let user = client
        .query_one(
            "SELECT (public_login, first_name, second_name) FROM users WHERE public_login=($1)",
            &[&user_info.public_login],
        )
        .await;

    match user {
        Ok(row) => {
            let body = json!({
                "public_login": row.get::<&str, String>("public_login"),
                "first_name": row.get::<&str, String>("first_name"),
                "second_name": row.get::<&str, String>("second_name")
            })
            .to_string();

            return Ok(Response::builder().status(StatusCode::OK).body(body));
        }
        Err(_) => {
            return Ok(Response::builder()
                .status(StatusCode::NOT_FOUND)
                .body("user not found".to_string()))
        }
    }
}

#[derive(Deserialize)]
struct UpdateData {
    user: User,
    password: String,
}

async fn update_user(
    update_data: String,
    user_data: UserDataFromJwt,
    db_client: DbClient,
) -> Result<impl warp::Reply, warp::Rejection> {
    let update_data: UpdateData = match serde_json::from_str(&update_data) {
        Ok(u) => u,
        Err(_) => {
            return Ok(Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .body("cannot parse body".to_string())
                .unwrap())
        }
    };
    if let Err(_) =
        user::verify_password(&db_client, &update_data.user.login, &update_data.password).await
    {
        return Ok(Response::builder()
            .status(StatusCode::BAD_REQUEST)
            .body("wrong password".to_string())
            .unwrap());
    }

    match user_data.user_data {
        Some(user) => match user::update(&db_client, update_data.user, user.id).await {
            Ok(_) => match user_data.new_jwt_cookie_values {
                Some((c1, c2)) => {
                    return Ok(Response::builder()
                        .status(StatusCode::OK)
                        .header(SET_COOKIE, c1)
                        .header(SET_COOKIE, c2)
                        .body("updated".to_string())
                        .unwrap())
                }
                None => {
                    return Ok(Response::builder()
                        .status(StatusCode::OK)
                        .body("updated".to_string())
                        .unwrap())
                }
            },
            Err(e) => {
                return Ok(Response::builder()
                    .status(StatusCode::BAD_REQUEST)
                    .body(e.to_string())
                    .unwrap());
            }
        },
        None => {
            return Ok(Response::builder()
                .status(StatusCode::UNAUTHORIZED)
                .body("auth to update user info".to_string())
                .unwrap())
        }
    }
}

#[derive(Deserialize)]
struct DeleteData {
    password: String,
}
pub async fn delete_user(
    delete_data: String,
    user_data: UserDataFromJwt,
    db_client: DbClient,
) -> Result<impl warp::Reply, warp::Rejection> {
    let delete_data: DeleteData = match serde_json::from_str(&delete_data) {
        Ok(d) => d,
        Err(_) => {
            return Ok(Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .body("failded to parse body")
                .unwrap())
        }
    };

    match user_data.user_data {
        Some(user) => match user::delete(&db_client, user.id).await {
            Ok(_) => {
                if let Err(_) =
                    verify_password(&db_client, &user.login, &delete_data.password).await
                {
                    return Ok(Response::builder()
                        .status(StatusCode::BAD_REQUEST)
                        .body("wrong password")
                        .unwrap());
                }
                return Ok(Response::builder()
                    .status(StatusCode::OK)
                    .header(
                        SET_COOKIE,
                        get_access_token_cookie("deleted".to_string(), Some(-1)),
                    )
                    .header(
                        SET_COOKIE,
                        get_access_token_cookie("deleted".to_string(), Some(-1)),
                    )
                    .body("deleted")
                    .unwrap());
            }
            Err(_) => {
                return Ok(Response::builder()
                    .status(StatusCode::INTERNAL_SERVER_ERROR)
                    .body("failded to delete user")
                    .unwrap())
            }
        },
        None => {
            return Ok(Response::builder()
                .status(StatusCode::UNAUTHORIZED)
                .body("auth to delete user")
                .unwrap())
        }
    }
}
