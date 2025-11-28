"""Тестирование парсера цен"""
from parser.tour_parser import TourParser

# URL с турами
url = 'https://vs-travel.ru/podbor-tura/?TopFilter_vidTura=bus&TopFilter_dlitelnost=1-1&TopFilter_tota=1&TopFilter_russia=1'
parser = TourParser(base_url=url)

# Парсим туры
parser.login()
tours = parser.fetch_tours()

print(f'Получено туров: {len(tours)}')
print()
for tour in tours[:10]:
    print(f"ID: {tour['id']}")
    print(f"Name: {tour['name'][:60]}...")
    print(f"Price: {tour['price']}")
    print(f"OldPrice: {tour.get('oldPrice')}")
    print('-' * 50)
