import requests

r = requests.get('http://localhost:8000/api/products?merged=true')
products = r.json()
print(f'Total: {len(products)}')

dupes = [p for p in products if 'tour_001789' in p['id']]
for p in dupes:
    print(f"ID: {p['id']}, SourceId: {p.get('sourceId')}, SourceIds: {p.get('sourceIds')}")
