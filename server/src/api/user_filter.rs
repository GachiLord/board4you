use crate::{
    entities::{
        jwt,
        user::{self, verify_password, User},
    },
    libs::{
        auth::{
            expire_refresh_token, get_jwt_cookies, get_jwt_with_new_data, verify_refresh_token,
            UserData,
        },
        state::{DbClient, JwtKey},
    },
    with_db_client, with_jwt_key,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use warp::http::{header::SET_COOKIE, Response, StatusCode};
use warp::{
    reply::{json, with_status, Json, WithStatus},
    Filter,
};

use super::common::{
    as_string, generate_res, with_jwt_cookies, with_user_data, Reply, ReplyWithPayload,
    UserDataFromJwt, CONTENT_LENGTH_LIMIT,
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
        .and(warp::path!(String))
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
        .and(with_jwt_key(jwt_key.clone()))
        .and(with_jwt_cookies())
        .and(with_db_client(client.clone()))
        .and_then(update_user);
    let delete = base_route
        .and(warp::delete())
        .and(as_string(CONTENT_LENGTH_LIMIT))
        .and(with_jwt_key(jwt_key))
        .and(with_jwt_cookies())
        .and(with_db_client(client))
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
    return Ok(generate_res(StatusCode::UNAUTHORIZED, None));
}

async fn read_user(
    public_login: String,
    client: DbClient,
) -> Result<impl warp::Reply, warp::Rejection> {
    let user = client
        .query_one(
            "SELECT public_login, first_name, second_name FROM users WHERE public_login=($1)",
            &[&public_login],
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
            return Ok(generate_res(
                StatusCode::NOT_FOUND,
                Some("user is not found"),
            ))
        }
    }
}

#[derive(Deserialize)]
struct UpdateData {
    user: User,
    login: String,
    password: String,
}

async fn update_user(
    update_data: String,
    jwt_key: JwtKey,
    _access_token: Option<String>,
    refresh_token: Option<String>,
    db_client: DbClient,
) -> Result<impl warp::Reply, warp::Rejection> {
    let update_data: UpdateData = match serde_json::from_str(&update_data) {
        Ok(u) => u,
        Err(_) => return Ok(generate_res(StatusCode::BAD_REQUEST, None)),
    };
    if let Err(_) =
        user::verify_password(&db_client, &update_data.login, &update_data.password).await
    {
        return Ok(Response::builder()
            .status(StatusCode::BAD_REQUEST)
            .body("wrong password".to_string()));
    }

    match refresh_token {
        Some(token) => match expire_refresh_token(&db_client, &jwt_key, &token).await {
            Ok(user) => {
                // update user
                if let Err(e) = user::update(&db_client, &update_data.user, user.id).await {
                    return Ok(Response::builder()
                        .status(StatusCode::BAD_REQUEST)
                        .body(e.to_string()));
                }
                // update cookies
                let user = UserData {
                    id: user.id,
                    login: update_data.user.login,
                    public_login: update_data.user.public_login,
                    first_name: update_data.user.first_name,
                    second_name: update_data.user.second_name,
                };
                let (a_t, r_t) = get_jwt_with_new_data(jwt_key, user);
                let (c1, c2) = get_jwt_cookies(a_t, r_t, None);
                return Ok(Response::builder()
                    .status(StatusCode::OK)
                    .header(SET_COOKIE, c1)
                    .header(SET_COOKIE, c2)
                    .body("updated".to_string()));
            }
            Err(_) => {
                return Ok(generate_res(StatusCode::UNPROCESSABLE_ENTITY, None));
            }
        },
        None => {
            return Ok(generate_res(StatusCode::UNAUTHORIZED, None));
        }
    }
}

#[derive(Deserialize)]
struct DeleteData {
    password: String,
}
pub async fn delete_user(
    delete_data: String,
    jwt_key: JwtKey,
    _access_token: Option<String>,
    refresh_token: Option<String>,
    db_client: DbClient,
) -> Result<impl warp::Reply, warp::Rejection> {
    let delete_data: DeleteData = match serde_json::from_str(&delete_data) {
        Ok(d) => d,
        Err(_) => return Ok(generate_res(StatusCode::BAD_REQUEST, None)),
    };
    if refresh_token.is_none() {
        return Ok(generate_res(StatusCode::UNAUTHORIZED, None));
    }
    let refresh_token = refresh_token.unwrap();

    match verify_refresh_token(&db_client, &jwt_key, &refresh_token).await {
        Ok(user) => match verify_password(&db_client, &user.login, &delete_data.password).await {
            Ok(_) => {
                // expire token
                let _ = jwt::create(&db_client, &refresh_token).await;
                // set cookies
                let (c_1, c_2) =
                    get_jwt_cookies("deleted".to_string(), "deleted".to_string(), None);
                match user::delete(&db_client, user.id).await {
                    Ok(_) => {
                        return Ok(Response::builder()
                            .status(StatusCode::OK)
                            .header(SET_COOKIE, c_1)
                            .header(SET_COOKIE, c_2)
                            .body("deleted".to_string()))
                    }
                    Err(_) => return Ok(generate_res(StatusCode::INTERNAL_SERVER_ERROR, None)),
                }
            }
            Err(_) => {
                return Ok(generate_res(
                    StatusCode::BAD_REQUEST,
                    Some("wrong password"),
                ))
            }
        },
        Err(_) => return Ok(generate_res(StatusCode::UNAUTHORIZED, None)),
    }
}
