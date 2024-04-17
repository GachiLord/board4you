use crate::libs::{auth::UserData, state::DbClient};
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use serde::{Deserialize, Serialize};
use std::fmt::{self, Display};
use tokio::sync::oneshot;

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

#[derive(Debug, Default, Serialize)]
pub struct UserInfo {
    pub public_login: String,
    pub first_name: String,
    pub second_name: String,
}

// functions
pub async fn validate(
    client: DbClient,
    user: &User,
    user_id: Option<i32>,
) -> Result<(), ValidationError> {
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
    let users = client
        .query(
            "SELECT id FROM users WHERE login = ($1) OR public_login = ($2)",
            &[&user.login, &user.public_login],
        )
        .await;

    match users {
        Ok(rows) => {
            if rows.len() > 1 {
                return Err(ValidationError::AlreadyExist);
            } else if rows.len() == 0 {
                return Ok(());
            }
            // check if user can be updated
            let row = &rows[0];
            match user_id {
                Some(id) => {
                    if row.get::<&str, i32>("id") == id {
                        return Ok(());
                    }
                    return Err(ValidationError::AlreadyExist);
                }
                None => return Err(ValidationError::AlreadyExist),
            }
        }
        Err(_) => return Err(ValidationError::Unexpected),
    }
}

pub async fn create(client: DbClient, user: &User) -> Result<(), ValidationError> {
    // check if fields are valid
    validate(client, user, None).await?;
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

pub async fn read(client: DbClient, owner_id: i32) -> Option<UserInfo> {
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

pub async fn read_by_public_login(
    client: DbClient,
    public_login: &str,
) -> Result<UserInfo, tokio_postgres::Error> {
    let row = client
        .query_one(
            "SELECT public_login, first_name, second_name FROM users WHERE public_login=($1)",
            &[&public_login],
        )
        .await?;
    Ok(UserInfo {
        public_login: row.get::<&str, String>("public_login"),
        first_name: row.get::<&str, String>("first_name"),
        second_name: row.get::<&str, String>("second_name"),
    })
}

pub async fn update(client: DbClient, user: &User, user_id: i32) -> Result<u64, ValidationError> {
    validate(client, &user, Some(user_id)).await?;
    // hash password
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password = argon2
        .hash_password(user.password.as_bytes(), &salt)
        .expect("failed to hash password")
        .to_string();

    match client
        .execute(
            "UPDATE users SET login = ($1), public_login = ($2), first_name = ($3), second_name = ($4), password = ($5) WHERE id = $6",
            &[
                &user.login,
                &user.public_login,
                &user.first_name,
                &user.second_name,
                &password,
                &user_id,
            ],
        )
        .await
    {
        Ok(r) => return Ok(r),
        Err(_) => Err(ValidationError::Unexpected),
    }
}

pub async fn delete(client: DbClient, user_id: i32) -> Result<u64, tokio_postgres::Error> {
    client
        .execute("DELETE FROM users WHERE id = ($1)", &[&user_id])
        .await
}

pub async fn verify_password(
    client: DbClient,
    login: &str,
    password: Box<str>,
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
    let hash: Box<str> = user.get("password");
    // verify hash in separate task to prevent blocking of async tasks
    let (tx, rx) = oneshot::channel();
    tokio::task::spawn_blocking(move || {
        let parsed_hash = match PasswordHash::new(&hash) {
            Ok(h) => h,
            Err(_) => {
                let _ = tx.send(false);
                return;
            }
        };
        let verify_result = argon2.verify_password(password.as_bytes(), &parsed_hash);
        let _ = tx.send(verify_result.is_ok());
    });
    if rx.await.unwrap() {
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
