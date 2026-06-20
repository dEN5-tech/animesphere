use std::sync::Mutex;

static LOG_BUFFER: Mutex<Vec<String>> = Mutex::new(Vec::new());

pub fn add_log(msg: String) {
    if let Ok(mut buffer) = LOG_BUFFER.lock() {
        if buffer.len() >= 1000 {
            buffer.remove(0);
        }
        buffer.push(msg.clone());

        // Append to logs.txt in the same directory as the executable
        let log_file_path = if let Ok(exe_path) = std::env::current_exe() {
            if let Some(parent) = exe_path.parent() {
                parent.join("logs.txt")
            } else {
                std::path::PathBuf::from("logs.txt")
            }
        } else {
            std::path::PathBuf::from("logs.txt")
        };

        if let Ok(mut file) = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_file_path)
        {
            use std::io::Write;
            let _ = writeln!(file, "{}", msg);
        }
    }
}

pub fn get_logs() -> Vec<String> {
    if let Ok(buffer) = LOG_BUFFER.lock() {
        buffer.clone()
    } else {
        Vec::new()
    }
}

pub fn clear_logs() {
    if let Ok(mut buffer) = LOG_BUFFER.lock() {
        buffer.clear();

        let log_file_path = if let Ok(exe_path) = std::env::current_exe() {
            if let Some(parent) = exe_path.parent() {
                parent.join("logs.txt")
            } else {
                std::path::PathBuf::from("logs.txt")
            }
        } else {
            std::path::PathBuf::from("logs.txt")
        };

        let _ = std::fs::write(&log_file_path, "");
    }
}

#[cfg(target_os = "windows")]
pub fn init_log_redirection() {
    use std::os::windows::io::{FromRawHandle, RawHandle};
    use std::fs::File;
    use std::io::{BufRead, BufReader, Write};
    use std::thread;

    const STD_OUTPUT_HANDLE: u32 = 4294967285; // -11
    const STD_ERROR_HANDLE: u32 = 4294967284;  // -12

    #[link(name = "kernel32")]
    extern "system" {
        fn CreatePipe(
            hReadPipe: *mut *mut std::ffi::c_void,
            hWritePipe: *mut *mut std::ffi::c_void,
            lpPipeAttributes: *mut std::ffi::c_void,
            nSize: u32,
        ) -> i32;
        fn SetStdHandle(nStdHandle: u32, hHandle: *mut std::ffi::c_void) -> i32;
        fn GetStdHandle(nStdHandle: u32) -> *mut std::ffi::c_void;
        fn DuplicateHandle(
            hSourceProcessHandle: *mut std::ffi::c_void,
            hSourceHandle: *mut std::ffi::c_void,
            hTargetProcessHandle: *mut std::ffi::c_void,
            lpTargetHandle: *mut *mut std::ffi::c_void,
            dwDesiredAccess: u32,
            bInheritHandle: i32,
            dwOptions: u32,
        ) -> i32;
        fn GetCurrentProcess() -> *mut std::ffi::c_void;
    }

    const DUPLICATE_SAME_ACCESS: u32 = 2;

    unsafe {
        let mut read_pipe: *mut std::ffi::c_void = std::ptr::null_mut();
        let mut write_pipe: *mut std::ffi::c_void = std::ptr::null_mut();

        if CreatePipe(&mut read_pipe, &mut write_pipe, std::ptr::null_mut(), 0) != 0 {
            let current_process = GetCurrentProcess();
            
            // Duplicate original stdout and stderr
            let orig_stdout = GetStdHandle(STD_OUTPUT_HANDLE);
            let mut dup_stdout: *mut std::ffi::c_void = std::ptr::null_mut();
            if !orig_stdout.is_null() {
                DuplicateHandle(
                    current_process,
                    orig_stdout,
                    current_process,
                    &mut dup_stdout,
                    0,
                    0,
                    DUPLICATE_SAME_ACCESS,
                );
            }

            let orig_stderr = GetStdHandle(STD_ERROR_HANDLE);
            let mut dup_stderr: *mut std::ffi::c_void = std::ptr::null_mut();
            if !orig_stderr.is_null() {
                DuplicateHandle(
                    current_process,
                    orig_stderr,
                    current_process,
                    &mut dup_stderr,
                    0,
                    0,
                    DUPLICATE_SAME_ACCESS,
                );
            }

            // Redirect stdout and stderr to write end of the pipe
            SetStdHandle(STD_OUTPUT_HANDLE, write_pipe);
            SetStdHandle(STD_ERROR_HANDLE, write_pipe);

            let read_pipe_raw = read_pipe as usize;
            let dup_stdout_raw = dup_stdout as usize;
            let dup_stderr_raw = dup_stderr as usize;

            thread::spawn(move || {
                let read_pipe = read_pipe_raw as *mut std::ffi::c_void;
                let dup_stdout = dup_stdout_raw as *mut std::ffi::c_void;
                let dup_stderr = dup_stderr_raw as *mut std::ffi::c_void;

                let file = File::from_raw_handle(read_pipe as RawHandle);
                let reader = BufReader::new(file);

                let mut out_stream = if !dup_stdout.is_null() {
                    Some(File::from_raw_handle(dup_stdout as RawHandle))
                } else {
                    None
                };

                let mut err_stream = if !dup_stderr.is_null() {
                    Some(File::from_raw_handle(dup_stderr as RawHandle))
                } else {
                    None
                };

                for line in reader.lines() {
                    if let Ok(l) = line {
                        // Store the log in the in-memory buffer
                        add_log(l.clone());

                        // Forward to original stdout/stderr (if present)
                        if let Some(ref mut out) = out_stream {
                            let _ = writeln!(out, "{}", l);
                            let _ = out.flush();
                        }
                        if let Some(ref mut err) = err_stream {
                            let _ = writeln!(err, "{}", l);
                            let _ = err.flush();
                        }
                    }
                }
            });
        }
    }
}

#[cfg(not(target_os = "windows"))]
pub fn init_log_redirection() {
    // Non-Windows environments do not need terminal redirection
}
