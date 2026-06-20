CREATE TABLE app_configs (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    proxy_url TEXT NOT NULL,
    search_provider TEXT NOT NULL,
    discord_presence_enabled BOOLEAN NOT NULL,
    discord_client_id TEXT NOT NULL,
    shikimori_client_id TEXT NOT NULL,
    shikimori_client_secret TEXT NOT NULL,
    shikimori_access_token TEXT NOT NULL,
    shikimori_refresh_token TEXT NOT NULL
);

CREATE TABLE history_titles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    cover_image TEXT NOT NULL
);

CREATE TABLE resume_states (
    episode_id INTEGER PRIMARY KEY,
    time_pos DOUBLE PRECISION NOT NULL,
    duration DOUBLE PRECISION NOT NULL,
    episode_title TEXT NOT NULL,
    anime_title TEXT NOT NULL,
    cover_image TEXT NOT NULL,
    description TEXT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE TABLE episodes (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    stream_url TEXT NOT NULL,
    cover_image TEXT NOT NULL
);

CREATE TABLE image_cache (
    url TEXT PRIMARY KEY,
    content_type TEXT NOT NULL,
    bytes BLOB NOT NULL,
    cached_at BIGINT NOT NULL
);
