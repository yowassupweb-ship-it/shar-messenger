"""
Миграция шаблонов: content: {template: "..."} -> content: "..."
"""
import json
from pathlib import Path

def migrate_templates():
    db_path = Path(__file__).parent / 'database.json'
    
    # Читаем базу данных
    with open(db_path, 'r', encoding='utf-8') as f:
        db = json.load(f)
    
    # Миграция шаблонов
    migrated_count = 0
    for template in db.get('templates', []):
        if isinstance(template.get('content'), dict):
            # Старый формат: content: {template: "...", variables: [...]}
            old_content = template['content']
            template['content'] = old_content.get('template', '')
            
            # Сохраняем variables отдельно (опционально)
            if 'variables' in old_content and 'variables' not in template:
                template['variables'] = old_content['variables']
            
            migrated_count += 1
            print(f"✓ Migrated: {template.get('name', template.get('id'))}")
    
    if migrated_count == 0:
        print("✓ No templates to migrate (already in new format)")
        return
    
    # Создаем бэкап
    backup_path = db_path.with_suffix('.json.backup')
    with open(backup_path, 'w', encoding='utf-8') as f:
        json.dump(db, f, ensure_ascii=False, indent=2)
    print(f"\n✓ Backup created: {backup_path}")
    
    # Сохраняем обновленную базу
    with open(db_path, 'w', encoding='utf-8') as f:
        json.dump(db, f, ensure_ascii=False, indent=2)
    
    print(f"\n✓ Migrated {migrated_count} templates successfully!")
    print("✓ Database updated")

if __name__ == '__main__':
    migrate_templates()
