use serde::{Serialize, Deserialize};
use serde_json::json;
use warp::{Filter, reply::{WithStatus, Json, with_status, json}};
use crate::{libs::{state::{DbClient, JwtKey}, auth::JwtExpired}, with_db_client, entities::user::{User, self}};
use warp::http::{StatusCode, Response};

use super::common::{as_string, CONTENT_LENGTH_LIMIT, ReplyWithPayload, Reply, UserDataFromJwt, with_user_data};

pub fn user_filter(client: DbClient, jwt_key: JwtKey, expired_jwt_tokens: JwtExpired<'_>) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone + '_{
    let base_route = warp::path("user");
    
    let create = base_route
        .and(warp::post())
        .and(as_string(CONTENT_LENGTH_LIMIT))
        .and(with_db_client(client.clone()))
        .and_then(create_user);
    let read = base_route
        .and(warp::get())
        .and(as_string(CONTENT_LENGTH_LIMIT))
        .and(with_db_client(client))
        .and_then(read_user);
    let read_private = base_route
        .and(warp::path("private"))
        .and(warp::post())
        .and(with_user_data(jwt_key, expired_jwt_tokens))
        .and_then(read_user_private);

        read_private.or(read).or(create)
}

async fn create_user(user: String, client: DbClient) -> Result<WithStatus<Json>, warp::Rejection>{
    let user: User = match serde_json::from_str(&user) {
        Ok(u) => u,
        Err(e) => return Ok(with_status(json( &ReplyWithPayload{
            message: "cannot parse body".to_string(),
            payload: e.to_string()
        } ), StatusCode::BAD_REQUEST))
    };

    match user::create(&client, &user).await {
        Ok(_) => {
            return Ok(with_status(
                json( &Reply{
                    message: "user created".to_string()
                } ),
                StatusCode::OK,
            ))
        }
        Err(e) => {
            return Ok(with_status(
                json( &Reply{
                    message: e.to_string()
                } ),
                StatusCode::BAD_REQUEST,
            ))
        }
    }
}

#[derive(Serialize, Deserialize)]
struct UserInfo {
    public_login: String
}

async fn read_user_private(retrived_user_data: UserDataFromJwt) -> Result<impl warp::Reply, warp::Rejection>{
    if let Some(user) = retrived_user_data.user_data {
        let body = serde_json::to_string(&user).unwrap();
        let res = match retrived_user_data.new_jwt_cookie_values {
            Some((c1, c2)) => {
                Response::builder()
                        .header("Set-Cookie", c1)
                        .header("Set-Cookie", c2)
                        .status(StatusCode::OK)
                        .body(body)
            }
            None => {
                Response::builder()
                        .status(StatusCode::OK)
                        .body(body)
            }
        };
        return Ok(res)
    }
    return Ok(Response::builder().status(StatusCode::UNAUTHORIZED).body("auth to get this info".to_string()))
}

async fn read_user(user: String, client: DbClient) -> Result<impl warp::Reply, warp::Rejection>{
    let user_info: UserInfo = match serde_json::from_str(&user) {
        Ok(u) => u,
        Err(e) => return Ok(
            Response::builder().status(StatusCode::BAD_REQUEST).body(e.to_string())
        )
    };

    let user = client.query_one(
        "SELECT (public_login, first_name, second_name) FROM users WHERE public_login=($1)", 
        &[&user_info.public_login]
    ).await;

    match user {
        Ok(row) => {
            let body = json!({
                "public_login": row.get::<&str, String>("public_login"),
                "first_name": row.get::<&str, String>("first_name"),
                "second_name": row.get::<&str, String>("second_name")
            }).to_string();

            return Ok(
                Response::builder()
                    .status(StatusCode::OK)
                    .body(body)   
            )
        },
        Err(_) => {
            return Ok(
                Response::builder().status(StatusCode::NOT_FOUND).body("user not found".to_string())
            )
        }
    }
}