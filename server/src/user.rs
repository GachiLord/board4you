use tokio_postgres::Client;

pub struct User{
    login: String, 
    password: String, 
    public_login: String, 
    first_name: String, 
    second_name: String
}

pub enum ValidationError{
    TooShort,
    TooLong,
    AlreadyExist
}

impl User{
    pub async fn new(
        client: Client,
        login: String, 
        password: String, 
        public_login: String, 
        first_name: String, 
        second_name: String
    ) -> Result<User, ValidationError>
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

        Ok(User{
            login,
            password,
            public_login,
            first_name,
            second_name
        })
    }
}