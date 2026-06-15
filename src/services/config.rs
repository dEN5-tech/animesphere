use std::fs::File;
use std::io::{Read, Write};
use std::path::PathBuf;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AppConfig {
    pub proxy_url: String,
    pub search_provider: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            proxy_url: "http://127.0.0.1:2080".to_string(),
            search_provider: "animevost".to_string(),
        }
    }
}

pub fn get_config_dir() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        if let Ok(appdata) = std::env::var("APPDATA") {
            return PathBuf::from(appdata).join("animesphere");
        }
    }
    
    #[cfg(target_os = "macos")]
    {
        if let Ok(home) = std::env::var("HOME") {
            return PathBuf::from(home).join("Library").join("Application Support").join("animesphere");
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        if let Ok(xdg) = std::env::var("XDG_CONFIG_HOME") {
            return PathBuf::from(xdg).join("animesphere");
        } else if let Ok(home) = std::env::var("HOME") {
            return PathBuf::from(home).join(".config").join("animesphere");
        }
    }
    
    PathBuf::from(".")
}

pub fn get_config_path() -> PathBuf {
    get_config_dir().join("config.json")
}

pub fn get_database_path() -> PathBuf {
    get_config_dir().join("database.json")
}

pub fn get_episodes_path() -> PathBuf {
    get_config_dir().join("episodes.json")
}

pub fn ensure_config_dir() {
    let dir = get_config_dir();
    if !dir.exists() {
        let _ = std::fs::create_dir_all(&dir);
    }
}

pub fn load_config() -> AppConfig {
    ensure_config_dir();
    let path = get_config_path();
    if path.exists() {
        if let Ok(mut file) = File::open(&path) {
            let mut content = String::new();
            if file.read_to_string(&mut content).is_ok() {
                if let Ok(config) = serde_json::from_str::<AppConfig>(&content) {
                    return config;
                }
            }
        }
    }
    
    let default_config = AppConfig::default();
    let _ = save_config(&default_config);
    default_config
}

pub fn save_config(config: &AppConfig) -> Result<(), String> {
    ensure_config_dir();
    let content = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    let mut file = File::create(get_config_path()).map_err(|e| e.to_string())?;
    file.write_all(content.as_bytes()).map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct HistoryTitle {
    pub id: i32,
    pub title: String,
    pub description: String,
    pub cover_image: String,
}

pub fn load_history() -> Vec<HistoryTitle> {
    ensure_config_dir();
    let path = get_database_path();
    if path.exists() {
        if let Ok(mut file) = File::open(&path) {
            let mut content = String::new();
            if file.read_to_string(&mut content).is_ok() {
                if let Ok(data) = serde_json::from_str::<Vec<HistoryTitle>>(&content) {
                    return data;
                }
            }
        }
    }
    
    let initial_history = vec![
        HistoryTitle {
            id: 2938,
            title: "Власть книжного червя: Приёмная дочь лорда".to_string(),
            description: "Ascendance of a Bookworm: Part III".to_string(),
            cover_image: "http://media.animetop.info/img/2147423374.jpg".to_string(),
        }
    ];
    let _ = save_history(&initial_history);
    initial_history
}

pub fn save_history(history: &Vec<HistoryTitle>) -> Result<(), String> {
    ensure_config_dir();
    let content = serde_json::to_string_pretty(history).map_err(|e| e.to_string())?;
    let mut file = File::create(get_database_path()).map_err(|e| e.to_string())?;
    file.write_all(content.as_bytes()).map_err(|e| e.to_string())?;
    Ok(())
}

