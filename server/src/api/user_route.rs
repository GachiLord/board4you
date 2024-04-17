use axum::{http::StatusCode, response::IntoResponse, routing::post, Router};

use super::common::{generate_res, generate_res_json, UserDataFromJWT};
use crate::AppState;

pub fn router() -> Router<AppState> {
    Router::new().route("/private", post(read_user_private))
}

async fn read_user_private(UserDataFromJWT(user): UserDataFromJWT) -> impl IntoResponse {
    if let Some(user) = user {
        return generate_res_json(user);
    }
    return generate_res(StatusCode::UNAUTHORIZED, None);
}
