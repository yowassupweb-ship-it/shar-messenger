"""
Тестовый скрипт для локальной проверки парсера без API
"""

from ad_parser import AdParser

def test_parser():
    # Создаем парсер в видимом режиме для отладки
    parser = AdParser(headless=False)
    
    if not parser.start_browser():
        print("Не удалось запустить браузер!")
        return
    
    try:
        # Тестовый запрос
        query = "туры в Сочи"
        print(f"\n=== Тестирование запроса: '{query}' ===\n")
        
        results = parser.parse_yandex_ads(query, max_pages=1)
        
        print(f"\n=== РЕЗУЛЬТАТЫ ===")
        print(f"Всего найдено: {len(results)} объявлений\n")
        
        for i, ad in enumerate(results, 1):
            print(f"--- Объявление #{i} ---")
            print(f"  Заголовок: {ad.get('title', 'N/A')[:80]}")
            print(f"  URL: {ad.get('url', 'N/A')[:100]}")
            print(f"  Display URL: {ad.get('display_url', 'N/A')}")
            print(f"  Описание: {ad.get('description', 'N/A')[:100]}")
            print()
        
        # Подождем чтобы увидеть браузер
        input("\nНажмите Enter для закрытия браузера...")
        
    finally:
        parser.close_browser()


if __name__ == "__main__":
    test_parser()
