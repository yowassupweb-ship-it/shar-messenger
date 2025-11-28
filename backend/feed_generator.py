"""
Модуль генерации YML фидов для Яндекс.Директ
Соответствует требованиям формата YML
"""

import xml.etree.ElementTree as ET
import xml.dom.minidom as minidom
from datetime import datetime
from typing import List, Dict, Any, Optional


def generate_yml_feed(
    products: List[Dict[str, Any]],
    collections: List[Dict[str, Any]] = None,
    settings: Dict[str, Any] = None
) -> str:
    """
    Генерация YML фида согласно требованиям Яндекса
    
    Args:
        products: Список товаров
        collections: Список каталогов (опционально)
        settings: Настройки магазина
    
    Returns:
        str: XML строка в формате YML
    """
    if settings is None:
        settings = {}
    
    if collections is None:
        collections = []
    
    # Корневой элемент
    root = ET.Element('yml_catalog')
    root.set('date', datetime.now().strftime('%Y-%m-%d %H:%M'))
    
    shop = ET.SubElement(root, 'shop')
    
    # Информация о магазине
    _add_shop_info(shop, settings)
    
    # Валюты
    _add_currencies(shop, settings)
    
    # Категории - собираем уникальные категории из товаров
    category_mapping = _add_categories(shop, products, settings)
    
    # Товарные предложения (offers)
    offers = ET.SubElement(shop, 'offers')
    for product in products:
        _add_offer(offers, product, settings, category_mapping)
    
    # Каталоги (collections) - если есть
    if collections:
        _add_collections(shop, collections)
    
    # Форматируем XML
    xml_str = ET.tostring(root, encoding='utf-8')
    dom = minidom.parseString(xml_str)
    pretty_xml = dom.toprettyxml(indent='  ', encoding='utf-8')
    
    return pretty_xml


def _add_shop_info(shop: ET.Element, settings: Dict[str, Any]):
    """Добавление информации о магазине"""
    name = ET.SubElement(shop, 'name')
    name.text = settings.get('siteName', 'Вокруг света')
    
    company = ET.SubElement(shop, 'company')
    company.text = settings.get('companyName', 'Туристическая компания "Вокруг света"')
    
    url = ET.SubElement(shop, 'url')
    url.text = settings.get('siteUrl', 'https://vs-travel.ru/')


def _add_currencies(shop: ET.Element, settings: Dict[str, Any]):
    """Добавление валют"""
    currencies = ET.SubElement(shop, 'currencies')
    currency = ET.SubElement(currencies, 'currency')
    currency.set('id', settings.get('defaultCurrency', 'RUB'))
    currency.set('rate', '1')


def _add_categories(shop: ET.Element, products: List[Dict[str, Any]], settings: Dict[str, Any]):
    """Добавление категорий - динамически из товаров и настроек"""
    categories = ET.SubElement(shop, 'categories')
    
    # Собираем уникальные категории из товаров
    unique_categories = {}
    category_id_counter = 1
    
    for product in products:
        category_name = product.get('categoryName')
        if category_name and category_name not in unique_categories:
            unique_categories[category_name] = str(category_id_counter)
            category_id_counter += 1
    
    # Добавляем собранные категории
    for cat_name, cat_id in unique_categories.items():
        category = ET.SubElement(categories, 'category')
        category.set('id', cat_id)
        category.text = cat_name
    
    # Если категорий нет, добавляем дефолтную
    if not unique_categories:
        default_categories = settings.get('categories', [
            {'id': '1', 'name': 'Многодневные туры'}
        ])
        
        for cat in default_categories:
            category = ET.SubElement(categories, 'category')
            category.set('id', str(cat.get('id', '1')))
            if cat.get('parentId'):
                category.set('parentId', str(cat['parentId']))
            category.text = cat.get('name', 'Туры')
            # Добавляем в маппинг дефолтную категорию
            unique_categories[cat.get('name', 'Туры')] = str(cat.get('id', '1'))
    
    # Возвращаем маппинг для использования в _add_offer
    return unique_categories


def _add_offer(offers: ET.Element, product: Dict[str, Any], settings: Dict[str, Any], category_mapping: Dict[str, str] = None):
    """
    Добавление товарного предложения
    Использует комбинированный тип описания (name + vendor + model + typePrefix)
    """
    if category_mapping is None:
        category_mapping = {}
    
    offer = ET.SubElement(offers, 'offer')
    
    # Обязательные атрибуты
    offer.set('id', product['id'])
    
    # available - наличие товара
    is_available = str(product.get('available', True)).lower()
    offer.set('available', is_available)
    
    # Для произвольного типа указываем type="vendor.model"
    # Используем если есть vendor и model
    if product.get('vendor') and product.get('model'):
        offer.set('type', 'vendor.model')
    
    # URL страницы товара (обязательный)
    url = ET.SubElement(offer, 'url')
    url.text = product.get('url', '')
    
    # Цена (обязательная для товарной галереи)
    if product.get('price'):
        price = ET.SubElement(offer, 'price')
        price.text = str(product['price'])
        
        # Старая цена (для показа скидки)
        if product.get('oldprice') and float(product.get('oldprice', 0)) > float(product.get('price', 0)):
            oldprice = ET.SubElement(offer, 'oldprice')
            oldprice.text = str(product['oldprice'])
        
        # Валюта (обязательная если есть price)
        currency_id = ET.SubElement(offer, 'currencyId')
        currency_id.text = settings.get('defaultCurrency', 'RUB')
    
    # Категория (обязательная)
    category_id = ET.SubElement(offer, 'categoryId')
    # Используем категорию из товара (categoryName) или дефолтную
    if product.get('categoryName'):
        # Находим ID категории по имени из переданного маппинга
        cat_id = category_mapping.get(product['categoryName'], '1')
        category_id.text = str(cat_id)
    else:
        category_id.text = str(product.get('categoryId', '1'))
    
    # Изображения (обязательно для товарных объявлений)
    # Можно добавить до 5 изображений
    if product.get('image'):
        picture = ET.SubElement(offer, 'picture')
        picture.text = product['image']
    
    # Дополнительные изображения
    if product.get('pictures'):
        for pic_url in product['pictures'][:4]:  # Максимум 5 всего
            picture = ET.SubElement(offer, 'picture')
            picture.text = pic_url
    
    # Комбинированный тип описания (рекомендуется Яндексом)
    
    # 1. Упрощенный тип - name (обязательный для упрощенного типа)
    if product.get('name'):
        name = ET.SubElement(offer, 'name')
        name.text = product['name']
    
    # 2. Произвольный тип - typePrefix, vendor, model
    if product.get('typePrefix'):
        type_prefix = ET.SubElement(offer, 'typePrefix')
        type_prefix.text = product['typePrefix']
    
    if product.get('vendor'):
        vendor = ET.SubElement(offer, 'vendor')
        vendor.text = product['vendor']
    else:
        # Если нет vendor, используем название сайта
        vendor = ET.SubElement(offer, 'vendor')
        vendor.text = settings.get('siteName', 'Вокруг Света')
    
    if product.get('model'):
        model = ET.SubElement(offer, 'model')
        model.text = product['model']
    elif product.get('name'):
        # Если нет model, используем name
        model = ET.SubElement(offer, 'model')
        model.text = product['name']
    
    # Код производителя
    if product.get('vendorCode'):
        vendor_code = ET.SubElement(offer, 'vendorCode')
        vendor_code.text = str(product['vendorCode'])
    
    # Описание (рекомендуется)
    if product.get('description'):
        description = ET.SubElement(offer, 'description')
        # Ограничение YML - до 512 символов
        desc_text = str(product['description'])[:512]
        description.text = desc_text
    elif product.get('route'):
        # Если нет description, используем маршрут
        description = ET.SubElement(offer, 'description')
        desc_text = str(product['route'])[:512]
        description.text = desc_text
    
    # Видео (опционально)
    if product.get('video'):
        video = ET.SubElement(offer, 'video')
        video.text = product['video']
    
    # Информация о заказе
    if product.get('sales_notes'):
        sales_notes = ET.SubElement(offer, 'sales_notes')
        sales_notes.text = str(product['sales_notes'])[:50]  # Максимум 50 символов
    
    # Доставка и самовывоз
    if 'store' in product:
        store = ET.SubElement(offer, 'store')
        store.text = str(product['store']).lower()
    
    if 'pickup' in product:
        pickup = ET.SubElement(offer, 'pickup')
        pickup.text = str(product['pickup']).lower()
    
    if 'delivery' in product:
        delivery = ET.SubElement(offer, 'delivery')
        delivery.text = str(product['delivery']).lower()
    
    # Гарантия
    if 'manufacturer_warranty' in product:
        warranty = ET.SubElement(offer, 'manufacturer_warranty')
        warranty.text = str(product['manufacturer_warranty']).lower()
    
    # Страна производства
    if product.get('country_of_origin'):
        country = ET.SubElement(offer, 'country_of_origin')
        country.text = product['country_of_origin']
    
    # Возрастная категория
    if product.get('age'):
        age = ET.SubElement(offer, 'age')
        age.set('unit', product.get('age_unit', 'year'))
        age.text = str(product['age'])
    
    # Товар для взрослых
    if product.get('adult'):
        adult = ET.SubElement(offer, 'adult')
        adult.text = str(product['adult']).lower()
    
    # Параметры товара (param)
    # Яндекс учитывает: материал, цвет, пол, размер
    if product.get('params'):
        for param_data in product['params']:
            param = ET.SubElement(offer, 'param')
            param.set('name', param_data['name'])
            if param_data.get('unit'):
                param.set('unit', param_data['unit'])
            param.text = param_data['value']
    
    # Специфичные параметры для туров
    if product.get('days'):
        param = ET.SubElement(offer, 'param')
        param.set('name', 'Дней')
        param.text = str(product['days'])
    
    if product.get('route'):
        param = ET.SubElement(offer, 'param')
        param.set('name', 'Маршрут')
        param.text = product['route']
    
    # Кастомные элементы для фильтров
    for i in range(5):
        custom_label = product.get(f'custom_label_{i}')
        if custom_label:
            label = ET.SubElement(offer, f'custom_label_{i}')
            label.text = str(custom_label)[:175]  # Максимум 175 символов
    
    if product.get('custom_score') is not None:
        score = ET.SubElement(offer, 'custom_score')
        score.text = str(int(product['custom_score']))


def _add_collections(shop: ET.Element, collections: List[Dict[str, Any]]):
    """
    Добавление каталогов (collections)
    Используется для комбинированного формата объявлений
    """
    collections_elem = ET.SubElement(shop, 'collections')
    
    for coll in collections:
        collection = ET.SubElement(collections_elem, 'collection')
        collection.set('id', coll['id'])
        
        # URL страницы каталога (обязательный)
        url = ET.SubElement(collection, 'url')
        url.text = coll.get('url', '')
        
        # Изображения каталога (обязательно для РСЯ)
        if coll.get('pictures'):
            for pic_url in coll['pictures']:
                picture = ET.SubElement(collection, 'picture')
                picture.text = pic_url
        elif coll.get('picture'):
            picture = ET.SubElement(collection, 'picture')
            picture.text = coll['picture']
        
        # Название каталога (обязательное)
        name = ET.SubElement(collection, 'name')
        name.text = coll.get('name', '')
        
        # Описание каталога (опционально)
        if coll.get('description'):
            description = ET.SubElement(collection, 'description')
            description.text = coll['description']
