use std::env;


#[tokio::main]
async fn main() {
    let public_path = env::args().collect::<Vec<String>>()[1].clone();

    let public = warp::fs::dir(public_path);
    let routes = public;

    warp::serve(routes).run(([127, 0, 0, 1], 3000)).await;
}
