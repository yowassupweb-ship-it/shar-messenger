"""Тестирование различных вариантов API Magput"""
import requests
import json

# Пробуем разные варианты URL
urls = [
    "https://magput.ru/Api/Public/Programs/Get",
    "https://magput.ru/api/public/programs/get",
    "https://magput.ru/api/public/programs",
    "https://magput.ru/api/programs/get",
    "https://magput.ru/api/programs",
]

payload = {
    "ByCheckin": False,
    "ByRange": False,
    "Checkin": None,
    "CityName": "-1",
    "CityType": "-1",
    "Count": 0,
    "CountOnly": False,
    "CurrentPage": 1,
    "DurationMax": 20,
    "DurationMin": 2,
    "ExcludeTopics": [],
    "FilterDates": False,
    "GroupByTopics": False,
    "GuideName": None,
    "ItemsPerPage": 30,
    "LastIdDigits": [],
    "OnlyHits": False,
    "OnlyNew": False,
    "OptType": -1,
    "PlacesMinLimit": 0,
    "PriceMax": None,
    "PriceMin": None,
    "ProgramIds": [],
    "ProgramTypes": [],
    "ProgramTypesAndLogic": True,
    "Range": 0,
    "SortByDate": True,
    "StartCityName": None,
    "SubType": "11",
    "TopicIds": [],
    "Type": -1,
    "WithNotActual": False
}

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'ru-RU,ru;q=0.9',
    'Content-Type': 'application/json',
    'Origin': 'https://magput.ru',
    'Referer': 'https://magput.ru/programs'
}

for url in urls:
    print(f"\nТестирование: {url}")
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        print(f"  Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"  SUCCESS! Получено программ: {data.get('count', 'N/A')}")
            print(f"  Ключи: {list(data.keys())}")
            break
        else:
            print(f"  Текст ошибки: {response.text[:200]}")
    except Exception as e:
        print(f"  Ошибка: {str(e)}")
