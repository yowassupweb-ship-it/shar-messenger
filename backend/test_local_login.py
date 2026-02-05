import requests
import json

url = "http://127.0.0.1:8000/api/auth/login"
data = {
    "username": "admin",
    "password": "vstraveltourmsk1995yearVS!"
}

print("Отправка запроса на вход...")
print(f"URL: {url}")
print(f"Data: {json.dumps(data, ensure_ascii=False)}")

try:
    response = requests.post(url, json=data)
    print(f"\nСтатус: {response.status_code}")
    print(f"Ответ: {response.text}")
    
    if response.ok:
        print("\n✅ Вход успешен!")
        print(json.dumps(response.json(), indent=2, ensure_ascii=False))
    else:
        print("\n❌ Ошибка входа!")
        
except Exception as e:
    print(f"\n❌ Исключение: {e}")
