use std::sync::Arc;
use jwt_simple::prelude::*;
use jwt_simple::{claims::Claims, algorithms::HS256Key, reexports::coarsetime::Duration};
use serde::{Deserialize, Serialize};
use tokio::sync::{RwLock, RwLockWriteGuard};
use warp::reply::Response;
use warp::http::header::{HeaderMap, HeaderValue};
use warp::Reply;

// types
pub type JwtExpired<'a> = Arc<RwLock<HashSet<&'a str>>>;

#[derive(Serialize, Deserialize, Clone, Copy)]
pub struct UserData {
    pub user_id: i32,
}

// funs

pub fn set_jwt_token_response(reply: impl Reply, access_token: String, refresh_token: String) -> Response {
    // set cookies
    let mut cookies = HeaderMap::new();
    cookies.append("Set-Cookie", HeaderValue::from_str(&format!("access_token={access_token}")).unwrap());
    cookies.append("Set-Cookie", HeaderValue::from_str(&format!("refresh_token={refresh_token}")).unwrap());
    let mut response = reply.into_response();
    let headers = response.headers_mut();
    headers.extend(cookies);
    // send cookies
    return response
}

pub fn get_jwt_tokens(jwt_key: Arc<HS256Key>, data: UserData) -> (String, String) {
    let (access_claims, refresh_claims) = get_claims(data);
    get_tokens(&jwt_key, access_claims, refresh_claims)
}

pub async fn get_jwt_tokens_from_refresh<'a>(jwt_key: Arc<HS256Key>, refresh_token: &'a str, expired_jwt_tokens: JwtExpired<'a>) 
-> Result<(String, String, UserData), ()> 
{   let mut expired_jwt_tokens = expired_jwt_tokens.write().await;
    if let Ok(user_data) = verify_refresh_token(&jwt_key, refresh_token, &expired_jwt_tokens).await {
        // expire this token
        expired_jwt_tokens.insert(refresh_token);
        // generate new ones
        let (a_t, r_t) = get_jwt_tokens(jwt_key, user_data);
        return Ok( (a_t, r_t, user_data) )
    }
    Err(())
}

// helpers

pub fn verify_access_token(jwt_key: Arc<HS256Key>, jwt_token: &str) -> Result<UserData, ()> {
    match jwt_key.verify_token(jwt_token, None) {
        Ok(claims) => Ok(claims.custom),
        Err(_) => Err(())
    }
}

pub async fn verify_refresh_token(jwt_key: &Arc<HS256Key>, jwt_token: &str, expired_jwt_tokens: &RwLockWriteGuard<'_, HashSet<&str>>) -> Result<UserData, ()> {
    match jwt_key.verify_token(jwt_token, None) {
        Ok(claims) => {
            if !expired_jwt_tokens.contains(jwt_token){
                return Ok(claims.custom)
            }
            return Err(())
        },
        Err(_) => return Err(())
    }
}

fn get_claims(data: UserData) -> (JWTClaims<UserData>, JWTClaims<UserData>) {
    return ( 
        Claims::with_custom_claims(data.clone(), Duration::from_mins(60)),
        Claims::with_custom_claims(data, Duration::from_days(30))
    )
}

fn get_tokens(jwt_key: &Arc<HS256Key>, access_claims: JWTClaims<UserData>, refresh_claims: JWTClaims<UserData>) -> (String, String){
    (
        jwt_key.authenticate(access_claims).expect("failed to create token"),
        jwt_key.authenticate(refresh_claims).expect("failed to create token")
    )
}