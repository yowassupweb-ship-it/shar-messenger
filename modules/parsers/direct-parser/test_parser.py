"""
Тестовый скрипт для проверки парсера Яндекс рекламы
"""

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service
from urllib.parse import quote
import time
import json

def test_yandex_parser():
    """Тестирование парсера Яндекс рекламы"""
    
    print("=" * 80)
    print("ТЕСТИРОВАНИЕ ПАРСЕРА ЯНДЕКС РЕКЛАМЫ")
    print("=" * 80)
    
    # Настройка Chrome
    chrome_options = Options()
    chrome_options.add_argument('--disable-blink-features=AutomationControlled')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--start-maximized')
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option('useAutomationExtension', False)
    chrome_options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    
    # Запуск браузера
    print("\n[1] Запуск браузера Chrome...")
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    
    # Скрываем webdriver
    driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
        'source': '''
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            })
        '''
    })
    
    try:
        # Формируем URL как в примере пользователя
        query = "туры по россии"
        encoded_query = quote(query)
        search_url = f"https://yandex.ru/search/?text={encoded_query}&lr=213"
        
        print(f"\n[2] Переход на страницу поиска:")
        print(f"    Запрос: {query}")
        print(f"    URL: {search_url}")
        
        driver.get(search_url)
        time.sleep(3)
        
        # Проверяем наличие капчи
        print("\n[3] Проверка капчи...")
        if "showcaptcha" in driver.current_url or "captcha" in driver.page_source.lower():
            print("    ⚠ ОБНАРУЖЕНА КАПЧА!")
            print("    Пожалуйста, решите капчу в браузере...")
            input("    Нажмите Enter после решения капчи...")
        else:
            print("    ✓ Капча не обнаружена")
        
        # Делаем скриншот для отладки
        screenshot_path = "yandex_search_screenshot.png"
        driver.save_screenshot(screenshot_path)
        print(f"\n[4] Скриншот сохранен: {screenshot_path}")
        
        # Пробуем разные селекторы для поиска рекламы
        print("\n[5] Поиск рекламных блоков...")
        
        selectors = [
            "li.serp-item",
            "div.Organic",
            "div.VanillaReact",
            "[data-cid]",
            ".serp-item",
            "div[class*='Organic']",
            "div[class*='serp']"
        ]
        
        results = {}
        total_elements = 0
        
        for selector in selectors:
            try:
                elements = driver.find_elements(By.CSS_SELECTOR, selector)
                count = len(elements)
                results[selector] = count
                total_elements += count
                print(f"    [{selector}]: {count} элементов")
                
                # Показываем первые 2 элемента для анализа
                if count > 0 and count <= 5:
                    for i, elem in enumerate(elements[:2], 1):
                        try:
                            text = elem.text[:100].replace('\n', ' ')
                            classes = elem.get_attribute('class')
                            print(f"      Элемент {i}: {text}...")
                            print(f"      Классы: {classes}")
                        except:
                            pass
                        
            except Exception as e:
                results[selector] = f"Ошибка: {e}"
                print(f"    [{selector}]: Ошибка - {e}")
        
        # Анализируем HTML структуру
        print("\n[6] Анализ HTML структуры...")
        page_source = driver.page_source
        
        keywords = [
            'serp-item',
            'Organic',
            'data-cid',
            'VanillaReact',
            'direct',
            'commercial'
        ]
        
        for keyword in keywords:
            count = page_source.count(keyword)
            print(f"    Упоминаний '{keyword}': {count}")
        
        # Сохраняем HTML для анализа
        html_path = "yandex_search_page.html"
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(page_source)
        print(f"\n[7] HTML страницы сохранен: {html_path}")
        
        # Итоговая статистика
        print("\n" + "=" * 80)
        print("РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ")
        print("=" * 80)
        print(f"Всего найдено элементов: {total_elements}")
        print(f"Использовано селекторов: {len(selectors)}")
        print(f"\nДетальные результаты сохранены в:")
        print(f"  - {screenshot_path}")
        print(f"  - {html_path}")
        
        # Сохраняем JSON с результатами
        results_path = "test_results.json"
        with open(results_path, 'w', encoding='utf-8') as f:
            json.dump({
                'query': query,
                'url': search_url,
                'selectors_results': results,
                'total_elements': total_elements,
                'page_title': driver.title
            }, f, ensure_ascii=False, indent=2)
        print(f"  - {results_path}")
        
        print("\nТестирование завершено!")
        print("Браузер останется открытым для анализа...")
        input("\nНажмите Enter для закрытия браузера...")
        
    except Exception as e:
        print(f"\n❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        driver.quit()
        print("\nБраузер закрыт")


if __name__ == "__main__":
    test_yandex_parser()
