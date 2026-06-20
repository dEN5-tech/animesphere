pub mod proto {
    tonic::include_proto!("anime");
}

use std::sync::Arc;
use shaku::Component;
use tonic::transport::Channel;

use proto::anime_service_client::AnimeServiceClient;
use proto::{Empty, StreamRequest, StreamResponse, Anime};
use crate::error::AppError;
use super::AnimeService;

#[derive(Component)]
#[shaku(interface = AnimeService)]
pub struct AnimeServiceImpl {
    #[shaku(default = "http://127.0.0.1:50051".to_string())]
    endpoint: String,
}

#[async_trait::async_trait]
impl AnimeService for AnimeServiceImpl {
    async fn get_list(&self) -> Result<Vec<Anime>, AppError> {
        let channel = Channel::from_shared(self.endpoint.clone())
            .map_err(|e| AppError::Serialization(e.to_string()))?
            .connect()
            .await
            .map_err(|e| AppError::Network(Arc::new(e)))?;

        let mut client = AnimeServiceClient::new(channel);
        let response = client.get_anime_list(tonic::Request::new(Empty {})).await?;
        
        Ok(response.into_inner().animes)
    }

    async fn get_stream(&self, id: i32) -> Result<StreamResponse, AppError> {
        let channel = Channel::from_shared(self.endpoint.clone())
            .map_err(|e| AppError::Serialization(e.to_string()))?
            .connect()
            .await
            .map_err(|e| AppError::Network(Arc::new(e)))?;

        let mut client = AnimeServiceClient::new(channel);
        let request = tonic::Request::new(StreamRequest { anime_id: id });
        
        let response = client.get_anime_streams(request).await?;
        Ok(response.into_inner())
    }
}
