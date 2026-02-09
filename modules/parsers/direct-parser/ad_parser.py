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
    
    def _close_popups(self):
        """Закрытие всплывающих окон Яндекса (расширение, куки и т.д.)"""
        popup_close_selectors = [
            # Popup "Сделать Яндекс основным поиском"
            "button.Modal-Close",
            ".modal__close",
            ".popup__close",
            ".dialog__close",
            "[aria-label='Закрыть']",
            "[aria-label='Close']",
            ".CloseButton",
            # Баннер про куки
            ".gdpr-popup__button",
            ".cookie-warning__button",
            # Другие popup
            ".Popup-CloseButton",
            ".Modal_visible .Modal-Close",
            ".Modal_visible button[class*='close']",
            "button[class*='Close']",
            ".Drawer-Closer",
            # Крестик в правом углу
            "svg[class*='Close']",
            "[class*='close-button']",
            "[class*='closeButton']",
        ]
        
        for selector in popup_close_selectors:
            try:
                elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                for elem in elements:
                    if elem.is_displayed():
                        elem.click()
                        print(f"  [DEBUG] Закрыт popup: {selector}")
                        time.sleep(0.5)
            except:
                continue
        
        # Также пробуем закрыть по Escape
        try:
            from selenium.webdriver.common.keys import Keys
            self.driver.find_element(By.TAG_NAME, "body").send_keys(Keys.ESCAPE)
        except:
            pass
    
    def parse_yandex_ads(self, query, max_pages=3):
        """
        Парсинг рекламы из Яндекса
        :param query: поисковый запрос
        :param max_pages: количество страниц для парсинга
        :return: список найденных объявлений
        """
        print(f"\n=== Парсинг Яндекс по запросу: '{query}' ===")
        
        try:
            # Открываем поиск Яндекса напрямую с запросом
            encoded_query = query.replace(' ', '+')
            self.driver.get(f"https://yandex.ru/search/?text={encoded_query}")
            
            # Ожидание загрузки страницы
            time.sleep(3)
            
            # Закрываем всплывающие окна (расширение Яндекса и т.д.)
            self._close_popups()
            time.sleep(1)
            
            # Скроллим для загрузки всех объявлений
            self.driver.execute_script("window.scrollTo(0, 1000)")
            time.sleep(1)
            self.driver.execute_script("window.scrollTo(0, 0)")
            time.sleep(1)
            
            # Ещё раз пробуем закрыть popup (могут появиться после скролла)
            self._close_popups()
            
            # Сохраняем HTML для отладки
            debug_html_path = f"debug_page_{query[:20].replace(' ', '_')}.html"
            with open(debug_html_path, 'w', encoding='utf-8') as f:
                f.write(self.driver.page_source)
            print(f"  [DEBUG] HTML сохранен в {debug_html_path}")
            
            for page in range(max_pages):
                print(f"Обработка страницы {page + 1}...")
                
                # Парсим рекламу (все типы) с номером страницы
                self._parse_yandex_all_ads(query, page_num=page + 1)
                
                # Переход на следующую страницу
                if page < max_pages - 1:
                    try:
                        next_button = self.driver.find_element(By.CSS_SELECTOR, "a.Pager-Item_type_next, a[aria-label='Следующая страница'], .pager__item_kind_next a")
                        next_button.click()
                        time.sleep(4)
                        # Закрываем popup если появятся
                        self._close_popups()
                        # Скролл после перехода
                        self.driver.execute_script("window.scrollTo(0, 500)")
                        time.sleep(1)
                    except:
                        print("Больше нет страниц для парсинга")
                        break
            
            results = [r for r in self.results if r['query'] == query]
            print(f"Найдено объявлений: {len(results)}")
            return results
            
        except Exception as e:
            print(f"Ошибка при парсинге Яндекса: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def _parse_yandex_all_ads(self, query, page_num=1):
        """
        Парсинг рекламных блоков в Яндексе комбинированным методом:
        1. По HTML атрибутам (outerHTML содержит withAdvLabel или AdvLabel)
        2. По текстовым признакам (слово "промо", "реклама")
        3. По формату URL: domain.ru›путь... (со знаком ›)
        
        :param query: поисковый запрос
        :param page_num: номер страницы (для указания позиции)
        """
        import re
        
        try:
            # Ждём загрузки результатов поиска
            try:
                WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "li.serp-item, .serp-list"))
                )
                time.sleep(2)  # Дополнительное ожидание для рендера
            except:
                print("  [DEBUG] Таймаут ожидания результатов поиска")
            
            # Получаем все элементы результатов поиска
            serp_items = self.driver.find_elements(By.CSS_SELECTOR, "li.serp-item")
            print(f"  [DEBUG] Всего результатов поиска (serp-item): {len(serp_items)}")
            
            ads_found = []
            
            for idx, item in enumerate(serp_items):
                try:
                    # МЕТОД 1: Проверка по HTML атрибутам (самый надёжный)
                    # innerHTML содержит все внутренние классы элемента
                    inner_html = item.get_attribute('innerHTML')[:5000] or ''
                    outer_html = item.get_attribute('outerHTML')[:2000] or ''
                    combined_html = outer_html + inner_html
                    
                    has_adv_class = ('withAdvLabel' in combined_html or 
                                    'AdvLabel' in combined_html or 
                                    'Organic_adv' in combined_html or
                                    'organic_adv' in combined_html)
                    
                    # МЕТОД 2: Проверка по тексту
                    item_text = item.text.lower()
                    has_promo_text = 'промо' in item_text or 'реклама' in item_text
                    
                    # МЕТОД 3: URL со знаком › (как дополнительный признак)
                    # Но только если есть другой признак рекламы
                    has_special_url = '›' in item.text
                    
                    # Объявление если:
                    # - есть класс рекламы в HTML
                    # - ИЛИ есть текст "промо"/"реклама"  
                    # - ИЛИ есть специальный URL (но это слабый признак, используем для фильтрации)
                    is_ad = has_adv_class or has_promo_text
                    
                    if is_ad:
                        # Сохраняем позицию в списке serp-item (1-indexed)
                        ads_found.append((item, idx + 1))
                        
                except Exception as e:
                    continue
            
            print(f"  [DEBUG] Найдено рекламных блоков: {len(ads_found)}")
            
            # Счётчик позиций рекламы на текущей странице
            ad_position_on_page = 0
            
            # Обрабатываем найденные объявления
            for ad_elem, serp_position in ads_found:
                try:
                    ad_position_on_page += 1
                    
                    ad_data = {
                        'platform': 'Яндекс',
                        'type': 'Контекстная реклама',
                        'query': query,
                        'title': '',
                        'description': '',
                        'url': '',
                        'display_url': '',
                        'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        'page': page_num,
                        'position': ad_position_on_page,  # Позиция среди рекламных блоков на странице
                        'serp_position': serp_position  # Позиция в общем списке результатов поиска
                    }
                    
                    # Получаем весь текст блока и разбиваем на строки
                    full_text = ad_elem.text.strip()
                    lines = [l.strip() for l in full_text.split('\n') if l.strip()]
                    
                    # Ищем display_url (строка со знаком ›)
                    for line in lines:
                        if '›' in line:
                            ad_data['display_url'] = line
                            break
                    
                    # Заголовок - обычно первая значимая строка
                    for line in lines:
                        # Пропускаем служебные строки
                        if '›' in line or line.lower() in ['промо', 'реклама']:
                            continue
                        if len(line) > 10:  # Заголовок обычно длиннее 10 символов
                            ad_data['title'] = line[:200]
                            break
                    
                    # Пробуем извлечь реальный URL из ссылки
                    try:
                        links = ad_elem.find_elements(By.TAG_NAME, "a")
                        for link in links:
                            href = link.get_attribute('href') or ''
                            data_vnl = link.get_attribute('data-vnl')
                            if data_vnl:
                                try:
                                    vnl_data = json.loads(data_vnl)
                                    real_url = vnl_data.get('noRedirectUrl', '')
                                    if real_url:
                                        ad_data['url'] = real_url
                                        break
                                except:
                                    match = re.search(r'"noRedirectUrl":"([^"]+)"', data_vnl)
                                    if match:
                                        ad_data['url'] = match.group(1).replace('&amp;', '&')
                                        break
                            if href and 'yabs.yandex' in href and not ad_data['url']:
                                ad_data['url'] = href
                    except:
                        pass
                    
                    # Если URL не найден, пытаемся извлечь домен из display_url
                    if not ad_data['url'] and ad_data['display_url']:
                        domain = ad_data['display_url'].split('›')[0].strip()
                        if domain:
                            ad_data['url'] = f"https://{domain}"
                    
                    # Описание - остальной текст после заголовка
                    desc_lines = []
                    found_title = False
                    for line in lines:
                        if line == ad_data['title']:
                            found_title = True
                            continue
                        if found_title and '›' not in line and line.lower() not in ['промо', 'реклама']:
                            desc_lines.append(line)
                    if desc_lines:
                        ad_data['description'] = ' '.join(desc_lines)[:500]
                    
                    # Проверяем дубликаты по display_url или title
                    existing_urls = {r.get('display_url', '') for r in self.results if r.get('query') == query}
                    existing_titles = {r.get('title', '') for r in self.results if r.get('query') == query}
                    
                    if ad_data['display_url'] in existing_urls and ad_data['display_url']:
                        continue
                    if ad_data['title'] in existing_titles and ad_data['title']:
                        continue
                    
                    # Сохраняем если есть хотя бы заголовок или display_url
                    if ad_data['title'] or ad_data['display_url']:
                        self.results.append(ad_data)
                        preview = ad_data['title'][:40] or ad_data['display_url'][:40]
                        print(f"  ✓ Найдено: {preview}...")
                
                except Exception as e:
                    continue
                    
        except Exception as e:
            print(f"Ошибка при парсинге рекламы: {e}")
            import traceback
            traceback.print_exc()
        
        # Парсим боковые баннеры (изображения рекламы)
        self._parse_sidebar_banners(query, page_num)

    def _parse_sidebar_banners(self, query, page_num=1):
        """Парсинг боковых рекламных баннеров (изображения справа)"""
        import re
        
        try:
            # Селекторы для боковых баннеров
            banner_selectors = [
                ".Adv",  # Рекламный блок
                ".AdvBanner",
                ".serp-adv",
                ".serp-adv__found", 
                "[class*='Banner']",
                ".sidebar__adv",
                ".content__right [class*='adv']",
                ".content__right [class*='Adv']",
                ".RelatedBottom",
                ".Composite [class*='adv']",
                # Изображения с рекламой
                "img[src*='yabs.yandex']",
                "a[href*='yabs.yandex'] img",
            ]
            
            banners_found = []
            
            for selector in banner_selectors:
                try:
                    elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    for elem in elements:
                        if elem not in banners_found and elem.is_displayed():
                            banners_found.append(elem)
                except:
                    continue
            
            # Также ищем все элементы с рекламными ссылками yabs.yandex
            try:
                yabs_links = self.driver.find_elements(By.CSS_SELECTOR, "a[href*='yabs.yandex']")
                for link in yabs_links:
                    try:
                        # Проверяем, есть ли изображение внутри
                        imgs = link.find_elements(By.TAG_NAME, "img")
                        if imgs:
                            parent = link
                            # Пробуем найти родительский контейнер баннера
                            for _ in range(3):
                                try:
                                    parent = parent.find_element(By.XPATH, "..")
                                except:
                                    break
                            if parent not in banners_found:
                                banners_found.append(parent)
                    except:
                        continue
            except:
                pass
            
            if banners_found:
                print(f"  [DEBUG] Найдено боковых баннеров: {len(banners_found)}")
            
            for idx, banner in enumerate(banners_found):
                try:
                    ad_data = {
                        'platform': 'Яндекс',
                        'type': 'Баннерная реклама',
                        'query': query,
                        'title': '',
                        'description': '',
                        'url': '',
                        'page': page_num,
                        'position': idx + 1,  # Позиция среди баннеров
                        'serp_position': 0,  # Баннеры не в SERP
                        'display_url': '',
                        'image_url': '',
                        'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    }
                    
                    # Ищем изображение
                    try:
                        img = banner.find_element(By.TAG_NAME, "img")
                        ad_data['image_url'] = img.get_attribute('src') or ''
                    except:
                        pass
                    
                    # Ищем ссылку и URL
                    try:
                        links = banner.find_elements(By.TAG_NAME, "a")
                        for link in links:
                            href = link.get_attribute('href') or ''
                            if href:
                                ad_data['url'] = href
                                # Пробуем извлечь реальный URL
                                data_vnl = link.get_attribute('data-vnl')
                                if data_vnl:
                                    match = re.search(r'"noRedirectUrl":"([^"]+)"', data_vnl)
                                    if match:
                                        ad_data['url'] = match.group(1).replace('&amp;', '&')
                                break
                    except:
                        pass
                    
                    # Заголовок - текст баннера
                    banner_text = banner.text.strip()
                    if banner_text:
                        lines = banner_text.split('\n')
                        ad_data['title'] = lines[0][:200] if lines else ''
                        if len(lines) > 1:
                            ad_data['description'] = ' '.join(lines[1:])[:300]
                    
                    # Пропускаем "Люди ищут" - это не баннер рекламы
                    if ad_data['title'] and 'люди ищут' in ad_data['title'].lower():
                        continue
                    
                    # Проверяем дубликаты
                    existing_urls = {r.get('url', '') for r in self.results if r.get('query') == query}
                    if ad_data['url'] in existing_urls and ad_data['url']:
                        continue
                    
                    # Сохраняем если есть URL или изображение
                    if ad_data['url'] or ad_data['image_url']:
                        self.results.append(ad_data)
                        preview = ad_data['title'][:30] or ad_data['image_url'][:30] or 'Баннер'
                        print(f"  ✓ Баннер: {preview}...")
                        
                except Exception as e:
                    continue
                    
        except Exception as e:
            print(f"  [DEBUG] Ошибка парсинга баннеров: {e}")

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
