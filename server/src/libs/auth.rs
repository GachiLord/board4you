use super::state::DbClient;
use crate::entities::jwt::{create, exists};
use crate::JWT_SECRET_KEY;
use axum::http::{header::COOKIE, request::Parts, HeaderValue};
use cookie::{time, Cookie, SameSite};
use jwt_simple::claims::Claims;
use jwt_simple::prelude::*;
use jwt_simple::Error;
use serde::{Deserialize, Serialize};
use std::error;
use std::fmt::Display;

// consts

pub const DELETED_COOKIE_VALUE: &'static str = "deleted";
pub const ACCESS_TOKEN_COOKIE_NAME: &'static str = "access_token";
pub const REFRESH_TOKEN_COOKIE_NAME: &'static str = "refresh_token";
const ACCESS_TOKEN_MAX_AGE: i64 = 15 * 60;
const REFRESH_TOKEN_MAX_AGE: i64 = 60 * 60 * 24 * 30;

// struct
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct UserData {
    pub id: i32,
    pub login: String,
    pub public_login: String,
    pub first_name: String,
    pub second_name: String,
}

#[derive(Debug)]
pub enum VerifyError {
    Invalid(Error),
    Expired,
}

impl Display for VerifyError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Invalid(e) => f.write_str(&format!("invalid token because {e}")),
            Self::Expired => f.write_str("token is already expired"),
        }
    }
}

impl error::Error for VerifyError {}

// funs

pub fn retrive_jwt_cookies<'a>(
    cookie_header: &'a HeaderValue,
) -> (Option<Cookie<'a>>, Option<Cookie<'a>>) {
    let mut access_token = None;
    let mut refresh_token = None;
    let cookies = match cookie_header.to_str() {
        Ok(s) => s,
        Err(_) => return (None, None),
    };
    for c in Cookie::split_parse(cookies).into_iter() {
        if let Ok(c) = c {
            match c.name() {
                ACCESS_TOKEN_COOKIE_NAME => access_token = Some(c),
                REFRESH_TOKEN_COOKIE_NAME => refresh_token = Some(c),
                _ => return (None, None),
            }
        }
    }
    return (access_token, refresh_token);
}

pub async fn retrive_user_data_from_parts(
    client: &DbClient<'_>,
    parts: &mut Parts,
) -> Option<UserData> {
    // parse cookie header
    let cookie = match parts.headers.get(COOKIE) {
        Some(c) => c,
        None => return None,
    };
    let (access_token, refresh_token) = retrive_jwt_cookies(cookie);

    if let Some(s) = access_token {
        if let Ok(user_data) = verify_access_token(s.value()) {
            return Some(user_data);
        }
    }
    if let Some(s) = refresh_token {
        if let Ok(user_data) = verify_refresh_token(client, s.value()).await {
            return Some(user_data);
        }
    }
    // if there is no valid tokens return nothing
    None
}

/// Accepts access_token and returns cookie value with it.
/// If max_age is None, sets it to ACCESS_TOKEN_MAX_AGE
pub fn get_access_token_cookie(
    value: &str,
    max_age: Option<cookie::time::Duration>,
) -> HeaderValue {
    HeaderValue::from_str(
        &Cookie::build((ACCESS_TOKEN_COOKIE_NAME, value))
            .path("/")
            .secure(true)
            .http_only(true)
            .same_site(SameSite::Strict)
            .max_age(max_age.unwrap_or(time::Duration::seconds(ACCESS_TOKEN_MAX_AGE)))
            .to_string(),
    )
    .unwrap()
}
/// Accepts refresh_token and returns cookie value with it
/// If max_age is None, sets it to REFRESH_TOKEN_MAX_AGE
pub fn get_refresh_token_cookie(
    value: &str,
    max_age: Option<cookie::time::Duration>,
) -> HeaderValue {
    HeaderValue::from_str(
        &Cookie::build((REFRESH_TOKEN_COOKIE_NAME, value))
            .path("/")
            .secure(true)
            .http_only(true)
            .same_site(SameSite::Strict)
            .max_age(max_age.unwrap_or(time::Duration::seconds(REFRESH_TOKEN_MAX_AGE)))
            .to_string(),
    )
    .unwrap()
}

/// Returns a tuple of jwt tokens(access_token, refresh_token) with provided UserData   
pub fn get_jwt_tokens(data: UserData) -> (String, String) {
    let (access_claims, refresh_claims) = get_claims(data);
    get_tokens(access_claims, refresh_claims)
}

/// Expires provided refresh_token, returns a tuple of jwt tokens and UserData(access_token, refresh_token, UserData)
/// if the token is valid
///
/// # Errors
///
/// This function will return an error if provided refresh_token is invalid
pub async fn get_jwt_tokens_from_refresh(
    client: &DbClient<'_>,
    refresh_token: &str,
) -> Result<(String, String, UserData), ()> {
    if let Ok(user_data) = verify_refresh_token(client, &refresh_token).await {
        // expire this token
        let _ = create(client, &refresh_token).await;
        // generate new ones
        let (a_t, r_t) = get_jwt_tokens(user_data.clone());
        return Ok((a_t, r_t, user_data));
    }
    Err(())
}

/// Expires provided refresh_token and returns UserData if it is valid
///
/// # Errors
///
/// This function will return an error if the token is invalid
pub async fn expire_refresh_token(
    db_client: &DbClient<'_>,
    jwt_token: &str,
) -> Result<UserData, anyhow::Error> {
    let data = verify_refresh_token(db_client, jwt_token).await?;
    // expire token
    create(db_client, jwt_token).await?;
    return Ok(data);
}

/// Returns cookies with jwt token values.
/// If max_age is None, sets ACCESS_TOKEN_MAX_AGE for access_token and REFRESH_TOKEN_MAX_AGE for refresh_token
pub fn get_jwt_cookies(
    access_token: &str,
    refresh_token: &str,
    max_age: Option<cookie::time::Duration>,
) -> (HeaderValue, HeaderValue) {
    (
        get_access_token_cookie(access_token, max_age),
        get_refresh_token_cookie(refresh_token, max_age),
    )
}

/// Returns cookies with jwt token values.
/// If max_age is None, sets ACCESS_TOKEN_MAX_AGE for access_token and REFRESH_TOKEN_MAX_AGE for refresh_token
pub fn get_jwt_cookies_from_user_data(
    user_data: UserData,
    max_age: Option<cookie::time::Duration>,
) -> (HeaderValue, HeaderValue) {
    let (a_t, r_t) = get_jwt_tokens(user_data);
    (
        get_access_token_cookie(&a_t, max_age),
        get_refresh_token_cookie(&r_t, max_age),
    )
}

// helpers

/// Returns UserData if the token is valid
///
/// # Errors
///
/// This function will return an error if the token is invalid
pub fn verify_access_token(jwt_token: &str) -> Result<UserData, VerifyError> {
    let mut options = VerificationOptions::default();
    options.max_validity = Some(Duration::from_mins(ACCESS_TOKEN_MAX_AGE as u64));

    match JWT_SECRET_KEY.verify_token::<UserData>(jwt_token, Some(options)) {
        Ok(claims) => Ok(claims.custom),
        Err(e) => Err(VerifyError::Invalid(e)),
    }
}

/// Returns UserData if the token is valid
///
/// # Errors
///
/// This function will return an error if token is invalid
pub async fn verify_refresh_token(
    db_client: &DbClient<'_>,
    jwt_token: &str,
) -> Result<UserData, VerifyError> {
    let mut options = VerificationOptions::default();
    options.max_validity = Some(Duration::from_days(REFRESH_TOKEN_MAX_AGE as u64));

    match JWT_SECRET_KEY.verify_token::<UserData>(jwt_token, Some(options)) {
        Ok(claims) => {
            if !exists(db_client, jwt_token).await {
                return Ok(claims.custom);
            }
            return Err(VerifyError::Expired);
        }
        Err(e) => return Err(VerifyError::Invalid(e)),
    }
}

/// Returns JWTClaims with provided user_data
fn get_claims(data: UserData) -> (JWTClaims<UserData>, JWTClaims<UserData>) {
    return (
        Claims::with_custom_claims(
            data.clone(),
            Duration::from_mins(ACCESS_TOKEN_MAX_AGE as u64),
        ),
        Claims::with_custom_claims(data, Duration::from_days(REFRESH_TOKEN_MAX_AGE as u64)),
    );
}

/// Returns jwt token values based on provided JWTClaims
///
/// # Panics
///
/// Panics if failed to authenticate the claims
fn get_tokens(
    access_claims: JWTClaims<UserData>,
    refresh_claims: JWTClaims<UserData>,
) -> (String, String) {
    (
        JWT_SECRET_KEY
            .authenticate(access_claims)
            .expect("failed to create token"),
        JWT_SECRET_KEY
            .authenticate(refresh_claims)
            .expect("failed to create token"),
    )
}
