mod error;
mod di;
mod services;
mod window;
mod local_server;

use di::AppModule;
use window::DesktopApp;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Prevent decimal parsing errors in system libraries (Requirement #2)
    std::env::set_var("LC_NUMERIC", "C");

    // Initialize async task schedulers
    let runtime = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()?;
    let runtime_handle = runtime.handle().clone();

    // Spawn the gRPC local server on a background thread inside the desktop app
    let addr: std::net::SocketAddr = "[::1]:50051".parse()?;
    runtime_handle.spawn(async move {
        let _ = local_server::run_local_server(addr).await;
    });

    // Build the compile-time DI container
    let container = AppModule::builder().build();

    // Hand over control to Tao Window Context loop
    let app = DesktopApp::new(container, runtime_handle);
    app.run()?;

    Ok(())
}
