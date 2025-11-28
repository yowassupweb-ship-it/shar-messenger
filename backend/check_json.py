import json

with open('../magput-parser/magput.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
    
print(f"Count field: {data['count']}")
print(f"Programs in array: {len(data['programs'])}")
print(f"ItemsPerPage: {data.get('itemsPerPage', 'N/A')}")
print(f"CurrentPage: {data.get('currentPage', 'N/A')}")

if len(data['programs']) > 30:
    print(f"\n✅ В файле ВСЕ {len(data['programs'])} туров!")
else:
    print(f"\n❌ В файле только {len(data['programs'])} туров")
