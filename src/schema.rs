// @generated automatically by Diesel CLI.

diesel::table! {
    app_configs (id) {
        id -> Integer,
        proxy_url -> Text,
        search_provider -> Text,
        discord_presence_enabled -> Bool,
        discord_client_id -> Text,
        shikimori_client_id -> Text,
        shikimori_client_secret -> Text,
        shikimori_access_token -> Text,
        shikimori_refresh_token -> Text,
    }
}

diesel::table! {
    episodes (id) {
        id -> Integer,
        title -> Text,
        description -> Text,
        stream_url -> Text,
        cover_image -> Text,
    }
}

diesel::table! {
    history_titles (id) {
        id -> Integer,
        title_id -> Integer,
        title -> Text,
        description -> Text,
        cover_image -> Text,
    }
}

diesel::table! {
    image_cache (url) {
        url -> Text,
        content_type -> Text,
        bytes -> Binary,
        cached_at -> BigInt,
    }
}

diesel::table! {
    resume_states (episode_id) {
        episode_id -> Integer,
        time_pos -> Double,
        duration -> Double,
        episode_title -> Text,
        anime_title -> Text,
        cover_image -> Text,
        description -> Text,
        updated_at -> BigInt,
    }
}

diesel::allow_tables_to_appear_in_same_query!(
    app_configs,
    episodes,
    history_titles,
    image_cache,
    resume_states,
);
