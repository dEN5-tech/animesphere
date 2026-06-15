fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("cargo:rustc-link-search=native=c:\\projects\\animesphere\\bin\\mpv-sdk");

    tonic_build::configure()
        .compile_protos(&["proto/anime.proto"], &["proto"])?;
    Ok(())
}
