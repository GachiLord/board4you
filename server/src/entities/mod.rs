use serde::{Deserialize, Serialize};

pub mod board;
pub mod edit;
pub mod folder;
pub mod jwt;
pub mod user;

pub const PAGE_ELEMENTS_COUNT: i64 = 10;

#[derive(Debug, Serialize, Deserialize)]
pub struct Paginated<T> {
    pub content: T,
    pub current_page: i64,
    pub max_page: i64,
}

pub struct PageQueryParams {
    max_page: i64,
    limit: i64,
    offset: i64,
}

pub fn get_page_query_params(elemnts_count: i64, page: i64) -> PageQueryParams {
    let max_page = elemnts_count / PAGE_ELEMENTS_COUNT + 1;

    PageQueryParams {
        max_page,
        limit: page * PAGE_ELEMENTS_COUNT,
        offset: (page - 1) * PAGE_ELEMENTS_COUNT,
    }
}
