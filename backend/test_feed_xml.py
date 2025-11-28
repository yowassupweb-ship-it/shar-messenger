"""Тест генерации XML фида с oldPrice"""
import sys
sys.path.insert(0, '.')

from feed_generator import generate_yml_feed
import xml.etree.ElementTree as ET

# Тестовые данные с oldPrice
test_products = [
    {
        'id': 'tour_001099',
        'name': 'Хлеб, икра, павлиний хвост',
        'price': '5040',
        'oldPrice': '6300',
        'url': 'https://vs-travel.ru/tour?id=1099',
        'image': 'https://vs-travel.ru/images/tour1.jpg',
        'categoryName': 'Экскурсии'
    },
    {
        'id': 'tour_001100',
        'name': 'Как работает корова?',
        'price': '3432',
        'oldPrice': '4290',
        'url': 'https://vs-travel.ru/tour?id=1100',
        'image': 'https://vs-travel.ru/images/tour2.jpg',
        'categoryName': 'Экскурсии'
    },
    {
        'id': 'tour_001101',
        'name': 'Тур без скидки',
        'price': '5000',
        # Нет oldPrice
        'url': 'https://vs-travel.ru/tour?id=1101',
        'image': 'https://vs-travel.ru/images/tour3.jpg',
        'categoryName': 'Туры'
    }
]

test_settings = {
    'shopName': 'Вокруг Света',
    'companyName': 'ООО Вокруг Света',
    'defaultCurrency': 'RUB',
    'siteUrl': 'https://vs-travel.ru'
}

# Генерируем фид (products, collections=None, settings)
xml_content = generate_yml_feed(test_products, None, test_settings)

# Парсим и проверяем
root = ET.fromstring(xml_content)

print("=== Проверка XML фида ===\n")

offers = root.findall('.//offer')
for offer in offers:
    offer_id = offer.get('id')
    name = offer.find('name')
    price = offer.find('price')
    oldprice = offer.find('oldprice')
    
    print(f"ID: {offer_id}")
    print(f"  Name: {name.text if name is not None else 'N/A'}")
    print(f"  Price: {price.text if price is not None else 'N/A'}")
    print(f"  OldPrice: {oldprice.text if oldprice is not None else 'НЕТ (без скидки)'}")
    print()

# Сохраним пример XML
with open('test_feed_output.xml', 'w', encoding='utf-8') as f:
    f.write(xml_content)

print("XML сохранён в test_feed_output.xml")
print("\n=== Пример XML (первые 2000 символов) ===")
print(xml_content[:2000])
