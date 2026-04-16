use serde::Serialize;
use serde_json::Value;
use std::time::Duration;

fn resolve_backend_url() -> String {
    let _ = dotenvy::dotenv();

    std::env::var("BACKEND_URL")
        .or_else(|_| std::env::var("TAURI_BACKEND_URL"))
        .or_else(|_| std::env::var("REMOTE_WEB_URL"))
        .or_else(|_| std::env::var("TAURI_REMOTE_WEB_URL"))
        .unwrap_or_else(|_| "https://vokrug-sveta.shar-os.ru".to_string())
}

fn normalize_official_backend(url: &str) -> Option<String> {
    let parsed = reqwest::Url::parse(url).ok()?;

    let host = parsed.host_str()?;
    if host != "vokrug-sveta.shar-os.ru" {
        return None;
    }

    let scheme = parsed.scheme();
    if scheme != "https" && scheme != "http" {
        return None;
    }

    Some(format!("{}://{}", scheme, host))
}

fn backend_candidates() -> Vec<String> {
    let mut values = Vec::new();

    if let Some(v) = normalize_official_backend(&resolve_backend_url()) {
        values.push(v);
    }
    values.push("https://vokrug-sveta.shar-os.ru".to_string());
    values.push("http://vokrug-sveta.shar-os.ru".to_string());

    values.sort();
    values.dedup();
    values
}

#[derive(Serialize)]
struct LoginPayload {
    username: String,
    password: String,
}

#[tauri::command]
fn get_backend_url() -> String {
    resolve_backend_url()
}

#[tauri::command]
async fn backend_login(username: String, password: String) -> Result<Value, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(12))
        .build()
        .map_err(|e| format!("Не удалось создать HTTP клиент: {e}"))?;

    let payload = LoginPayload { username, password };
    let mut last_error: Option<String> = None;

    for base in backend_candidates() {
        let url = format!("{base}/api/auth/login");

        match client.post(&url).json(&payload).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    let mut data: Value = response
                        .json()
                        .await
                        .map_err(|e| format!("Некорректный JSON ответа: {e}"))?;

                    if let Some(obj) = data.as_object_mut() {
                        obj.insert("_backendUrlUsed".to_string(), Value::String(base));
                    }

                    return Ok(data);
                }

                if response.status().as_u16() == 401 || response.status().as_u16() == 403 {
                    return Err("Неверный логин или пароль".to_string());
                }

                let status = response.status();
                let body = response.text().await.unwrap_or_default();
                last_error = Some(format!("Сервер вернул {status}: {body}"));
            }
            Err(e) => {
                last_error = Some(format!("Ошибка соединения с {base}: {e}"));
            }
        }
    }

    Err(last_error.unwrap_or_else(|| "Нет соединения с сервером".to_string()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
    .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![get_backend_url, backend_login])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
