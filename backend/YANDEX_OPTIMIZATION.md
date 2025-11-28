# Оптимизация фидов для Яндекс.Директ

## Выполненные изменения

### 1. Добавлена поддержка каталогов (Collections)

**База данных (`backend/database.py`):**
- Добавлена структура `collections` для хранения каталогов товаров
- Реализованы методы: `get_collections()`, `add_collection()`, `update_collection()`, `delete_collection()`
- Поддержка связи many-to-many между товарами и каталогами через поле `collectionIds`

**API endpoints (`backend/main.py`):**
- `GET /api/collections` - получить все каталоги
- `GET /api/collections/{collection_id}` - получить каталог по ID
- `POST /api/collections` - создать каталог
- `PUT /api/collections/{collection_id}` - обновить каталог
- `DELETE /api/collections/{collection_id}` - удалить каталог
- `POST /api/collections/{collection_id}/products/{product_id}` - добавить товар в каталог
- `DELETE /api/collections/{collection_id}/products/{product_id}` - удалить товар из каталога
- `GET /api/collections/{collection_id}/products` - получить товары каталога

### 2. Расширенная модель товаров

Теперь товары поддерживают все поля, требуемые Яндексом:

**Обязательные поля:**
- `id` - уникальный идентификатор
- `url` - ссылка на страницу товара
- `price` - цена
- `currencyId` - валюта
- `categoryId` - категория
- `name` - название (для упрощенного типа)
- `vendor` + `model` (для произвольного типа)

**Дополнительные поля:**
- `typePrefix` - тип/категория товара
- `vendorCode` - код производителя
- `oldprice` - старая цена (для скидок)
- `description` - описание товара
- `picture` / `pictures` - изображения (до 5 шт)
- `video` - ссылка на видео
- `sales_notes` - информация о заказе
- `store` - доступность в розничном магазине
- `pickup` - возможность самовывоза
- `delivery` - курьерская доставка
- `manufacturer_warranty` - гарантия производителя
- `country_of_origin` - страна производства
- `age` - возрастная категория
- `params` - параметры товара (материал, цвет, пол, размер)
- `collectionIds` - массив ID каталогов
- `custom_label_0..4` - кастомные метки для фильтров
- `custom_score` - кастомная оценка для фильтров

### 3. Оптимизированная генерация YML фидов

Создан новый модуль `backend/feed_generator.py` с функцией `generate_yml_feed()`:

**Особенности:**
- ✅ Комбинированный тип описания (name + vendor + model + typePrefix) для лучшей релевантности
- ✅ Поддержка всех обязательных и рекомендуемых элементов YML
- ✅ Генерация элемента `<collections>` для каталогов
- ✅ Связывание товаров с каталогами через `<collectionId>`
- ✅ Поддержка множественных изображений
- ✅ Правильное форматирование XML с отступами
- ✅ Ограничения по длине полей согласно требованиям Яндекса
- ✅ Кастомные поля для фильтров в ЕПК

## Примеры использования

### Создание каталога

```json
POST /api/collections
{
  "name": "Туры по Крыму",
  "url": "https://vs-travel.ru/catalog/crimea",
  "description": "Лучшие туры по Крыму на любой вкус",
  "pictures": [
    "https://vs-travel.ru/img/crimea1.jpg",
    "https://vs-travel.ru/img/crimea2.jpg"
  ]
}
```

### Добавление товара в каталог

```
POST /api/collections/collection_001/products/tour_000123
```

### Расширенный товар с поддержкой всех полей

```json
{
  "id": "tour_000123",
  "name": "Тур в Крым на 5 дней",
  "url": "https://vs-travel.ru/tour?id=123",
  "price": 25000,
  "oldprice": 30000,
  "categoryId": "1",
  "typePrefix": "Тур",
  "vendor": "Вокруг Света",
  "model": "Крым - 5 дней",
  "vendorCode": "CRIMEA-5D-2024",
  "description": "Незабываемый тур по достопримечательностям Крыма",
  "image": "https://vs-travel.ru/img/tours/123.jpg",
  "pictures": [
    "https://vs-travel.ru/img/tours/123-2.jpg",
    "https://vs-travel.ru/img/tours/123-3.jpg"
  ],
  "video": "https://vs-travel.ru/video/123.mp4",
  "store": true,
  "pickup": true,
  "delivery": false,
  "manufacturer_warranty": true,
  "country_of_origin": "Россия",
  "params": [
    {"name": "Дней", "value": "5"},
    {"name": "Маршрут", "value": "Ялта - Севастополь - Бахчисарай"}
  ],
  "collectionIds": ["collection_001", "collection_003"],
  "custom_label_0": "hot_deal",
  "custom_label_1": "summer_2024",
  "custom_score": 100
}
```

### Структура сгенерированного YML фида

```xml
<?xml version="1.0" encoding="utf-8"?>
<yml_catalog date="2024-11-15 14:30">
  <shop>
    <name>Вокруг света</name>
    <company>Туристическая компания "Вокруг света"</company>
    <url>https://vs-travel.ru/</url>
    
    <currencies>
      <currency id="RUB" rate="1"/>
    </currencies>
    
    <categories>
      <category id="1">Многодневные туры</category>
    </categories>
    
    <offers>
      <offer id="tour_000123" type="vendor.model" available="true">
        <url>https://vs-travel.ru/tour?id=123</url>
        <price>25000</price>
        <oldprice>30000</oldprice>
        <currencyId>RUB</currencyId>
        <categoryId>1</categoryId>
        <picture>https://vs-travel.ru/img/tours/123.jpg</picture>
        <picture>https://vs-travel.ru/img/tours/123-2.jpg</picture>
        
        <name>Тур в Крым на 5 дней</name>
        <typePrefix>Тур</typePrefix>
        <vendor>Вокруг Света</vendor>
        <model>Крым - 5 дней</model>
        <vendorCode>CRIMEA-5D-2024</vendorCode>
        
        <description>Незабываемый тур по достопримечательностям Крыма</description>
        
        <store>true</store>
        <pickup>true</pickup>
        <delivery>false</delivery>
        <manufacturer_warranty>true</manufacturer_warranty>
        <country_of_origin>Россия</country_of_origin>
        
        <param name="Дней">5</param>
        <param name="Маршрут">Ялта - Севастополь - Бахчисарай</param>
        
        <collectionId>collection_001</collectionId>
        <collectionId>collection_003</collectionId>
        
        <custom_label_0>hot_deal</custom_label_0>
        <custom_label_1>summer_2024</custom_label_1>
        <custom_score>100</custom_score>
      </offer>
    </offers>
    
    <collections>
      <collection id="collection_001">
        <url>https://vs-travel.ru/catalog/crimea</url>
        <picture>https://vs-travel.ru/img/crimea1.jpg</picture>
        <picture>https://vs-travel.ru/img/crimea2.jpg</picture>
        <name>Туры по Крыму</name>
        <description>Лучшие туры по Крыму на любой вкус</description>
      </collection>
    </collections>
    
  </shop>
</yml_catalog>
```

## Преимущества новой реализации

1. **Полное соответствие требованиям Яндекса** - поддержка всех обязательных и рекомендуемых элементов
2. **Комбинированный тип описания** - больше данных для генерации релевантных объявлений
3. **Каталоги** - возможность группировки товаров в подборки для комбинированных форматов
4. **Гибкие фильтры** - кастомные поля для сегментации в ЕПК
5. **Скидки** - автоматический расчет и показ скидок при наличии `oldprice`
6. **Множественные изображения** - до 5 изображений для каруселей
7. **Расширяемость** - легко добавлять новые поля и категории

## Следующие шаги

- [ ] Создать UI для управления каталогами в frontend
- [ ] Добавить массовое редактирование полей товаров
- [ ] Реализовать валидацию фидов перед отправкой
- [ ] Добавить превью фида с подсветкой ошибок
