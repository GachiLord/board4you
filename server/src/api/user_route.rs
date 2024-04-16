use axum::{
    body::Body,
    http::{header, Response, StatusCode},
    response::IntoResponse,
    routing::post,
    Router,
};

use super::common::{generate_res, UserDataFromJWT};
use crate::AppState;

pub fn router() -> Router<AppState> {
    Router::new().route("/private", post(read_user_private))
}

async fn read_user_private(UserDataFromJWT(user): UserDataFromJWT) -> impl IntoResponse {
    if let Some(user) = user {
        let body = serde_json::to_string(&user).unwrap();
        return Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, "application/json")
            .body(Body::from(body))
            .unwrap();
    }
    return generate_res(StatusCode::UNAUTHORIZED, None);
}
