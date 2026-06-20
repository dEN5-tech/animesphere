#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    animesphere::main();
}
