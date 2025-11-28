import requests
from bs4 import BeautifulSoup
from datetime import datetime
import xml.etree.ElementTree as ET
import logging
from typing import List, Dict, Optional
from urllib.parse import urlparse

# Настройка логирования
logging.basicConfig(level=logging.INFO)

def get_days_word(days):
    """
    Склоняет слово для количества дней:
    1 день → Экскурсия
    2-4 дня → Тур на X дня
    5+ дней → Тур на X дней
    """
    try:
        days_int = int(days)
        
        if days_int == 1:
            return "Экскурсия"
        
        if days_int % 10 == 1 and days_int % 100 != 11:
            return f"Тур на {days_int} день"
        elif 2 <= days_int % 10 <= 4 and (days_int % 100 < 10 or days_int % 100 >= 20):
            return f"Тур на {days_int} дня"
        else:
            return f"Тур на {days_int} дней"
    except (ValueError, TypeError):
        return "Экскурсия"

class TourParser:
    def __init__(self, base_url: str, username: Optional[str] = None, password: Optional[str] = None):
        self.full_url = base_url.rstrip('/')
        
        parsed = urlparse(base_url)
        self.base_url = f"{parsed.scheme}://{parsed.netloc}"
        
        self.username = username
        self.password = password
        self.session = requests.Session()
        self.logger = logging.getLogger(__name__)
        
        self.is_new_site = 'vs-travel.ru' in self.base_url
        self.logger.info(f"Инициализация парсера для {'нового' if self.is_new_site else 'старого'} сайта")

    def login(self) -> bool:
        """Авторизация на сайте"""
        if self.is_new_site:
            self.logger.info("Новый сайт - авторизация не требуется")
            return True
        
        try:
            self.session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'ru-RU,ru;q=0.9',
            })
            
            if self.username and self.password:
                self.session.auth = (self.username, self.password)
            
            response = self.session.get(self.full_url, timeout=30)
            
            if response.status_code == 401:
                raise Exception("Требуется авторизация")
            elif response.status_code != 200:
                raise Exception(f"Ошибка доступа: {response.status_code}")

            return True
            
        except Exception as e:
            self.logger.error(f"Ошибка подключения: {str(e)}")
            raise

    def fetch_tours(self) -> List[Dict]:
        """Получение туров с сайта"""
        try:
            self.logger.info(f"Начало парсинга туров с {self.full_url}")
            tours = []
            page = 1
            has_next_page = True
            
            while has_next_page:
                try:
                    self.logger.info(f"Парсинг страницы {page}...")
                    separator = '&' if '?' in self.full_url else '?'
                    url = f"{self.full_url}{separator}p={page}"
                    
                    self.logger.debug(f"Запрос к URL: {url}")
                    response = self.session.get(url, timeout=30)
                    self.logger.debug(f"Получен ответ: статус {response.status_code}, размер {len(response.text)} байт")
                    
                    if response.status_code != 200:
                        self.logger.error(f"Ошибка HTTP {response.status_code} при запросе страницы {page}")
                        break
                    
                    soup = BeautifulSoup(response.text, 'lxml')
                    
                    # Сначала ищем все div с классом catalog-item
                    tour_items = soup.find_all('div', class_=lambda c: c and 'catalog-item' in c)
                    
                    self.logger.info(f"Найдено элементов на странице {page}: {len(tour_items)}")
                    
                    # Если не нашли по catalog-item, пробуем другие варианты
                    if not tour_items:
                        self.logger.warning(f"Не найдено элементов с классом 'catalog-item'")
                        # Пробуем найти по другим селекторам
                        tour_items = soup.find_all('div', class_='tour-card')
                        if not tour_items:
                            tour_items = soup.find_all('article', class_=lambda c: c and 'tour' in c.lower())
                        
                        self.logger.info(f"Альтернативный поиск: найдено {len(tour_items)} элементов")
                    
                    if not tour_items:
                        self.logger.warning(f"Не найдено туров на странице {page}")
                        # Сохраняем HTML для отладки
                        with open(f'debug_page_{page}.html', 'w', encoding='utf-8') as f:
                            f.write(response.text)
                        self.logger.info(f"HTML сохранен в debug_page_{page}.html для анализа")
                        break
                        
                    for item in tour_items:
                        try:
                            h2_tag = item.find('h2')
                            if not h2_tag:
                                continue
                                
                            title_link = h2_tag.find('a', href=lambda x: x and 'tour?id=' in x)
                            if not title_link:
                                continue
                                
                            tour_name = title_link.text.strip()
                            tour_id = title_link['href'].split('=')[-1]
                            
                            # Дни
                            clock_div = item.find('div', class_='ico-clock')
                            days = "1"
                            if clock_div:
                                duration_text = clock_div.text.strip()
                                if 'дня' in duration_text:
                                    days = duration_text.split('дня')[0].strip()
                                elif 'дней' in duration_text:
                                    days = duration_text.split('дней')[0].strip()
                                elif 'час' in duration_text:
                                    days = "1"
                            
                            # Маршрут
                            place_div = item.find('div', class_='place')
                            route = place_div.text.strip() if place_div else ''
                            
                            # Изображение
                            swiper_slide = item.find('div', class_='swiper-slide')
                            image_url = ''
                            if swiper_slide:
                                img = swiper_slide.find('img')
                                if img and img.get('src'):
                                    image_url = img['src']
                                    if not image_url.startswith('http'):
                                        image_url = f"{self.base_url}{image_url}"
                            
                            # Цена (с учётом скидок)
                            bottom_right = item.find('div', class_='catalog-item__main_bottom-right')
                            price = '0'
                            old_price = None
                            
                            if bottom_right:
                                price_wrapper = bottom_right.find('div', class_='catalog-price-wrapper')
                                if price_wrapper:
                                    # Ищем старую цену (зачёркнутую)
                                    old_price_span = price_wrapper.find('span', class_='catalog-price__old-price')
                                    if old_price_span:
                                        old_price_elem = old_price_span.find('span', class_='catalog-price__price_b')
                                        if old_price_elem:
                                            old_price = ''.join(filter(str.isdigit, old_price_elem.text))
                                    
                                    # Ищем актуальную цену - берём последний catalog-price__price_b
                                    # который НЕ находится внутри old-price
                                    price_spans = price_wrapper.find_all('span', class_='catalog-price__price_b')
                                    for price_span in price_spans:
                                        # Проверяем, что это не внутри old-price
                                        parent = price_span.find_parent('span', class_='catalog-price__old-price')
                                        if not parent:
                                            price = ''.join(filter(str.isdigit, price_span.text))
                                            break
                                    
                                    # Если не нашли отдельную цену, берём всю
                                    if price == '0' and not old_price:
                                        price = ''.join(filter(str.isdigit, price_wrapper.text))
                            
                            formatted_id = f"tour_{tour_id.zfill(6)}"
                            cleaned_name = tour_name.replace('\n', ' ').strip()
                            
                            tour_data = {
                                'id': formatted_id,
                                'name': cleaned_name,
                                'days': days,
                                'route': route,
                                'image': image_url,
                                'price': price,
                                'oldPrice': old_price,  # Старая цена (если есть скидка)
                                'model': cleaned_name,
                                'url': f"{self.base_url}/tour?id={tour_id}"
                            }
                            
                            if not any(t['id'] == formatted_id for t in tours):
                                tours.append(tour_data)
                                self.logger.debug(f"Добавлен тур: {formatted_id} - {cleaned_name}")
                            
                        except Exception as e:
                            self.logger.error(f"Ошибка парсинга тура на странице {page}: {str(e)}", exc_info=True)
                            continue
                    
                    # Пагинация
                    pagination = soup.find('div', class_='pagination')
                    if pagination:
                        page_links = pagination.find_all('a')
                        max_page = 1
                        for link in page_links:
                            try:
                                page_num = int(link.text.strip())
                                max_page = max(max_page, page_num)
                            except ValueError:
                                continue
                        
                        if page < max_page:
                            page += 1
                        else:
                            has_next_page = False
                    else:
                        has_next_page = False
                        
                except requests.RequestException as e:
                    self.logger.error(f"Ошибка сети при парсинге страницы {page}: {str(e)}", exc_info=True)
                    break
                except Exception as e:
                    self.logger.error(f"Неожиданная ошибка при парсинге страницы {page}: {str(e)}", exc_info=True)
                    break
                    
            self.logger.info(f"Парсинг завершен. Всего туров: {len(tours)}")
            return tours
            
        except Exception as e:
            self.logger.error(f"Критическая ошибка получения туров: {str(e)}", exc_info=True)
            raise

    def generate_xml(self, tours: List[Dict]) -> Optional[ET.ElementTree]:
        """Генерация XML фида"""
        try:
            if not tours:
                return None

            root = ET.Element('yml_catalog')
            root.set('date', datetime.now().strftime('%Y-%m-%d %H:%M'))
            
            shop = ET.SubElement(root, 'shop')
            
            name = ET.SubElement(shop, 'name')
            name.text = 'Вокруг света'
            
            company = ET.SubElement(shop, 'company')
            company.text = 'Туристическая компания "Вокруг света"'
            
            url = ET.SubElement(shop, 'url')
            url.text = 'https://vs-travel.ru/'
            
            currencies = ET.SubElement(shop, 'currencies')
            currency = ET.SubElement(currencies, 'currency')
            currency.set('id', 'RUR')
            currency.set('rate', '1')
            
            categories = ET.SubElement(shop, 'categories')
            category = ET.SubElement(categories, 'category')
            category.set('id', '1')
            category.text = 'Многодневные туры'
            
            offers = ET.SubElement(shop, 'offers')
            
            for tour in tours:
                if not tour.get('id') or not tour.get('name'):
                    continue
                
                offer = ET.SubElement(offers, 'offer')
                offer.set('id', tour['id'])
                offer.set('available', 'true')
                
                url_elem = ET.SubElement(offer, 'url')
                url_elem.text = tour.get('url', '')
                
                price_elem = ET.SubElement(offer, 'price')
                price_elem.text = str(tour.get('price', '0'))
                
                currency_elem = ET.SubElement(offer, 'currencyId')
                currency_elem.text = 'RUB'
                
                category_elem = ET.SubElement(offer, 'categoryId')
                category_elem.text = '1'
                
                if tour.get('image'):
                    picture = ET.SubElement(offer, 'picture')
                    picture.text = tour['image']
                
                vendor = ET.SubElement(offer, 'vendor')
                vendor.text = 'Вокруг Света'
                
                model = ET.SubElement(offer, 'model')
                days_word = get_days_word(tour.get('days', '1'))
                model.text = f"{days_word} · {tour['model']}"
                
                description = ET.SubElement(offer, 'description')
                
                if tour.get('days'):
                    days_param = ET.SubElement(offer, 'param')
                    days_param.set('name', 'Дней')
                    days_param.text = str(tour['days'])
                
                if tour.get('route'):
                    route_param = ET.SubElement(offer, 'param')
                    route_param.set('name', 'Маршрут')
                    route_param.text = tour['route']

            for elem in root.iter():
                elem.tail = '\n'
                if elem.text and not elem.text.strip():
                    elem.text = '\n'

            tree = ET.ElementTree(root)
            return tree
            
        except Exception as e:
            self.logger.error(f"Ошибка генерации XML: {str(e)}")
            raise
