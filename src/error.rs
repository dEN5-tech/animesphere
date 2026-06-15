use std::sync::Arc;

#[derive(thiserror::Error, Debug, Clone)]
pub enum AppError {
    #[error("OS Window initialization failure: {0}")]
    WindowCreation(String),

    #[error("Native Webview generation failure: {0}")]
    WebviewCreation(String),

    #[error("gRPC Connection/Transport failure: {0}")]
    Network(#[from] Arc<tonic::transport::Error>),

    #[error("gRPC Status failure: [{0}] {1}")]
    RpcStatus(String, String),

    #[error("MPV Media backend failure: {0}")]
    Mpv(String),

    #[error("Parsing or serialization failure: {0}")]
    Serialization(String),

    #[allow(dead_code)]
    #[error("Dependency injection lookup failed: {0}")]
    Dependency(String),
}

impl From<tonic::Status> for AppError {
    fn from(status: tonic::Status) -> Self {
        AppError::RpcStatus(status.code().to_string(), status.message().to_string())
    }
}
