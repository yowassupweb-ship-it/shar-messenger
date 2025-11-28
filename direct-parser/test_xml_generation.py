"""
Тест XML генерации
"""

import xml.etree.ElementTree as ET
from xml.dom import minidom
from datetime import datetime

# Тестовые данные
test_results = [
    {
        'platform': 'Яндекс',
        'type': 'Контекстная реклама',
        'query': 'туры по россии',
        'title': 'Туры по России от прямых организаторов 2025-2026',
        'description': 'Авторские туры по России. Все включено: трансфер, питание, проживание...',
        'url': 'https://bolshayastrana.com/tours',
        'display_url': 'bolshayastrana.com›tours',
        'timestamp': '2025-11-12 14:36:49'
    },
    {
        'platform': 'Яндекс',
        'type': 'Реклама',
        'query': 'туры по россии',
        'title': 'Экскурсионный тур в 2025 по России',
        'description': 'Быстрое бронирование и оформление. Широкая сеть отелей партнёров.',
        'url': 'https://sletat.ru/trips/search/',
        'display_url': 'sletat.ru›trips/search',
        'timestamp': '2025-11-12 14:36:50'
    }
]

def generate_xml(results, filename='test_output.xml'):
    """Генерация XML файла"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Создаем корневой элемент
    root = ET.Element('ads')
    root.set('timestamp', timestamp)
    root.set('total', str(len(results)))
    
    # Добавляем каждое объявление
    for ad in results:
        ad_elem = ET.SubElement(root, 'ad')
        
        for key, value in ad.items():
            child = ET.SubElement(ad_elem, key)
            child.text = str(value) if value else ''
    
    # Форматируем XML для читаемости
    xml_string = minidom.parseString(ET.tostring(root, encoding='utf-8')).toprettyxml(indent='  ', encoding='utf-8')
    
    # Сохраняем в файл
    with open(filename, 'wb') as f:
        f.write(xml_string)
    
    print(f"✓ XML файл создан: {filename}")
    print(f"✓ Объявлений: {len(results)}")
    print(f"✓ Timestamp: {timestamp}")
    
    # Показываем содержимое
    print("\nСодержимое файла:")
    print("=" * 60)
    with open(filename, 'r', encoding='utf-8') as f:
        print(f.read())

if __name__ == "__main__":
    print("Тестирование генерации XML...")
    print("=" * 60)
    generate_xml(test_results)
