"""
Database adapter that provides compatibility layer between JSON and PostgreSQL
Can switch between implementations based on environment variable
"""
import os
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

USE_POSTGRES = os.getenv('USE_POSTGRES', 'false').lower() == 'true'

if USE_POSTGRES:
    from db_postgres import PostgresConnection, PostgresDatabase
    
    class DatabaseAdapter:
        """Adapter to PostgreSQL database"""
        
        def __init__(self):
            self.conn = PostgresConnection()
            if not self.conn.connect():
                raise Exception("Failed to connect to PostgreSQL")
            self.db = PostgresDatabase(self.conn)
        
        # Delegate all methods to PostgreSQL implementation
        def get_settings(self) -> Dict[str, Any]:
            return self.db.get_settings()
        
        def update_settings(self, settings: Dict[str, Any]):
            self.db.update_settings(settings)
        
        def get_data_sources(self) -> List[Dict[str, Any]]:
            return self.db.get_data_sources()
        
        def get_data_source(self, source_id: str) -> Optional[Dict[str, Any]]:
            return self.db.get_data_source(source_id)
        
        def add_data_source(self, source: Dict[str, Any]) -> Dict[str, Any]:
            return self.db.add_data_source(source)
        
        def update_data_source(self, source_id: str, updates: Dict[str, Any]):
            return self.db.update_data_source(source_id, updates)
        
        def delete_data_source(self, source_id: str) -> bool:
            return self.db.delete_data_source(source_id)
        
        def get_feeds(self) -> List[Dict[str, Any]]:
            return self.db.get_feeds()
        
        def get_feed(self, feed_id: str) -> Optional[Dict[str, Any]]:
            return self.db.get_feed(feed_id)
        
        def add_feed(self, feed: Dict[str, Any]) -> Dict[str, Any]:
            return self.db.add_feed(feed)
        
        def update_feed(self, feed_id: str, updates: Dict[str, Any]):
            return self.db.update_feed(feed_id, updates)
        
        def delete_feed(self, feed_id: str) -> bool:
            return self.db.delete_feed(feed_id)
        
        def get_products(self, source_id: Optional[str] = None) -> List[Dict[str, Any]]:
            return self.db.get_products(source_id)
        
        def get_product(self, product_id: str) -> Optional[Dict[str, Any]]:
            return self.db.get_product(product_id)
        
        def add_products(self, products: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
            return self.db.add_products(products)
        
        def update_product(self, product_id: str, updates: Dict[str, Any]):
            return self.db.update_product(product_id, updates)
        
        def delete_product(self, product_id: str) -> bool:
            return self.db.delete_product(product_id)
        
        def delete_products_by_source(self, source_id: str) -> int:
            return self.db.delete_products_by_source(source_id)
        
        def mark_missing_products(self, source_id: str, current_product_ids: List[str]):
            """Mark products as hidden if they're missing from source"""
            products = self.db.get_products(source_id)
            for product in products:
                if product['id'] not in current_product_ids:
                    self.db.update_product(product['id'], {'hidden': True})
                else:
                    self.db.update_product(product['id'], {'hidden': False})
        
        def sync_products(self, source_id: str, new_products: List[Dict[str, Any]]):
            """Sync products for a source (delete old, add new)"""
            self.delete_products_by_source(source_id)
            self.add_products(new_products)
        
        def update_product_dates(self, product_id: str, dates: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
            """Update product dates"""
            return self.db.update_product(product_id, {'dates': dates})
        
        def get_users(self) -> List[Dict[str, Any]]:
            return self.db.get_users()
        
        def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
            return self.db.get_user(user_id)
        
        def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
            return self.db.get_user_by_id(user_id)
        
        def verify_user(self, username: str, password: str) -> bool:
            return self.db.verify_user(username, password)
        
        def add_user(self, user: Dict[str, Any]) -> Dict[str, Any]:
            return self.db.add_user(user)
        
        def update_user(self, user_id: str, updates: Dict[str, Any]):
            return self.db.update_user(user_id, updates)
        
        def get_chats(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
            return self.db.get_chats(user_id)
        
        def get_user_chats(self, user_id: str) -> List[Dict[str, Any]]:
            return self.db.get_user_chats(user_id)
        
        def get_chat(self, chat_id: str) -> Optional[Dict[str, Any]]:
            return self.db.get_chat(chat_id)
        
        def find_private_chat(self, user_id1: str, user_id2: str) -> Optional[Dict[str, Any]]:
            return self.db.find_private_chat(user_id1, user_id2)
        
        def add_chat(self, chat: Dict[str, Any]) -> Dict[str, Any]:
            return self.db.add_chat(chat)
        
        def update_chat(self, chat_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
            return self.db.update_chat(chat_id, update_data)
        
        def delete_chat(self, chat_id: str) -> bool:
            return self.db.delete_chat(chat_id)
        
        def get_messages(self, chat_id: str) -> List[Dict[str, Any]]:
            return self.db.get_messages(chat_id)
        
        def get_chat_messages(self, chat_id: str) -> List[Dict[str, Any]]:
            return self.db.get_chat_messages(chat_id)
        
        def add_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
            return self.db.add_message(message)
        
        def update_message(self, message_id: str, content: str) -> bool:
            return self.db.update_message(message_id, content)
        
        def delete_message(self, message_id: str) -> bool:
            return self.db.delete_message(message_id)
        
        def get_templates(self) -> List[Dict[str, Any]]:
            return self.db.get_templates()
        
        def get_template(self, template_id: str) -> Optional[Dict[str, Any]]:
            return self.db.get_template(template_id)
        
        def add_template(self, template: Dict[str, Any]) -> Dict[str, Any]:
            return self.db.add_template(template)
        
        def update_template(self, template_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
            return self.db.update_template(template_id, updates)
        
        def delete_template(self, template_id: str) -> bool:
            return self.db.delete_template(template_id)
        
        def get_collections(self) -> List[Dict[str, Any]]:
            return self.db.get_collections()
        
        def get_collection(self, collection_id: str) -> Optional[Dict[str, Any]]:
            return self.db.get_collection(collection_id)
        
        def add_collection(self, collection: Dict[str, Any]) -> Dict[str, Any]:
            return self.db.add_collection(collection)
        
        def update_collection(self, collection_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
            return self.db.update_collection(collection_id, updates)
        
        def delete_collection(self, collection_id: str) -> bool:
            return self.db.delete_collection(collection_id)
        
        # Tasks (TODOs)
        def get_tasks(self, user_id: Optional[str] = None, list_id: Optional[str] = None) -> List[Dict[str, Any]]:
            return self.db.get_tasks(user_id, list_id)
        
        def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
            return self.db.get_task(task_id)
        
        def add_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
            return self.db.add_task(task)
        
        def update_task(self, task_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
            return self.db.update_task(task_id, updates)
        
        def delete_task(self, task_id: str) -> bool:
            return self.db.delete_task(task_id)
        
        def get_todo_lists(self) -> List[Dict[str, Any]]:
            return self.db.get_todo_lists()
        
        def add_todo_list(self, list_data: Dict[str, Any]) -> Dict[str, Any]:
            return self.db.add_todo_list(list_data)
        
        def get_todo_categories(self) -> List[Dict[str, Any]]:
            return self.db.get_todo_categories()
        
        # Links
        def get_links(self, user_id: Optional[str] = None, list_id: Optional[str] = None, department: Optional[str] = None) -> List[Dict[str, Any]]:
            return self.db.get_links(user_id, list_id, department)
        
        def get_link(self, link_id: str) -> Optional[Dict[str, Any]]:
            return self.db.get_link(link_id)
        
        def add_link(self, link: Dict[str, Any]) -> Dict[str, Any]:
            return self.db.add_link(link)
        
        def update_link(self, link_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
            return self.db.update_link(link_id, updates)
        
        def delete_link(self, link_id: str) -> bool:
            return self.db.delete_link(link_id)
        
        def get_link_lists(self, department: Optional[str] = None) -> List[Dict[str, Any]]:
            return self.db.get_link_lists(department)
        
        def add_link_list(self, list_data: Dict[str, Any]) -> Dict[str, Any]:
            return self.db.add_link_list(list_data)
        
        def update_link_list(self, list_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
            return self.db.update_link_list(list_id, updates)
        
        def delete_link_list(self, list_id: str) -> bool:
            return self.db.delete_link_list(list_id)
        
        # Content Plans
        def get_content_plans(self, user_id: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
            return self.db.get_content_plans(user_id, status)
        
        def get_content_plan(self, plan_id: str) -> Optional[Dict[str, Any]]:
            return self.db.get_content_plan(plan_id)
        
        def add_content_plan(self, plan: Dict[str, Any]) -> Dict[str, Any]:
            return self.db.add_content_plan(plan)
        
        def update_content_plan(self, plan_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
            return self.db.update_content_plan(plan_id, updates)
        
        def delete_content_plan(self, plan_id: str) -> bool:
            return self.db.delete_content_plan(plan_id)
        
        def save_to_disk(self):
            """No-op for PostgreSQL"""
            pass
        
        def reload(self):
            """No-op for PostgreSQL"""
            pass
        
        # Fallback для доступа к data (для совместимости)
        @property
        def data(self):
            """Compatibility property - returns dict-like structure"""
            return {
                'todos': self.get_tasks(),
                'todoLists': self.get_todo_lists(),
                'todoCategories': self.get_todo_categories(),
                'links': self.get_links(),
                'linkLists': self.get_link_lists(),
                'contentPlans': self.get_content_plans()
            }
    
    # Create singleton instance
    db = DatabaseAdapter()

else:
    # Fall back to JSON database
    from database import Database
    db = Database('database.json')

