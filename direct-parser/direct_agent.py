"""
Direct Parser Agent - Локальный агент для парсинга Яндекс.Директ
Работает на локальной машине, получает задачи от API и отправляет результаты

Использование:
  python direct_agent.py --api-url https://tools.connecting-server.ru

Агент:
1. Подключается к API и проверяет наличие задач
2. При наличии задачи - запускает парсинг с Selenium
3. Отправляет результаты обратно в API
4. Позволяет решать капчу вручную (без headless режима)
"""

import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime
from typing import Optional, Dict, List, Any

import requests

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

# Импортируем парсер из существующего файла
try:
    from ad_parser import YandexAdParser
except ImportError:
    logger.error("Не найден модуль ad_parser. Убедитесь что файл ad_parser.py существует")
    sys.exit(1)


class DirectParserAgent:
    """Агент для связи с API и запуска парсинга"""
    
    def __init__(self, api_url: str, poll_interval: int = 10):
        self.api_url = api_url.rstrip('/')
        self.poll_interval = poll_interval
        self.is_running = False
        self.current_task_id: Optional[str] = None
        self.parser: Optional[YandexAdParser] = None
        
    def check_api_connection(self) -> bool:
        """Проверка подключения к API"""
        try:
            response = requests.get(f"{self.api_url}/api/direct-parser/agent/ping", timeout=10)
            if response.status_code == 200:
                logger.info(f"✓ Подключение к API установлено: {self.api_url}")
                return True
            else:
                logger.error(f"✗ API вернул код {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            logger.error(f"✗ Ошибка подключения к API: {e}")
            return False
    
    def get_pending_task(self) -> Optional[Dict]:
        """Получение задачи на выполнение"""
        try:
            response = requests.get(
                f"{self.api_url}/api/direct-parser/agent/task",
                timeout=10
            )
            if response.status_code == 200:
                task = response.json()
                if task and task.get('id'):
                    return task
            return None
        except requests.exceptions.RequestException as e:
            logger.debug(f"Ошибка получения задачи: {e}")
            return None
    
    def update_task_status(self, task_id: str, status: str, message: str = "", progress: int = 0):
        """Обновление статуса задачи"""
        try:
            requests.post(
                f"{self.api_url}/api/direct-parser/agent/task/{task_id}/status",
                json={
                    "status": status,
                    "message": message,
                    "progress": progress
                },
                timeout=10
            )
        except requests.exceptions.RequestException as e:
            logger.warning(f"Не удалось обновить статус: {e}")
    
    def submit_results(self, task_id: str, results: List[Dict]):
        """Отправка результатов парсинга"""
        try:
            response = requests.post(
                f"{self.api_url}/api/direct-parser/agent/task/{task_id}/results",
                json={
                    "results": results,
                    "completed_at": datetime.now().isoformat()
                },
                timeout=30
            )
            if response.status_code == 200:
                logger.info(f"✓ Результаты отправлены: {len(results)} объявлений")
                return True
            else:
                logger.error(f"✗ Ошибка отправки результатов: {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            logger.error(f"✗ Ошибка отправки результатов: {e}")
            return False
    
    def status_callback(self, message: str):
        """Колбэк для обновления статуса из парсера"""
        logger.info(f"[Парсер] {message}")
        if self.current_task_id:
            self.update_task_status(self.current_task_id, "running", message)
    
    def execute_task(self, task: Dict):
        """Выполнение задачи парсинга"""
        self.current_task_id = task['id']
        queries = task.get('queries', [])
        max_pages = task.get('max_pages', 2)
        headless = task.get('headless', False)  # По умолчанию НЕ headless для капчи
        
        logger.info(f"=" * 50)
        logger.info(f"Начало задачи {task['id']}")
        logger.info(f"Запросы: {queries}")
        logger.info(f"Макс. страниц: {max_pages}")
        logger.info(f"Headless: {headless}")
        logger.info(f"=" * 50)
        
        self.update_task_status(task['id'], "running", "Запуск парсера...")
        
        try:
            # Создаём парсер
            self.parser = YandexAdParser(
                headless=headless,
                status_callback=self.status_callback
            )
            
            # Запускаем браузер
            self.parser.start_browser()
            
            all_results = []
            
            for idx, query in enumerate(queries, 1):
                self.update_task_status(
                    task['id'], 
                    "running", 
                    f"Парсинг запроса {idx}/{len(queries)}: {query}",
                    progress=int((idx - 1) / len(queries) * 100)
                )
                
                # Парсим запрос
                results = self.parser.parse_query(query, max_pages=max_pages)
                all_results.extend(results)
                
                logger.info(f"Запрос '{query}': найдено {len(results)} объявлений")
            
            # Закрываем браузер
            self.parser.close()
            
            # Отправляем результаты
            self.update_task_status(task['id'], "completed", f"Готово: {len(all_results)} объявлений", 100)
            self.submit_results(task['id'], all_results)
            
            logger.info(f"✓ Задача {task['id']} выполнена: {len(all_results)} объявлений")
            
        except Exception as e:
            logger.error(f"✗ Ошибка выполнения задачи: {e}")
            self.update_task_status(task['id'], "failed", str(e))
            if self.parser:
                try:
                    self.parser.close()
                except:
                    pass
        finally:
            self.current_task_id = None
            self.parser = None
    
    def run(self):
        """Основной цикл агента"""
        logger.info("=" * 60)
        logger.info("     DIRECT PARSER AGENT")
        logger.info("=" * 60)
        logger.info(f"API URL: {self.api_url}")
        logger.info(f"Интервал опроса: {self.poll_interval} сек")
        logger.info("=" * 60)
        
        # Проверяем подключение
        if not self.check_api_connection():
            logger.error("Не удалось подключиться к API. Проверьте URL и доступность сервера.")
            return
        
        self.is_running = True
        logger.info("Агент запущен. Ожидание задач... (Ctrl+C для выхода)")
        
        try:
            while self.is_running:
                # Проверяем наличие задачи
                task = self.get_pending_task()
                
                if task:
                    self.execute_task(task)
                else:
                    # Ждём перед следующей проверкой
                    time.sleep(self.poll_interval)
                    
        except KeyboardInterrupt:
            logger.info("\nОстановка агента...")
            self.is_running = False
        
        logger.info("Агент остановлен")
    
    def run_single_task(self, queries: List[str], max_pages: int = 2, headless: bool = False):
        """Выполнение одиночной задачи без опроса API (для тестирования)"""
        task = {
            'id': f'local_{int(time.time())}',
            'queries': queries,
            'max_pages': max_pages,
            'headless': headless
        }
        self.execute_task(task)


def main():
    parser = argparse.ArgumentParser(
        description='Direct Parser Agent - Локальный агент для парсинга Яндекс.Директ',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Примеры использования:

  # Подключение к API и ожидание задач
  python direct_agent.py --api-url https://tools.connecting-server.ru

  # Локальный тест без API
  python direct_agent.py --test --queries "туры в турцию" "туры в египет"

  # Headless режим (без GUI)
  python direct_agent.py --api-url https://tools.connecting-server.ru --headless
        """
    )
    
    parser.add_argument(
        '--api-url',
        type=str,
        default='http://localhost:8000',
        help='URL API сервера (default: http://localhost:8000)'
    )
    
    parser.add_argument(
        '--poll-interval',
        type=int,
        default=10,
        help='Интервал опроса API в секундах (default: 10)'
    )
    
    parser.add_argument(
        '--test',
        action='store_true',
        help='Локальный тест без подключения к API'
    )
    
    parser.add_argument(
        '--queries',
        nargs='+',
        help='Поисковые запросы для тестового режима'
    )
    
    parser.add_argument(
        '--max-pages',
        type=int,
        default=2,
        help='Максимум страниц для парсинга (default: 2)'
    )
    
    parser.add_argument(
        '--headless',
        action='store_true',
        help='Запуск в headless режиме (без GUI)'
    )
    
    args = parser.parse_args()
    
    agent = DirectParserAgent(
        api_url=args.api_url,
        poll_interval=args.poll_interval
    )
    
    if args.test:
        if not args.queries:
            print("Для тестового режима укажите --queries")
            sys.exit(1)
        agent.run_single_task(
            queries=args.queries,
            max_pages=args.max_pages,
            headless=args.headless
        )
    else:
        agent.run()


if __name__ == '__main__':
    main()
