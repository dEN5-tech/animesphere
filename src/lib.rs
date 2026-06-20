#[macro_export]
macro_rules! println {
    () => {{
        $crate::window::logs::add_log(String::new());
        std::println!();
    }};
    ($($arg:tt)*) => {{
        $crate::window::logs::add_log(format!($($arg)*));
        std::println!($($arg)*);
    }};
}

#[macro_export]
macro_rules! eprintln {
    () => {{
        $crate::window::logs::add_log(String::new());
        std::eprintln!();
    }};
    ($($arg:tt)*) => {{
        $crate::window::logs::add_log(format!("[ERROR] {}", format!($($arg)*)));
        std::eprintln!($($arg)*);
    }};
}

mod error;
mod di;
mod services;
mod window;
mod local_server;
pub mod schema;

use di::AppModule;
use window::DesktopApp;

fn run_app() {
    window::logs::init_log_redirection();

    let default_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        let msg = format!("PANIC occurred: {}", info);
        crate::window::logs::add_log(msg);
        default_hook(info);
    }));

    let runtime = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .expect("Failed to build Tokio runtime");
    let runtime_handle = runtime.handle().clone();

    let addr: std::net::SocketAddr = "127.0.0.1:50051".parse().expect("Invalid socket address");
    runtime_handle.spawn(async move {
        if let Err(e) = local_server::run_local_server(addr).await {
            println!("[gRPC Server Error] Failed to start local server on {}: {:?}", addr, e);
        }
    });

    let container = AppModule::builder().build();
    let app = DesktopApp::new(container, runtime_handle);
    let _ = app.run();
}

#[cfg(target_os = "android")]
fn start_app() {
    // Set up LC_NUMERIC to avoid decimal parsing issues
    std::env::set_var("LC_NUMERIC", "C");
    run_app();
}

#[cfg(target_os = "android")]
const _: () = {
    tao::android_binding!(com_example, animesphere, WryActivity, wry::android_setup, start_app);
    wry::android_binding!(com_example, animesphere);
};

/// Library entry point used by `gen/bin/desktop.rs` on non-mobile platforms.
pub fn main() {
    use std::io::Write;
    use std::net::TcpStream;

    // 1. Single-instance check for deep link forwarding
    let args: Vec<String> = std::env::args().collect();
    let target_url = args.iter().find(|arg| arg.starts_with("animesphere://"));

    if let Ok(mut stream) = TcpStream::connect("127.0.0.1:50052") {
        if let Some(url) = target_url {
            let _ = stream.write_all(url.as_bytes());
            let _ = stream.flush();
        }
        return;
    }

    // 2. Prevent decimal parsing errors in system libraries
    std::env::set_var("LC_NUMERIC", "C");

    // 3. Register custom protocol handler for deep linking
    #[cfg(target_os = "windows")]
    {
        if let Err(e) = register_custom_protocol() {
            eprintln!("[Registry] Failed to register custom protocol: {}", e);
        } else {
            println!("[Registry] Custom protocol 'animesphere://' successfully registered.");
        }
    }

    run_app();
}

#[cfg(target_os = "windows")]
fn register_custom_protocol() -> Result<(), Box<dyn std::error::Error>> {
    use winreg::enums::*;
    use winreg::RegKey;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let (key, _) = hkcu.create_subkey("Software\\Classes\\animesphere")?;
    key.set_value("", &"URL:animesphere Protocol")?;
    key.set_value("URL Protocol", &"")?;

    let current_exe = std::env::current_exe()?;
    let exe_path = current_exe.to_string_lossy().to_string();

    let (icon_key, _) = key.create_subkey("DefaultIcon")?;
    icon_key.set_value("", &format!("\"{}\",0", exe_path))?;

    let (cmd_key, _) = key.create_subkey("shell\\open\\command")?;
    cmd_key.set_value("", &format!("\"{}\" \"%1\"", exe_path))?;

    Ok(())
}
