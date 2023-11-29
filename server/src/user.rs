use std::sync::Arc;
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
    AlreadyExist
}

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
    login: &String, 
    password: &String, 
    public_login: &String, 
    first_name: &String, 
    second_name: &String
) -> Result<(), ValidationError>
{
    if login.len() < 8  || password.len() < 8 || public_login.len() < 8{
        return Err(ValidationError::TooShort)
    }
    if login.len() > 36  || password.len() > 36 || public_login.len() > 36 
        || first_name.len() > 36 || second_name.len() > 36{
        return Err(ValidationError::TooLong)
    }
    // check if logins in use
    let login_count = client.query_one("SELECT COUNT(id) FROM users WHERE login = '$1' OR public_login = '$2'", &[&login, &public_login]).await;
    
    match login_count {
        Ok(row) => {
            if row.get::<&str, u32>("count") > 0 {
                return Err(ValidationError::AlreadyExist)
            }
        },
        Err(_) => {
            return Err(ValidationError::AlreadyExist)
        }
    }

    Ok(())
}

pub async fn create(
    client: &Arc<Client>,
    user: User,
) -> Result<(), ValidationError>
{
    // check if fields are valid
    validate(client, &user.login, &user.password, &user.public_login, &user.first_name, &user.second_name).await?;
    // create user
    // hash password
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password = argon2.hash_password(user.password.as_bytes(), &salt).expect("failed to hash password").to_string();
    // insert to db
    let _ = client.execute(
        "INSERT INTO users(login, password, public_login, first_name, second_name) VALUES($1,$2,$3,$4,$5)",
        &[&user.login, &password, &user.public_login, &user.first_name, &user.second_name]
    ).await;

    Ok(())
}

pub async fn verify_password(client: &Arc<Client>, login: &String, password: &String) -> Result<(), ()>{
    let argon2 = Argon2::default();
    let err = Err(());
    let password_hash = client.query_one(
        "SELECT password FROM users WHERE password = $1",
        &[&login]
    ).await;
    // return err if user not found
    if password_hash.is_err(){
        return err
    }
    let hash: String = password_hash.unwrap().get("password");
    let parsed_hash = PasswordHash::new(&hash);
    // check if paresed_hash is ok
    if parsed_hash.is_err(){
        return err;
    }
    // verify hash
    let verify_result = argon2.verify_password(password.as_bytes(), &parsed_hash.unwrap());
    if verify_result.is_ok(){
        return Ok(())
    }
    err
}