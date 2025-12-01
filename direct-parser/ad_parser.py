"""
Скрипт для парсинга контекстной и поисковой рекламы конкурентов
Использует Selenium для эмуляции браузера
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
import time
import json
import csv
from datetime import datetime


class AdParser:
    def __init__(self, headless=False, status_callback=None):
        """
        Инициализация парсера
        :param headless: запуск браузера в фоновом режиме (без GUI)
        :param status_callback: функция для отправки статуса (опционально)
        """
        self.status_callback = status_callback
        self.chrome_options = Options()
        if headless:
            self.chrome_options.add_argument("--headless")
        
        # Дополнительные опции для стабильной работы
        self.chrome_options.add_argument("--no-sandbox")
        self.chrome_options.add_argument("--disable-dev-shm-usage")
        self.chrome_options.add_argument("--disable-blink-features=AutomationControlled")
        self.chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        
        self.driver = None
        self.results = []
    
    def start_browser(self):
        """Запуск браузера"""
        try:
            self.driver = webdriver.Chrome(options=self.chrome_options)
            self.driver.maximize_window()
            print("Браузер успешно запущен")
            return True
        except Exception as e:
            print(f"Ошибка при запуске браузера: {e}")
            print("Убедитесь, что установлен ChromeDriver")
            return False
    
    def parse_yandex_ads(self, query, max_pages=3):
        """
        Парсинг рекламы из Яндекса
        :param query: поисковый запрос
        :param max_pages: количество страниц для парсинга
        """
        print(f"\n=== Парсинг Яндекс по запросу: '{query}' ===")
        
        try:
            # Открываем Яндекс
            self.driver.get("https://yandex.ru")
            time.sleep(2)
            
            # Ищем поисковую строку и вводим запрос
            search_box = self.driver.find_element(By.NAME, "text")
            search_box.send_keys(query)
            search_box.send_keys(Keys.RETURN)
            time.sleep(3)
            
            for page in range(max_pages):
                print(f"Обработка страницы {page + 1}...")
                
                # Парсим рекламу справа (контекстная реклама)
                self._parse_yandex_right_ads(query)
                
                # Парсим рекламу сверху (поисковая реклама)
                self._parse_yandex_top_ads(query)
                
                # Переход на следующую страницу
                if page < max_pages - 1:
                    try:
                        next_button = self.driver.find_element(By.CSS_SELECTOR, "a.Pager-Item_type_next")
                        next_button.click()
                        time.sleep(3)
                    except:
                        print("Больше нет страниц для парсинга")
                        break
            
            print(f"Найдено объявлений: {len([r for r in self.results if r['query'] == query])}")
            
        except Exception as e:
            print(f"Ошибка при парсинге Яндекса: {e}")
    
    def _parse_yandex_right_ads(self, query):
        """Парсинг правой колонки с рекламой в Яндексе"""
        try:
            # Различные селекторы для рекламных блоков Яндекса
            ad_selectors = [
                ".serp-adv__found",
                ".organic_adv",
                ".AdvOrganic",
                ".serp-item_type_direct"
            ]
            
            ads = []
            for selector in ad_selectors:
                try:
                    ads.extend(self.driver.find_elements(By.CSS_SELECTOR, selector))
                except:
                    continue
            
            for ad in ads:
                try:
                    ad_data = {
                        'platform': 'Яндекс',
                        'type': 'Контекстная реклама',
                        'query': query,
                        'title': '',
                        'description': '',
                        'url': '',
                        'display_url': '',
                        'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    }
                    
                    # Заголовок
                    try:
                        title_elem = ad.find_element(By.CSS_SELECTOR, ".OrganicTitle-Link, .Link_theme_normal, .organic__url-text")
                        ad_data['title'] = title_elem.text
                    except:
                        pass
                    
                    # Описание
                    try:
                        desc_elem = ad.find_element(By.CSS_SELECTOR, ".organic__text, .Text_size_m, .text-container")
                        ad_data['description'] = desc_elem.text
                    except:
                        pass
                    
                    # URL
                    try:
                        url_elem = ad.find_element(By.CSS_SELECTOR, "a.OrganicTitle-Link, a.Link")
                        ad_data['url'] = url_elem.get_attribute('href')
                    except:
                        pass
                    
                    # Отображаемый URL
                    try:
                        display_url_elem = ad.find_element(By.CSS_SELECTOR, ".OrganicUrl, .Path-Item")
                        ad_data['display_url'] = display_url_elem.text
                    except:
                        pass
                    
                    if ad_data['title'] or ad_data['description']:
                        self.results.append(ad_data)
                        print(f"  ✓ Найдено: {ad_data['title'][:50]}...")
                
                except Exception as e:
                    continue
                    
        except Exception as e:
            print(f"Ошибка при парсинге правой рекламы: {e}")
    
    def _parse_yandex_top_ads(self, query):
        """Парсинг верхних рекламных блоков в Яндексе"""
        try:
            # Селекторы для верхней рекламы
            top_ad_selectors = [
                ".serp-item_type_direct",
                ".serp-adv__item",
                ".organic_adv"
            ]
            
            ads = []
            for selector in top_ad_selectors:
                try:
                    ads.extend(self.driver.find_elements(By.CSS_SELECTOR, selector))
                except:
                    continue
            
            for ad in ads:
                try:
                    ad_data = {
                        'platform': 'Яндекс',
                        'type': 'Поисковая реклама (верх)',
                        'query': query,
                        'title': '',
                        'description': '',
                        'url': '',
                        'display_url': '',
                        'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    }
                    
                    # Заголовок
                    try:
                        title_elem = ad.find_element(By.CSS_SELECTOR, ".OrganicTitle-Link, h2 a")
                        ad_data['title'] = title_elem.text
                    except:
                        pass
                    
                    # Описание
                    try:
                        desc_elem = ad.find_element(By.CSS_SELECTOR, ".organic__text")
                        ad_data['description'] = desc_elem.text
                    except:
                        pass
                    
                    # URL
                    try:
                        url_elem = ad.find_element(By.CSS_SELECTOR, "a.OrganicTitle-Link")
                        ad_data['url'] = url_elem.get_attribute('href')
                    except:
                        pass
                    
                    if ad_data['title'] or ad_data['description']:
                        self.results.append(ad_data)
                        print(f"  ✓ Найдено (верх): {ad_data['title'][:50]}...")
                
                except Exception as e:
                    continue
                    
        except Exception as e:
            print(f"Ошибка при парсинге верхней рекламы: {e}")
    
    def parse_google_ads(self, query, max_pages=3):
        """
        Парсинг рекламы из Google
        :param query: поисковый запрос
        :param max_pages: количество страниц для парсинга
        """
        print(f"\n=== Парсинг Google по запросу: '{query}' ===")
        
        try:
            # Открываем Google
            self.driver.get("https://www.google.com")
            time.sleep(2)
            
            # Принимаем cookies если появляется окно
            try:
                accept_button = self.driver.find_element(By.XPATH, "//button[contains(text(), 'Accept') or contains(text(), 'Принять')]")
                accept_button.click()
                time.sleep(1)
            except:
                pass
            
            # Ищем поисковую строку и вводим запрос
            search_box = self.driver.find_element(By.NAME, "q")
            search_box.send_keys(query)
            search_box.send_keys(Keys.RETURN)
            time.sleep(3)
            
            for page in range(max_pages):
                print(f"Обработка страницы {page + 1}...")
                
                # Парсим рекламу
                self._parse_google_search_ads(query)
                
                # Переход на следующую страницу
                if page < max_pages - 1:
                    try:
                        next_button = self.driver.find_element(By.ID, "pnnext")
                        next_button.click()
                        time.sleep(3)
                    except:
                        print("Больше нет страниц для парсинга")
                        break
            
            print(f"Найдено объявлений: {len([r for r in self.results if r['query'] == query and r['platform'] == 'Google'])}")
            
        except Exception as e:
            print(f"Ошибка при парсинге Google: {e}")
    
    def _parse_google_search_ads(self, query):
        """Парсинг рекламных блоков Google"""
        try:
            # Селекторы для рекламы Google Ads
            ad_containers = self.driver.find_elements(By.CSS_SELECTOR, "div[data-text-ad], .uEierd, .v5yQqb")
            
            for ad in ad_containers:
                try:
                    ad_data = {
                        'platform': 'Google',
                        'type': 'Поисковая реклама',
                        'query': query,
                        'title': '',
                        'description': '',
                        'url': '',
                        'display_url': '',
                        'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    }
                    
                    # Заголовок
                    try:
                        title_elem = ad.find_element(By.CSS_SELECTOR, "div[role='heading'], .CCgQ5")
                        ad_data['title'] = title_elem.text
                    except:
                        pass
                    
                    # Описание
                    try:
                        desc_elem = ad.find_element(By.CSS_SELECTOR, ".MUxGbd, .yDYNvb")
                        ad_data['description'] = desc_elem.text
                    except:
                        pass
                    
                    # Отображаемый URL
                    try:
                        display_url_elem = ad.find_element(By.CSS_SELECTOR, ".qzEoUe, cite")
                        ad_data['display_url'] = display_url_elem.text
                    except:
                        pass
                    
                    # URL ссылки
                    try:
                        url_elem = ad.find_element(By.CSS_SELECTOR, "a")
                        ad_data['url'] = url_elem.get_attribute('href')
                    except:
                        pass
                    
                    if ad_data['title'] or ad_data['description']:
                        self.results.append(ad_data)
                        print(f"  ✓ Найдено: {ad_data['title'][:50]}...")
                
                except Exception as e:
                    continue
                    
        except Exception as e:
            print(f"Ошибка при парсинге рекламы Google: {e}")
    
    def save_to_json(self, filename='ads_results.json'):
        """Сохранение результатов в JSON"""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(self.results, f, ensure_ascii=False, indent=2)
            print(f"\n✓ Результаты сохранены в {filename}")
        except Exception as e:
            print(f"Ошибка при сохранении JSON: {e}")
    
    def save_to_csv(self, filename='ads_results.csv'):
        """Сохранение результатов в CSV"""
        try:
            if not self.results:
                print("Нет данных для сохранения")
                return
            
            keys = self.results[0].keys()
            with open(filename, 'w', encoding='utf-8-sig', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=keys)
                writer.writeheader()
                writer.writerows(self.results)
            print(f"✓ Результаты сохранены в {filename}")
        except Exception as e:
            print(f"Ошибка при сохранении CSV: {e}")
    
    def print_summary(self):
        """Вывод сводки по результатам"""
        print("\n" + "="*60)
        print("СВОДКА ПО РЕЗУЛЬТАТАМ")
        print("="*60)
        print(f"Всего найдено объявлений: {len(self.results)}")
        
        # Группировка по платформам
        platforms = {}
        for result in self.results:
            platform = result['platform']
            platforms[platform] = platforms.get(platform, 0) + 1
        
        print("\nПо платформам:")
        for platform, count in platforms.items():
            print(f"  {platform}: {count}")
        
        # Группировка по типам
        types = {}
        for result in self.results:
            ad_type = result['type']
            types[ad_type] = types.get(ad_type, 0) + 1
        
        print("\nПо типам рекламы:")
        for ad_type, count in types.items():
            print(f"  {ad_type}: {count}")
        
        print("="*60 + "\n")
    
    def close(self):
        """Закрытие браузера"""
        if self.driver:
            self.driver.quit()
            print("Браузер закрыт")


def main():
    """Основная функция"""
    print("="*60)
    print("ПАРСЕР КОНТЕКСТНОЙ И ПОИСКОВОЙ РЕКЛАМЫ")
    print("="*60)
    
    # Список запросов для парсинга
    queries = [
        "купить ноутбук",
        "доставка еды москва",
        # Добавьте свои запросы
    ]
    
    # Создаем парсер (headless=False - браузер будет виден)
    parser = AdParser(headless=False)
    
    if not parser.start_browser():
        return
    
    try:
        # Парсим Яндекс
        for query in queries:
            parser.parse_yandex_ads(query, max_pages=2)
            time.sleep(2)  # Пауза между запросами
        
        # Парсим Google (опционально)
        # for query in queries:
        #     parser.parse_google_ads(query, max_pages=2)
        #     time.sleep(2)
        
        # Выводим сводку
        parser.print_summary()
        
        # Сохраняем результаты
        parser.save_to_json('ads_results.json')
        parser.save_to_csv('ads_results.csv')
        
    except KeyboardInterrupt:
        print("\n\nПарсинг прерван пользователем")
    except Exception as e:
        print(f"\nОшибка: {e}")
    finally:
        parser.close()


if __name__ == "__main__":
    main()
