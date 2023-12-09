use tokio_postgres::Error;

use crate::libs::state::DbClient;

pub async fn exists(client: &DbClient, token: &str) -> bool{
    let key_count = client.query_one(
        "SELECT COUNT(id) FROM expired_jwts WHERE jwt_data=($1)",
        &[&token]
    ).await;

    match key_count {
        Ok(row) => {
            return row.get::<&str, i64>("count") == 0
        }
        Err(_) => {
            false
        }
    }
}

pub async fn create(client: &DbClient, token: &str) -> Result<u64, Error> {
    client.execute(
        "INSERT INTO expired_jwts(jwt_data) VALUES($1)",
        &[&token]
    ).await
}
