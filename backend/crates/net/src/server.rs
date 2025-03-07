use axum::{http, Router};
use crate::router::*;
use crate::profile::*;
use turtle_database::basic_db::{SafeDatabase, InnerDatabase};
use tower_http::cors::{Any, CorsLayer};

pub async fn build_server() {
    let shared_state = InnerDatabase::new("../../").unwrap();
    let shared_state2 = Clone::clone(&shared_state);
    let components = collect_components();


    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([
            http::Method::GET,
            http::Method::POST,
            http::Method::PUT,
            http::Method::DELETE,
            http::Method::OPTIONS
        ])
        .allow_headers(Any)
        .allow_credentials(false);




    // Use just one type parameter
    let mut app = main_router(components, shared_state);

    let app = app.layer(cors);



    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}



fn collect_components() ->  Vec<(String,Router<InnerDatabase>)> {
    let router_profile_get = get_router_builder("/api/profile".to_string(),get_profile_by_address::<InnerDatabase>);
    let router_profile_post = post_router_builder("/api/profile".to_string(),profile_write::<InnerDatabase>);



    vec![router_profile_get,router_profile_post]


}