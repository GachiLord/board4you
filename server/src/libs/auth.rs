use super::state::DbClient;
use crate::entities::jwt::{create, exists};
use jwt_simple::prelude::*;
use jwt_simple::{algorithms::HS256Key, claims::Claims, reexports::coarsetime::Duration};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use warp::http::header::{HeaderMap, HeaderValue, SET_COOKIE};
use warp::reply::Response;
use warp::Reply;

// struct
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct UserData {
    pub id: i32,
    pub login: String,
    pub public_login: String,
    pub first_name: String,
    pub second_name: String,
}

// funs

pub fn set_jwt_token_response(
    reply: impl Reply,
    access_token: String,
    refresh_token: String,
) -> Response {
    // set cookies
    let mut cookies = HeaderMap::new();
    cookies.append(
        SET_COOKIE,
        HeaderValue::from_str(&get_access_token_cookie(access_token, None)).unwrap(),
    );
    cookies.append(
        SET_COOKIE,
        HeaderValue::from_str(&get_refresh_token_cookie(refresh_token, None)).unwrap(),
    );
    let mut response = reply.into_response();
    let headers = response.headers_mut();
    headers.extend(cookies);
    // send cookies
    return response;
}

pub fn get_access_token_cookie(value: String, max_age: Option<i32>) -> String {
    format!(
        "access_token={value}; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age={}",
        max_age.unwrap_or(15 * 60)
    )
}

pub fn get_refresh_token_cookie(value: String, max_age: Option<i32>) -> String {
    format!(
        "refresh_token={value}; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age={}",
        max_age.unwrap_or(60 * 60 * 24 * 30)
    )
}

pub fn get_jwt_tokens(jwt_key: Arc<HS256Key>, data: UserData) -> (String, String) {
    let (access_claims, refresh_claims) = get_claims(data);
    get_tokens(&jwt_key, access_claims, refresh_claims)
}

pub async fn get_jwt_tokens_from_refresh(
    client: &DbClient,
    jwt_key: Arc<HS256Key>,
    refresh_token: &str,
) -> Result<(String, String, UserData), ()> {
    if let Ok(user_data) = verify_refresh_token(client, &jwt_key, &refresh_token).await {
        // expire this token
        let _ = create(client, refresh_token).await;
        // generate new ones
        let (a_t, r_t) = get_jwt_tokens(jwt_key, user_data.clone());
        return Ok((a_t, r_t, user_data));
    }
    Err(())
}

pub fn get_jwt_with_new_data(jwt_key: Arc<HS256Key>, new_data: UserData) -> (String, String) {
    // generate new tokenes
    get_jwt_tokens(jwt_key, new_data)
}

pub async fn expire_refresh_token(
    db_client: &DbClient,
    jwt_key: &Arc<HS256Key>,
    jwt_token: &str,
) -> Result<UserData, ()> {
    if let Ok(data) = verify_refresh_token(db_client, jwt_key, jwt_token).await {
        // expire token
        if let Err(_) = create(db_client, jwt_token).await {
            return Err(());
        }
        return Ok(data);
    }
    return Err(());
}

pub fn get_jwt_cookies(
    access_token: String,
    refresh_token: String,
    max_age: Option<i32>,
) -> (String, String) {
    (
        get_access_token_cookie(access_token, max_age),
        get_refresh_token_cookie(refresh_token, max_age),
    )
}

// helpers

pub fn verify_access_token(jwt_key: Arc<HS256Key>, jwt_token: &str) -> Result<UserData, ()> {
    let mut options = VerificationOptions::default();
    options.max_validity = Some(Duration::from_mins(15));

    match jwt_key.verify_token::<UserData>(jwt_token, Some(options)) {
        Ok(claims) => Ok(claims.custom),
        Err(_) => Err(()),
    }
}

pub async fn verify_refresh_token(
    db_client: &DbClient,
    jwt_key: &Arc<HS256Key>,
    jwt_token: &str,
) -> Result<UserData, ()> {
    let mut options = VerificationOptions::default();
    options.max_validity = Some(Duration::from_days(30));

    match jwt_key.verify_token::<UserData>(jwt_token, Some(options)) {
        Ok(claims) => {
            if !exists(db_client, jwt_token).await {
                return Ok(claims.custom);
            }
            return Err(());
        }
        Err(_) => return Err(()),
    }
}

fn get_claims(data: UserData) -> (JWTClaims<UserData>, JWTClaims<UserData>) {
    return (
        Claims::with_custom_claims(data.clone(), Duration::from_mins(15)),
        Claims::with_custom_claims(data, Duration::from_days(30)),
    );
}

fn get_tokens(
    jwt_key: &Arc<HS256Key>,
    access_claims: JWTClaims<UserData>,
    refresh_claims: JWTClaims<UserData>,
) -> (String, String) {
    (
        jwt_key
            .authenticate(access_claims)
            .expect("failed to create token"),
        jwt_key
            .authenticate(refresh_claims)
            .expect("failed to create token"),
    )
}
