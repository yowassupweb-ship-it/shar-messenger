"""
Скрипт для инициализации дефолтных шаблонов в базе данных
"""
from database import db
from datetime import datetime

def init_default_templates():
    """Добавить дефолтные шаблоны UTM если их нет"""
    
    # Проверяем есть ли уже дефолтные шаблоны
    existing_templates = db.get_templates()
    existing_ids = {t['id'] for t in existing_templates}
    
    default_utm_templates = [
        {
            "id": "utm_yandex_metrica",
            "name": "Яндекс.Метрика",
            "type": "utm",
            "description": "UTM метки для интеграции с Яндекс.Метрикой",
            "content": {
                "template": "utm_source=yandex&utm_medium=cpc&utm_campaign={{campaign_name}}&utm_content={{ad_id}}&utm_term={{keyword}}&yclid={{yclid}}",
                "variables": ["campaign_name", "ad_id", "keyword", "yclid"]
            },
            "isDefault": True,
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat()
        },
        {
            "id": "utm_yandex_direct",
            "name": "Яндекс.Директ",
            "type": "utm",
            "description": "UTM метки для кампаний Яндекс.Директ",
            "content": {
                "template": "utm_source=yandex&utm_medium=cpc&utm_campaign={{campaign_id}}&utm_content={{ad_group_id}}&utm_term={{keyword}}",
                "variables": ["campaign_id", "ad_group_id", "keyword"]
            },
            "isDefault": True,
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat()
        },
        {
            "id": "utm_google_ads",
            "name": "Google Ads",
            "type": "utm",
            "description": "UTM метки для кампаний Google Ads",
            "content": {
                "template": "utm_source=google&utm_medium=cpc&utm_campaign={{campaign_name}}&utm_content={{ad_group}}&utm_term={{keyword}}",
                "variables": ["campaign_name", "ad_group", "keyword"]
            },
            "isDefault": True,
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat()
        },
        {
            "id": "utm_facebook_ads",
            "name": "Facebook Ads",
            "type": "utm",
            "description": "UTM метки для кампаний Facebook",
            "content": {
                "template": "utm_source=facebook&utm_medium=cpc&utm_campaign={{campaign_name}}&utm_content={{ad_set}}&utm_term={{ad_name}}",
                "variables": ["campaign_name", "ad_set", "ad_name"]
            },
            "isDefault": True,
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat()
        }
    ]
    
    # Добавляем только те шаблоны, которых нет
    added_count = 0
    for template in default_utm_templates:
        if template['id'] not in existing_ids:
            db.add_template(template)
            added_count += 1
            print(f"✅ Добавлен дефолтный шаблон: {template['name']}")
    
    if added_count == 0:
        print("ℹ️  Все дефолтные шаблоны уже существуют")
    else:
        print(f"\n🎉 Добавлено {added_count} дефолтных шаблонов")

if __name__ == "__main__":
    print("🔧 Инициализация дефолтных шаблонов...")
    init_default_templates()
