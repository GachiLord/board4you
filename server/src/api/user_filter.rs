use warp::{Filter, reply::{WithStatus, Json, with_status, json}};
use crate::{libs::state::DbClient, with_db_client, entities::user::{User, self}};
use warp::http::StatusCode;

use super::common::{as_string, CONTENT_LENGTH_LIMIT, ReplyWithPayload, Reply};

pub fn user_filter(client: &DbClient) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone{
    let base_route = warp::path("user");
    
    let create = base_route
        .and(warp::post())
        .and(as_string(CONTENT_LENGTH_LIMIT))
        .and(with_db_client(client.clone()))
        .and_then(create_user);
    create
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