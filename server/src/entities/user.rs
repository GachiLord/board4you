use crate::libs::auth::UserData;
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use serde::{Deserialize, Serialize};
use std::{
    fmt::{self, Display},
    sync::Arc,
};
use tokio_postgres::Client;

// user-related structs
pub enum ValidationError {
    TooShort,
    TooLong,
    AlreadyExist,
    Unexpected,
}

impl Display for ValidationError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        let output = match self {
            ValidationError::TooShort => "too short",
            ValidationError::TooLong => "too long",
            ValidationError::AlreadyExist => "already exist",
            ValidationError::Unexpected => "unexpected error",
        };

        write!(f, "{output}")
    }
}

#[derive(Debug, Deserialize, Serialize, Clone, Default)]
pub struct User {
    pub login: String,
    pub password: String,
    pub public_login: String,
    pub first_name: String,
    pub second_name: String,
}

#[derive(Debug, Default)]
pub struct UserInfo {
    pub public_login: String,
    pub first_name: String,
    pub second_name: String,
}

// functions
pub async fn validate(client: &Arc<Client>, user: &User) -> Result<(), ValidationError> {
    if user.login.len() < 8 || user.password.len() < 8 {
        return Err(ValidationError::TooShort);
    }
    if user.login.len() > 36
        || user.password.len() > 36
        || user.public_login.len() > 36
        || user.first_name.len() > 36
        || user.second_name.len() > 36
    {
        return Err(ValidationError::TooLong);
    }
    // check if logins in use
    let user_count = client
        .query_one(
            "SELECT COUNT(*) FROM users WHERE login = ($1) OR public_login = ($2)",
            &[&user.login, &user.public_login],
        )
        .await;

    match user_count {
        Ok(row) => {
            if row.get::<&str, i64>("count") > 0 {
                return Err(ValidationError::AlreadyExist);
            }
        }
        Err(_) => return Err(ValidationError::Unexpected),
    }

    Ok(())
}

pub async fn create(client: &Arc<Client>, user: &User) -> Result<(), ValidationError> {
    // check if fields are valid
    validate(client, user).await?;
    // create user
    // hash password
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password = argon2
        .hash_password(user.password.as_bytes(), &salt)
        .expect("failed to hash password")
        .to_string();
    // insert to db
    client.execute(
        "INSERT INTO users(login, password, public_login, first_name, second_name) VALUES($1,$2,$3,$4,$5)",
        &[&user.login, &password, &user.public_login, &user.first_name, &user.second_name]
    ).await.expect("cannot create user");

    Ok(())
}

pub async fn read(client: &Arc<Client>, owner_id: i32) -> Option<UserInfo> {
    match client
        .query_one(
            "SELECT (public_login, first_name, second_name) WHERE id = ($1)",
            &[&owner_id],
        )
        .await
    {
        Ok(row) => {
            return Some(UserInfo {
                public_login: row.get("public_login"),
                first_name: row.get("first_name"),
                second_name: row.get("second_name"),
            })
        }
        Err(_) => return None,
    }
}

pub async fn verify_password(
    client: &Arc<Client>,
    login: &String,
    password: &String,
) -> Result<UserData, ()> {
    let argon2 = Argon2::default();
    let err = Err(());
    let user = client
        .query_one("SELECT * FROM users WHERE login = $1", &[&login])
        .await;
    // return err if user not found
    if user.is_err() {
        return err;
    }
    let user = user.unwrap();
    let hash: String = user.get("password");
    let parsed_hash = PasswordHash::new(&hash);
    // check if paresed_hash is ok
    if parsed_hash.is_err() {
        return err;
    }
    // verify hash
    let verify_result = argon2.verify_password(password.as_bytes(), &parsed_hash.unwrap());
    if verify_result.is_ok() {
        return Ok(UserData {
            id: user.get("id"),
            login: user.get("login"),
            public_login: user.get("public_login"),
            first_name: user.get("first_name"),
            second_name: user.get("second_name"),
        });
    }
    err
}
