fn resolve_remote_url() -> String {
    let _ = dotenvy::dotenv();

    std::env::var("REMOTE_WEB_URL")
        .or_else(|_| std::env::var("TAURI_REMOTE_WEB_URL"))
        .unwrap_or_else(|_| "https://vokrug-sveta.shar-os.ru".to_string())
}

#[tauri::command]
fn get_remote_url() -> String {
    resolve_remote_url()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_remote_url])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
