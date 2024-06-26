use crate::libs::state::DbClient;
use tokio_postgres::Error;

pub async fn exists(client: &DbClient<'_>, token: &str) -> bool {
    let key_count = client
        .query_one(
            "SELECT COUNT(*) FROM expired_jwts WHERE jwt_data=($1)",
            &[&token],
        )
        .await;

    match key_count {
        Ok(row) => {
            let count = row.get::<&str, i64>("count");
            return count != 0;
        }
        Err(_) => return false,
    }
}

pub async fn create(client: &DbClient<'_>, token: &str) -> Result<u64, Error> {
    client
        .execute("INSERT INTO expired_jwts(jwt_data) VALUES($1)", &[&token])
        .await
}
