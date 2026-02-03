import requests
from typing import Optional
from db_adapter import db

class TelegramNotifier:
    """Отправка уведомлений в Telegram"""
    
    def __init__(self):
        self.bot_token: Optional[str] = None
        self.chat_id: Optional[str] = None
        self.enabled: bool = False
        self._load_settings()
    
    def _load_settings(self):
        """Загрузка настроек из БД"""
        settings = db.get_settings()
        self.bot_token = settings.get('telegramBotToken')
        self.chat_id = settings.get('telegramChatId')
        self.enabled = settings.get('telegramNotifications', False)
    
    def send_notification(self, message: str, parse_mode: str = 'HTML') -> bool:
        """
        Отправить уведомление в Telegram
        
        Args:
            message: Текст сообщения
            parse_mode: Режим парсинга (HTML, Markdown)
        
        Returns:
            bool: True если отправка успешна
        """
        self._load_settings()  # Перезагружаем настройки перед каждой отправкой
        
        if not self.enabled or not self.bot_token or not self.chat_id:
            print(f"Telegram notifications disabled or not configured")
            return False
        
        url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
        
        payload = {
            'chat_id': self.chat_id,
            'text': message,
            'parse_mode': parse_mode
        }
        
        try:
            response = requests.post(url, json=payload, timeout=10)
            
            if response.status_code == 200:
                print(f"Telegram notification sent: {message[:50]}...")
                return True
            else:
                print(f"Telegram API error: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"Failed to send Telegram notification: {str(e)}")
            return False
    
    def notify_log(self, log_type: str, message: str, status: str = 'info'):
        """
        Отправить уведомление о записи в логе
        
        Args:
            log_type: Тип лога (parser, feed, system и т.д.)
            message: Сообщение
            status: Статус (success, error, warning, info)
        """
        # Перезагружаем настройки перед проверкой
        self._load_settings()
        
        if not self.enabled:
            print(f"Telegram notify_log skipped: notifications disabled")
            return
        
        # Иконки для разных типов
        icons = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        }
        
        # Форматируем сообщение
        icon = icons.get(status, 'ℹ️')
        formatted_message = f"{icon} <b>{log_type.upper()}</b>\n{message}"
        
        self.send_notification(formatted_message)
    
    def notify_parser_complete(self, source_name: str, items_count: int):
        """Уведомление о завершении парсинга"""
        message = f"🔍 <b>Парсинг завершен</b>\n\n" \
                 f"Источник: {source_name}\n" \
                 f"Получено товаров: {items_count}"
        self.send_notification(message)
    
    def notify_feed_created(self, feed_name: str):
        """Уведомление о создании фида"""
        message = f"📝 <b>Создан новый фид</b>\n\n" \
                 f"Название: {feed_name}"
        self.send_notification(message)
    
    def notify_error(self, error_type: str, error_message: str):
        """Уведомление об ошибке"""
        message = f"❌ <b>Ошибка: {error_type}</b>\n\n" \
                 f"{error_message}"
        self.send_notification(message)

# Глобальный экземпляр
telegram = TelegramNotifier()
