fn main() -> Result<(), Box<dyn std::error::Error>> {
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows") {
        println!("cargo:rustc-link-search=native=bin\\mpv-sdk");
        println!("cargo:rerun-if-changed=bin\\mpv-sdk");
    }

    tonic_build::configure()
        .compile_protos(&["proto/anime.proto"], &["proto"])?;
    Ok(())
}
