import requests

# Тест 1: SubType "10"
payload1 = {
    'ByCheckin': False,
    'DurationMin': 1,
    'SubType': '10',
    'CurrentPage': 1,
    'ItemsPerPage': 30
}

r1 = requests.post('https://back.magput.ru/backend/Search/SearchPrograms', json=payload1)
data1 = r1.json()
print(f"SubType '10': count={data1.get('count')}, программ на странице={len(data1.get('programs', []))}")

# Тест 2: SubType "11"
payload2 = {
    'ByCheckin': False,
    'DurationMin': 1,
    'SubType': '11',
    'CurrentPage': 1,
    'ItemsPerPage': 30
}

r2 = requests.post('https://back.magput.ru/backend/Search/SearchPrograms', json=payload2)
data2 = r2.json()
print(f"SubType '11': count={data2.get('count')}, программ на странице={len(data2.get('programs', []))}")

# Тест 3: Без SubType
payload3 = {
    'ByCheckin': False,
    'DurationMin': 1,
    'CurrentPage': 1,
    'ItemsPerPage': 30
}

r3 = requests.post('https://back.magput.ru/backend/Search/SearchPrograms', json=payload3)
data3 = r3.json()
print(f"Без SubType: count={data3.get('count')}, программ на странице={len(data3.get('programs', []))}")
