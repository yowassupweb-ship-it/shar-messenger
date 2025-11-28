import requests

headers = {
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'ru,en-US;q=0.9,en;q=0.8',
    'content-type': 'application/json',
    'origin': 'https://magput.ru',
    'referer': 'https://magput.ru/',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
}

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
    "DurationMin": 1,
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
    "SubType": "11",  # Изменено на многодневные
    "Topics": [],
    "WithDiscounts": False
}

r = requests.post('https://back.magput.ru/backend/Search/SearchPrograms', 
                  json=payload, 
                  headers=headers)

print(f"Status: {r.status_code}")
data = r.json()
print(f"Count: {data.get('count')}")
print(f"Programs: {len(data.get('programs', []))}")

if data.get('programs'):
    first = data['programs'][0]
    print(f"\nПервый тур:")
    print(f"  ID: {first.get('id')}")
    print(f"  Name: {first.get('content', {}).get('name')}")
    print(f"  Days: {first.get('content', {}).get('duration', {}).get('days')}")
