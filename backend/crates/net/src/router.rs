use axum::{
    routing::get,
    Router,
};

fn main_router(components: Vec<(String,fn() -> Router)>) -> Router{
    let mut app = Router::new();

    let result = components.into_iter().for_each(|(path, router)| {
     app = app.nest(&path, router());
    });

    Router::new()
}


