use std::{sync::Arc, fmt::{self, Display}};
use serde::{Deserialize, Serialize};
use tokio_postgres::Client;
use argon2::{
    password_hash::{
        rand_core::OsRng,
        PasswordHash, PasswordHasher, PasswordVerifier, SaltString
    },
    Argon2
};

// user-related structs
pub enum ValidationError{
    TooShort,
    TooLong,
    AlreadyExist,
    Unexpected
}

impl Display for ValidationError{
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result{
        let output = match self {
            ValidationError::TooShort => "too short",
            ValidationError::TooLong => "too long",
            ValidationError::AlreadyExist => "already exist",
            ValidationError::Unexpected => "unexpeced error"
        };

        write!(f, "{output}")
    }
}

#[derive(Debug, Deserialize, Serialize, Clone, Default)]
pub struct User{
    login: String, 
    password: String, 
    public_login: String, 
    first_name: String, 
    second_name: String
}

// functions
pub async fn validate(
    client: &Arc<Client>,
    user: &User
) -> Result<(), ValidationError>
{
    if user.login.len() < 8  || user.password.len() < 8 {
        return Err(ValidationError::TooShort)
    }
    if user.login.len() > 36  || user.password.len() > 36 || user.public_login.len() > 36 
        || user.first_name.len() > 36 || user.second_name.len() > 36{
        return Err(ValidationError::TooLong)
    }
    // check if logins in use
    let user_count = client.query_one("SELECT COUNT(id) FROM users WHERE login = ($1) OR public_login = ($2)", &[&user.login, &user.public_login]).await;
    
    match user_count {
        Ok(row) => {        
            if row.get::<&str, i64>("count") > 0 {
                return Err(ValidationError::AlreadyExist)
            }
        },
        Err(_) => {
            return Err(ValidationError::Unexpected)
        }
    }

    Ok(())
}

pub async fn create(
    client: &Arc<Client>,
    user: &User,
) -> Result<(), ValidationError>
{
    // check if fields are valid
    validate(client, user).await?;
    // create user
    // hash password
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password = argon2.hash_password(user.password.as_bytes(), &salt).expect("failed to hash password").to_string();
    // insert to db
    client.execute(
        "INSERT INTO users(login, password, public_login, first_name, second_name) VALUES($1,$2,$3,$4,$5)",
        &[&user.login, &password, &user.public_login, &user.first_name, &user.second_name]
    ).await.expect("cannot create user");

    Ok(())
}

pub async fn verify_password(client: &Arc<Client>, login: &String, password: &String) -> Result<i32, ()>{
    let argon2 = Argon2::default();
    let err = Err(());
    let user = client.query_one(
        "SELECT * FROM users WHERE login = $1",
        &[&login]
    ).await;
    // return err if user not found
    if user.is_err(){
        return err
    }
    let user = user.unwrap();
    let hash: String = user.get("password");
    let parsed_hash = PasswordHash::new(&hash);
    // check if paresed_hash is ok
    if parsed_hash.is_err(){
        return err;
    }
    // verify hash
    let verify_result = argon2.verify_password(password.as_bytes(), &parsed_hash.unwrap());
    if verify_result.is_ok(){
        return Ok(user.get("id"))
    }
    err
}