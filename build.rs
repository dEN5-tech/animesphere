fn main() -> Result<(), Box<dyn std::error::Error>> {
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows") {
        println!("cargo:rustc-link-search=native=bin\\mpv-sdk");
        println!("cargo:rerun-if-changed=bin\\mpv-sdk");
    }

    // Set path to local protoc binary if present
    let protoc_path = std::env::current_dir()?.join("bin").join("protoc").join("bin").join("protoc.exe");
    if protoc_path.exists() {
        std::env::set_var("PROTOC", protoc_path);
    }

    tonic_build::configure()
        .compile_protos(&["proto/anime.proto"], &["proto"])?;
    Ok(())
}
