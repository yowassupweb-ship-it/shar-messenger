"""
Пример использования парсера через Python API
"""

from app import YandexAdParser
import json

def example_basic():
    """Базовый пример использования"""
    print("=== Базовый пример ===\n")
    
    # Создаем парсер (headless=False - браузер будет виден)
    parser = YandexAdParser(headless=False)
    
    if not parser.start_browser():
        print("Ошибка запуска браузера")
        return
    
    try:
        # Парсим по одному запросу
        parser.parse_yandex_ads("купить ноутбук", max_pages=2)
        
        # Выводим результаты
        print(f"\nНайдено объявлений: {len(parser.results)}")
        
        # Сохраняем в JSON
        with open('example_results.json', 'w', encoding='utf-8') as f:
            json.dump(parser.results, f, ensure_ascii=False, indent=2)
        
        print("Результаты сохранены в example_results.json")
        
    finally:
        parser.close()


def example_multiple_queries():
    """Пример с несколькими запросами"""
    print("\n=== Пример с несколькими запросами ===\n")
    
    queries = [
        "доставка еды москва",
        "ремонт компьютеров",
        "купить телефон"
    ]
    
    parser = YandexAdParser(headless=True)  # Скрытый режим
    
    if not parser.start_browser():
        return
    
    try:
        for query in queries:
            print(f"\nПарсинг: {query}")
            parser.parse_yandex_ads(query, max_pages=1)
        
        # Статистика по результатам
        print(f"\n{'='*50}")
        print(f"ВСЕГО НАЙДЕНО: {len(parser.results)} объявлений")
        print(f"{'='*50}\n")
        
        # Группировка по типам
        context_ads = [r for r in parser.results if r['type'] == 'Контекстная реклама']
        search_ads = [r for r in parser.results if r['type'] == 'Поисковая реклама']
        
        print(f"Контекстная реклама: {len(context_ads)}")
        print(f"Поисковая реклама: {len(search_ads)}")
        
        # Вывод примеров
        print(f"\n{'='*50}")
        print("ПРИМЕРЫ ОБЪЯВЛЕНИЙ:")
        print(f"{'='*50}\n")
        
        for i, ad in enumerate(parser.results[:5], 1):
            print(f"{i}. [{ad['type']}] {ad['query']}")
            print(f"   Заголовок: {ad['title']}")
            print(f"   Описание: {ad['description'][:100]}...")
            print(f"   URL: {ad['display_url']}\n")
        
    finally:
        parser.close()


def example_with_callback():
    """Пример с callback для отслеживания прогресса"""
    print("\n=== Пример с отслеживанием прогресса ===\n")
    
    def progress_callback(message):
        print(f"[STATUS] {message}")
    
    parser = YandexAdParser(headless=True, status_callback=progress_callback)
    
    if not parser.start_browser():
        return
    
    try:
        parser.parse_yandex_ads("заказать пиццу", max_pages=2)
        
        print(f"\nВсего объявлений: {len(parser.results)}")
        
    finally:
        parser.close()


if __name__ == "__main__":
    # Раскомментируйте нужный пример:
    
    # example_basic()
    # example_multiple_queries()
    example_with_callback()
