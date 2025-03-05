mod get;
mod post;

use axum::Router;

pub fn batcher() -> Vec<(String, fn() -> Router)>{

    vec![]

}