use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use diesel::prelude::*;
use diesel::r2d2::{self, ConnectionManager};
use std::sync::OnceLock;
use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};

pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!("migrations");

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(default)]
pub struct AppConfig {
    pub proxy_url: String,
    pub search_provider: String,
    pub discord_presence_enabled: bool,
    pub discord_client_id: String,
    pub shikimori_client_id: String,
    pub shikimori_client_secret: String,
    pub shikimori_access_token: String,
    pub shikimori_refresh_token: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            // On Android there is no local proxy — default to empty (direct connection)
            #[cfg(target_os = "android")]
            proxy_url: String::new(),
            #[cfg(not(target_os = "android"))]
            proxy_url: "http://127.0.0.1:2080".to_string(),
            search_provider: "animevost".to_string(),
            discord_presence_enabled: false,
            discord_client_id: String::new(),
            shikimori_client_id: "bwmocDw1B9Rq7Wp-DEMzYn1umJHm1FC651k0UomysEY".to_string(),
            shikimori_client_secret: "EKkI8rKmmywnvWKB4psgA-8JKF0ultUKIYfimytqwoA".to_string(),
            shikimori_access_token: String::new(),
            shikimori_refresh_token: String::new(),
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct HistoryTitle {
    pub id: i32,
    pub title: String,
    pub description: String,
    pub cover_image: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ResumeState {
    pub episode_id: i32,
    pub time_pos: f64,
    pub duration: f64,
    pub episode_title: String,
    pub anime_title: String,
    pub cover_image: String,
    pub description: String,
}

// Diesel Database Structs
#[derive(Queryable, Insertable, AsChangeset)]
#[diesel(table_name = crate::schema::app_configs)]
struct DbAppConfig {
    id: i32,
    proxy_url: String,
    search_provider: String,
    discord_presence_enabled: bool,
    discord_client_id: String,
    shikimori_client_id: String,
    shikimori_client_secret: String,
    shikimori_access_token: String,
    shikimori_refresh_token: String,
}

#[derive(Queryable)]
#[diesel(table_name = crate::schema::history_titles)]
struct DbHistoryTitle {
    #[allow(dead_code)]
    id: i32,
    title_id: i32,
    title: String,
    description: String,
    cover_image: String,
}

#[derive(Insertable)]
#[diesel(table_name = crate::schema::history_titles)]
struct InsertHistoryTitle {
    title_id: i32,
    title: String,
    description: String,
    cover_image: String,
}

#[derive(Queryable, Insertable, AsChangeset)]
#[diesel(table_name = crate::schema::resume_states)]
struct DbResumeState {
    episode_id: i32,
    time_pos: f64,
    duration: f64,
    episode_title: String,
    anime_title: String,
    cover_image: String,
    description: String,
    updated_at: i64,
}

pub type DbPool = r2d2::Pool<ConnectionManager<SqliteConnection>>;

static DB_POOL: OnceLock<DbPool> = OnceLock::new();

pub fn get_db_pool() -> &'static DbPool {
    DB_POOL.get_or_init(|| {
        ensure_config_dir();
        let db_path = get_database_path();
        let db_str = db_path.to_string_lossy();
        let manager = ConnectionManager::<SqliteConnection>::new(db_str.as_ref());
        let pool = r2d2::Pool::builder()
            .max_size(5)
            .build(manager)
            .expect("Failed to create Diesel DB connection pool");

        // Run migrations
        let mut conn = pool.get().expect("Failed to get DB connection from pool");
        conn.run_pending_migrations(MIGRATIONS).expect("Failed to run pending migrations");

        // One-time legacy JSON migration
        migrate_json_to_db(&mut conn);

        pool
    })
}

#[cfg(target_os = "android")]
fn get_android_files_dir() -> Option<PathBuf> {
    let ctx = ndk_context::android_context();
    let vm_ptr = ctx.vm();
    if vm_ptr.is_null() {
        println!("[Android Config] JVM pointer is null!");
        return None;
    }
    let vm = match unsafe { jni::JavaVM::from_raw(vm_ptr as *mut _) } {
        Ok(vm) => vm,
        Err(e) => {
            println!("[Android Config] Failed to get JavaVM from raw: {:?}", e);
            return None;
        }
    };
    let mut env = match vm.attach_current_thread() {
        Ok(env) => env,
        Err(e) => {
            println!("[Android Config] Failed to attach current thread: {:?}", e);
            return None;
        }
    };
    let ctx_ptr = ctx.context();
    if ctx_ptr.is_null() {
        println!("[Android Config] Context pointer is null!");
        return None;
    }
    let context_obj = unsafe { jni::objects::JObject::from_raw(ctx_ptr as *mut _) };
    
    // Call Context.getFilesDir()
    let files_dir_val = match env.call_method(
        &context_obj,
        "getFilesDir",
        "()Ljava/io/File;",
        &[],
    ) {
        Ok(val) => val,
        Err(e) => {
            println!("[Android Config] Failed to call getFilesDir: {:?}", e);
            return None;
        }
    };
    let files_dir_obj = match files_dir_val.l() {
        Ok(obj) => obj,
        Err(e) => {
            println!("[Android Config] Failed to get JObject from JValue for filesDir: {:?}", e);
            return None;
        }
    };
    if files_dir_obj.is_null() {
        println!("[Android Config] filesDir JObject is null!");
        return None;
    }
        
    // Call File.getAbsolutePath()
    let path_val = match env.call_method(
        &files_dir_obj,
        "getAbsolutePath",
        "()Ljava/lang/String;",
        &[],
    ) {
        Ok(val) => val,
        Err(e) => {
            println!("[Android Config] Failed to call getAbsolutePath: {:?}", e);
            return None;
        }
    };
    let path_jstr = match path_val.l() {
        Ok(obj) => obj,
        Err(e) => {
            println!("[Android Config] Failed to get JObject from JValue for path: {:?}", e);
            return None;
        }
    };
    if path_jstr.is_null() {
        println!("[Android Config] path JString is null!");
        return None;
    }
        
    let path_jstring = jni::objects::JString::from(path_jstr);
    let path_str: String = match env.get_string(&path_jstring) {
        Ok(java_str) => java_str.into(),
        Err(e) => {
            println!("[Android Config] Failed to get Rust string from JString: {:?}", e);
            return None;
        }
    };
    println!("[Android Config] Successfully retrieved Android files dir: {}", path_str);
    Some(PathBuf::from(path_str))
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

    #[cfg(target_os = "android")]
    {
        return get_android_files_dir().unwrap_or_else(|| {
            let fallback = PathBuf::from("/data/data/com.example.animesphere/files");
            println!("[Android Config] Falling back to: {}", fallback.display());
            fallback
        });
    }
    
    #[cfg(not(target_os = "android"))]
    {
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
}

pub fn get_config_path() -> PathBuf {
    get_config_dir().join("config.json")
}

pub fn get_database_path() -> PathBuf {
    get_config_dir().join("animesphere.db")
}

pub fn get_episodes_path() -> PathBuf {
    get_config_dir().join("episodes.json")
}

pub fn get_resume_path() -> PathBuf {
    get_config_dir().join("resume.json")
}

pub fn ensure_config_dir() {
    let dir = get_config_dir();
    if !dir.exists() {
        let _ = std::fs::create_dir_all(&dir);
    }
}

fn migrate_json_to_db(conn: &mut SqliteConnection) {
    // 1. Config migration
    let config_json = get_config_path();
    if config_json.exists() {
        if let Ok(content) = std::fs::read_to_string(&config_json) {
            if let Ok(config) = serde_json::from_str::<AppConfig>(&content) {
                let db_cfg = DbAppConfig {
                    id: 1,
                    proxy_url: config.proxy_url,
                    search_provider: config.search_provider,
                    discord_presence_enabled: config.discord_presence_enabled,
                    discord_client_id: config.discord_client_id,
                    shikimori_client_id: config.shikimori_client_id,
                    shikimori_client_secret: config.shikimori_client_secret,
                    shikimori_access_token: config.shikimori_access_token,
                    shikimori_refresh_token: config.shikimori_refresh_token,
                };
                let _ = diesel::insert_into(crate::schema::app_configs::table)
                    .values(&db_cfg)
                    .on_conflict(crate::schema::app_configs::id)
                    .do_update()
                    .set(&db_cfg)
                    .execute(conn);
            }
        }
        let _ = std::fs::rename(&config_json, get_config_dir().join("config.json.bak"));
    }

    // 2. History migration
    let database_json = get_config_dir().join("database.json");
    if database_json.exists() {
        if let Ok(content) = std::fs::read_to_string(&database_json) {
            if let Ok(history) = serde_json::from_str::<Vec<HistoryTitle>>(&content) {
                let _ = diesel::delete(crate::schema::history_titles::table).execute(conn);
                for item in history {
                    let insert_item = InsertHistoryTitle {
                        title_id: item.id,
                        title: item.title,
                        description: item.description,
                        cover_image: item.cover_image,
                    };
                    let _ = diesel::insert_into(crate::schema::history_titles::table)
                        .values(&insert_item)
                        .execute(conn);
                }
            }
        }
        let _ = std::fs::rename(&database_json, get_config_dir().join("database.json.bak"));
    }

    // 3. Resume migration
    let resume_json = get_resume_path();
    if resume_json.exists() {
        if let Ok(content) = std::fs::read_to_string(&resume_json) {
            if let Ok(resume) = serde_json::from_str::<ResumeState>(&content) {
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs() as i64;
                let db_resume = DbResumeState {
                    episode_id: resume.episode_id,
                    time_pos: resume.time_pos,
                    duration: resume.duration,
                    episode_title: resume.episode_title,
                    anime_title: resume.anime_title,
                    cover_image: resume.cover_image,
                    description: resume.description,
                    updated_at: now,
                };
                let _ = diesel::insert_into(crate::schema::resume_states::table)
                    .values(&db_resume)
                    .on_conflict(crate::schema::resume_states::episode_id)
                    .do_update()
                    .set(&db_resume)
                    .execute(conn);
            }
        }
        let _ = std::fs::rename(&resume_json, get_config_dir().join("resume.json.bak"));
    }

    // 4. Episodes migration
    #[derive(Deserialize)]
    struct TempDbAnime {
        id: i32,
        title: String,
        description: String,
        stream_url: String,
        cover_image: String,
    }

    #[derive(Insertable)]
    #[diesel(table_name = crate::schema::episodes)]
    struct DbEpisode {
        id: i32,
        title: String,
        description: String,
        stream_url: String,
        cover_image: String,
    }

    let episodes_json = get_episodes_path();
    if episodes_json.exists() {
        if let Ok(content) = std::fs::read_to_string(&episodes_json) {
            if let Ok(episodes_list) = serde_json::from_str::<Vec<TempDbAnime>>(&content) {
                let _ = diesel::delete(crate::schema::episodes::table).execute(conn);
                for item in episodes_list {
                    let db_ep = DbEpisode {
                        id: item.id,
                        title: item.title,
                        description: item.description,
                        stream_url: item.stream_url,
                        cover_image: item.cover_image,
                    };
                    let _ = diesel::insert_into(crate::schema::episodes::table)
                        .values(&db_ep)
                        .execute(conn);
                }
            }
        }
        let _ = std::fs::rename(&episodes_json, get_config_dir().join("episodes.json.bak"));
    }
}

pub fn load_config() -> AppConfig {
    let pool = get_db_pool();
    let mut conn = pool.get().expect("Failed to get DB connection");
    
    use crate::schema::app_configs::dsl::*;
    
    let db_config_opt = app_configs
        .filter(id.eq(1))
        .first::<DbAppConfig>(&mut conn)
        .optional()
        .unwrap_or(None);

    let mut config = match db_config_opt {
        Some(db_cfg) => AppConfig {
            proxy_url: db_cfg.proxy_url,
            search_provider: db_cfg.search_provider,
            discord_presence_enabled: db_cfg.discord_presence_enabled,
            discord_client_id: db_cfg.discord_client_id,
            shikimori_client_id: db_cfg.shikimori_client_id,
            shikimori_client_secret: db_cfg.shikimori_client_secret,
            shikimori_access_token: db_cfg.shikimori_access_token,
            shikimori_refresh_token: db_cfg.shikimori_refresh_token,
        },
        None => {
            let default_cfg = AppConfig::default();
            let db_cfg = DbAppConfig {
                id: 1,
                proxy_url: default_cfg.proxy_url.clone(),
                search_provider: default_cfg.search_provider.clone(),
                discord_presence_enabled: default_cfg.discord_presence_enabled,
                discord_client_id: default_cfg.discord_client_id.clone(),
                shikimori_client_id: default_cfg.shikimori_client_id.clone(),
                shikimori_client_secret: default_cfg.shikimori_client_secret.clone(),
                shikimori_access_token: default_cfg.shikimori_access_token.clone(),
                shikimori_refresh_token: default_cfg.shikimori_refresh_token.clone(),
            };
            let _ = diesel::insert_into(app_configs)
                .values(&db_cfg)
                .execute(&mut conn);
            default_cfg
        }
    };

    // Auto-seed default credentials if empty
    let mut needs_save = false;
    if config.shikimori_client_id.trim().is_empty() {
        config.shikimori_client_id = "bwmocDw1B9Rq7Wp-DEMzYn1umJHm1FC651k0UomysEY".to_string();
        needs_save = true;
    }
    if config.shikimori_client_secret.trim().is_empty() {
        config.shikimori_client_secret = "EKkI8rKmmywnvWKB4psgA-8JKF0ultUKIYfimytqwoA".to_string();
        needs_save = true;
    }

    // On Android: clear desktop proxy default so searches work without a local proxy
    #[cfg(target_os = "android")]
    if config.proxy_url == "http://127.0.0.1:2080" {
        println!("[Config] Android detected stale desktop proxy URL — clearing proxy_url");
        config.proxy_url = String::new();
        needs_save = true;
    }

    if needs_save {
        let _ = save_config(&config);
    }
    
    config

}

pub fn save_config(config: &AppConfig) -> Result<(), String> {
    let pool = get_db_pool();
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let db_cfg = DbAppConfig {
        id: 1,
        proxy_url: config.proxy_url.clone(),
        search_provider: config.search_provider.clone(),
        discord_presence_enabled: config.discord_presence_enabled,
        discord_client_id: config.discord_client_id.clone(),
        shikimori_client_id: config.shikimori_client_id.clone(),
        shikimori_client_secret: config.shikimori_client_secret.clone(),
        shikimori_access_token: config.shikimori_access_token.clone(),
        shikimori_refresh_token: config.shikimori_refresh_token.clone(),
    };

    diesel::insert_into(crate::schema::app_configs::table)
        .values(&db_cfg)
        .on_conflict(crate::schema::app_configs::id)
        .do_update()
        .set(&db_cfg)
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(())
}

pub fn load_history() -> Vec<HistoryTitle> {
    let pool = get_db_pool();
    let mut conn = pool.get().expect("Failed to get DB connection");

    use crate::schema::history_titles::dsl::*;

    let db_history = history_titles
        .order(id.asc())
        .load::<DbHistoryTitle>(&mut conn)
        .unwrap_or_default();

    if !db_history.is_empty() {
        return db_history
            .into_iter()
            .map(|db| HistoryTitle {
                id: db.title_id,
                title: db.title,
                description: db.description,
                cover_image: db.cover_image,
            })
            .collect();
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
    let pool = get_db_pool();
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    conn.transaction::<_, diesel::result::Error, _>(|c| {
        diesel::delete(crate::schema::history_titles::table).execute(c)?;
        for item in history {
            let insert_item = InsertHistoryTitle {
                title_id: item.id,
                title: item.title.clone(),
                description: item.description.clone(),
                cover_image: item.cover_image.clone(),
            };
            diesel::insert_into(crate::schema::history_titles::table)
                .values(&insert_item)
                .execute(c)?;
        }
        Ok(())
    }).map_err(|e| e.to_string())?;

    Ok(())
}

pub fn load_resume() -> Option<ResumeState> {
    let pool = get_db_pool();
    let mut conn = pool.get().ok()?;

    use crate::schema::resume_states::dsl::*;

    let db_state = resume_states
        .order(updated_at.desc())
        .first::<DbResumeState>(&mut conn)
        .optional()
        .ok()??;

    Some(ResumeState {
        episode_id: db_state.episode_id,
        time_pos: db_state.time_pos,
        duration: db_state.duration,
        episode_title: db_state.episode_title,
        anime_title: db_state.anime_title,
        cover_image: db_state.cover_image,
        description: db_state.description,
    })
}

pub fn save_resume(state: &ResumeState) -> Result<(), String> {
    let pool = get_db_pool();
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

    let db_state = DbResumeState {
        episode_id: state.episode_id,
        time_pos: state.time_pos,
        duration: state.duration,
        episode_title: state.episode_title.clone(),
        anime_title: state.anime_title.clone(),
        cover_image: state.cover_image.clone(),
        description: state.description.clone(),
        updated_at: now,
    };

    diesel::insert_into(crate::schema::resume_states::table)
        .values(&db_state)
        .on_conflict(crate::schema::resume_states::episode_id)
        .do_update()
        .set(&db_state)
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(())
}

pub fn clear_resume() -> Result<(), String> {
    let pool = get_db_pool();
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    diesel::delete(crate::schema::resume_states::table)
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[derive(Queryable, Insertable, AsChangeset)]
#[diesel(table_name = crate::schema::image_cache)]
struct DbCachedImage {
    url: String,
    content_type: String,
    bytes: Vec<u8>,
    cached_at: i64,
}

pub fn get_cached_image(target_url: &str) -> Option<(String, Vec<u8>)> {
    let pool = get_db_pool();
    let mut conn = pool.get().ok()?;

    use crate::schema::image_cache::dsl::*;

    let cached = image_cache
        .filter(url.eq(target_url))
        .first::<DbCachedImage>(&mut conn)
        .optional()
        .ok()??;

    Some((cached.content_type, cached.bytes))
}

pub fn save_cached_image(target_url: &str, target_content_type: &str, target_bytes: &[u8]) -> Result<(), String> {
    let pool = get_db_pool();
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

    let db_cached = DbCachedImage {
        url: target_url.to_string(),
        content_type: target_content_type.to_string(),
        bytes: target_bytes.to_vec(),
        cached_at: now,
    };

    diesel::insert_into(crate::schema::image_cache::table)
        .values(&db_cached)
        .on_conflict(crate::schema::image_cache::url)
        .do_update()
        .set(&db_cached)
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(())
}
