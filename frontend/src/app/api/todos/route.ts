import { NextRequest, NextResponse } from 'next/server';
import { readJsonFile, writeJsonFile, generateId } from '@/lib/dataStore';

console.log('=== TODOS ROUTE LOADED ===');

export interface Comment {
  id: string;
  todoId: string;
  authorId: string;
  authorName: string;
  content: string;
  mentions: string[];
  createdAt: string;
}

export interface TodoCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  order: number;
}

export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  status?: 'todo' | 'in-progress' | 'pending' | 'review' | 'cancelled' | 'stuck';
  reviewComment?: string;
  dueDate?: string;
  listId: string;
  categoryId?: string;
  tags: string[];
  assignedById?: string;
  assignedBy?: string;
  assignedToId?: string;
  assignedTo?: string;
  linkId?: string;
  linkUrl?: string;
  linkTitle?: string;
  addToCalendar?: boolean;
  calendarEventId?: string;
  comments?: Comment[];
  createdAt: string;
  updatedAt: string;
  order: number;
  archived?: boolean;
}

export interface TodoList {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: string;
  order: number;
  defaultExecutorId?: string;
  defaultCustomerId?: string;
  defaultAddToCalendar?: boolean;
  creatorId?: string;
  allowedUsers?: string[];
}

interface TodosData {
  todos: Todo[];
  lists: TodoList[];
  categories: TodoCategory[];
}

interface TelegramSettings {
  botToken: string;
  enabled: boolean;
}

interface Person {
  id: string;
  name: string;
  telegramId?: string;
  telegramUsername?: string;
  role: 'executor' | 'customer';
}

interface PeopleData {
  people: Person[];
}

// Функция отправки уведомления в Telegram с кнопкой
async function sendTelegramNotification(chatId: string, message: string, buttonUrl?: string, buttonText?: string) {
  console.log('[Telegram] Starting sendTelegramNotification to chatId:', chatId);
  
  try {
    const settings = readJsonFile<TelegramSettings>('telegram-settings.json', { botToken: '', enabled: false });
    console.log('[Telegram] Settings loaded:', { enabled: settings.enabled, hasToken: !!settings.botToken });
    
    if (!settings.enabled || !settings.botToken) {
      console.log('[Telegram] Notifications disabled or not configured');
      return;
    }
    
    const url = `https://api.telegram.org/bot${settings.botToken}/sendMessage`;
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    };
    
    // Добавляем inline кнопку если указана
    if (buttonUrl && buttonText) {
      body.reply_markup = {
        inline_keyboard: [[
          { text: buttonText, url: buttonUrl }
        ]]
      };
    }
    
    console.log('[Telegram] Sending request to:', url.replace(settings.botToken, 'TOKEN_HIDDEN'));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    console.log('[Telegram] Response status:', response.status);
    
    const result = await response.json();
    console.log('[Telegram] Response body:', JSON.stringify(result));
    
    if (!result.ok) {
      console.error('[Telegram] Error sending message:', result.description);
    } else {
      console.log('[Telegram] Message sent successfully to', chatId);
    }
  } catch (error) {
    console.error('[Telegram] Error caught:', error);
  }
}

// Маркетинговые категории по умолчанию
const DEFAULT_CATEGORIES: TodoCategory[] = [
  { id: 'seo', name: 'SEO', color: '#22c55e', icon: 'search', order: 0 },
  { id: 'content', name: 'Контент', color: '#3b82f6', icon: 'file-text', order: 1 },
  { id: 'advertising', name: 'Реклама', color: '#f59e0b', icon: 'megaphone', order: 2 },
  { id: 'analytics', name: 'Аналитика', color: '#8b5cf6', icon: 'bar-chart', order: 3 },
  { id: 'social', name: 'Соцсети', color: '#ec4899', icon: 'share-2', order: 4 },
  { id: 'email', name: 'Email', color: '#06b6d4', icon: 'mail', order: 5 },
  { id: 'design', name: 'Дизайн', color: '#ef4444', icon: 'palette', order: 6 },
  { id: 'development', name: 'Разработка', color: '#6366f1', icon: 'code', order: 7 },
];

const DEFAULT_DATA: TodosData = {
  todos: [],
  lists: [
    {
      id: 'work',
      name: 'Работа',
      color: '#f59e0b',
      icon: 'briefcase',
      createdAt: new Date().toISOString(),
      order: 0
    },
    {
      id: 'tz-list',
      name: 'Техническое задание',
      color: '#8b5cf6',
      icon: 'target',
      createdAt: new Date().toISOString(),
      order: 1
    }
  ],
  categories: DEFAULT_CATEGORIES
};

// GET - получить все задачи и списки
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const listId = searchParams.get('listId');
    const completed = searchParams.get('completed');
    const userId = searchParams.get('userId');
    
    const data = readJsonFile<TodosData>('todos.json', DEFAULT_DATA);
    
    // Убедимся, что категории существуют
    if (!data.categories || data.categories.length === 0) {
      data.categories = DEFAULT_CATEGORIES;
      writeJsonFile('todos.json', data);
    }
    
    let todos = data.todos;
    let lists = data.lists;
    
    // Загружаем пользователя для проверки роли
    let currentUser: any = null;
    if (userId) {
      try {
        const dbPath = require('path').resolve(process.cwd(), '..', 'backend', 'database.json');
        const dbData = JSON.parse(require('fs').readFileSync(dbPath, 'utf-8'));
        currentUser = dbData.users?.find((u: any) => u.id === userId);
      } catch (e) {
        console.log('Could not load user from backend DB');
      }
    }
    
    // Суперадмин (canSeeAllTasks) видит ВСЕ задачи
    const canSeeAll = currentUser?.canSeeAllTasks === true;
    
    // Фильтрация списков по userId - показываем только те где пользователь creator или в allowedUsers
    if (userId && !canSeeAll) {
      lists = lists.filter(list => {
        // Старые списки без creatorId показываем всем
        if (!list.creatorId) return true;
        // Если пользователь создатель
        if (list.creatorId === userId) return true;
        // Если пользователь в списке разрешенных
        if (list.allowedUsers && list.allowedUsers.includes(userId)) return true;
        return false;
      });
      
      // Фильтрация задач по userId - показываем только доступные пользователю
      const allowedListIds = new Set(lists.map(l => l.id));
      todos = todos.filter(todo => {
        // Задача в доступном списке
        if (allowedListIds.has(todo.listId)) return true;
        // Пользователь - исполнитель
        if (todo.assignedToId === userId) return true;
        // Пользователь - автор
        if (todo.assignedById === userId) return true;
        return false;
      });
    }
    
    // Фильтрация по списку
    if (listId) {
      todos = todos.filter(t => t.listId === listId);
    }
    
    // Фильтрация по статусу
    if (completed !== null) {
      const isCompleted = completed === 'true';
      todos = todos.filter(t => t.completed === isCompleted);
    }
    
    // Сортировка по order и дате создания
    todos.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.priority !== b.priority) {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.order - b.order;
    });
    
    return NextResponse.json({
      todos,
      lists: lists.sort((a, b) => a.order - b.order),
      categories: data.categories.sort((a, b) => a.order - b.order)
    });
  } catch (error) {
    console.error('Error reading todos:', error);
    return NextResponse.json({ error: 'Failed to read todos' }, { status: 500 });
  }
}

// POST - создать задачу или список
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, creatorUserId, ...itemData } = body;
    
    console.log('[POST /api/todos] Received:', { type, assignedToId: itemData.assignedToId, priority: itemData.priority, creatorUserId });
    
    const data = readJsonFile<TodosData>('todos.json', DEFAULT_DATA);
    
    // Проверка роли пользователя для создания задач
    if (type === 'todo' && creatorUserId && itemData.assignedToId) {
      try {
        const backendDbPath = path.join(process.cwd(), '..', 'backend', 'database.json');
        const backendDb = JSON.parse(fs.readFileSync(backendDbPath, 'utf-8'));
        const creator = backendDb.users?.find((u: any) => u.id === creatorUserId);
        
        // Если пользователь - исполнитель (executor), он может ставить задачи только себе
        if (creator?.todoRole === 'executor' && itemData.assignedToId !== creatorUserId) {
          // Находим people ID пользователя-создателя
          const peopleData = readJsonFile<PeopleData>('todos-people.json', { people: [] });
          const creatorPerson = peopleData.people.find(p => p.userId === creatorUserId);
          
          if (!creatorPerson || itemData.assignedToId !== creatorPerson.id) {
            return NextResponse.json({ 
              error: 'Исполнитель может ставить задачи только себе' 
            }, { status: 403 });
          }
        }
      } catch (err) {
        console.error('[POST /api/todos] Error checking user role:', err);
      }
    }
    
    if (type === 'category') {
      const newCategory: TodoCategory = {
        id: generateId(),
        name: itemData.name || 'Новая категория',
        color: itemData.color || '#6366f1',
        icon: itemData.icon || 'tag',
        order: data.categories?.length || 0
      };
      
      if (!data.categories) data.categories = [];
      data.categories.push(newCategory);
      writeJsonFile('todos.json', data);
      
      return NextResponse.json(newCategory);
    } else if (type === 'list') {
      const newList: TodoList = {
        id: generateId(),
        name: itemData.name || 'Новый список',
        color: itemData.color || '#6366f1',
        icon: itemData.icon || 'folder',
        createdAt: new Date().toISOString(),
        order: data.lists.length,
        creatorId: itemData.creatorId,
        allowedUsers: itemData.allowedUsers || []
      };
      
      data.lists.push(newList);
      writeJsonFile('todos.json', data);
      
      return NextResponse.json(newList);
    } else {
      // Получаем список для автоназначения исполнителя/заказчика
      const targetList = data.lists.find(l => l.id === (itemData.listId || 'work'));
      const peopleData = readJsonFile<PeopleData>('todos-people.json', { people: [] });
      
      // Автозаполнение исполнителя из настроек списка
      let finalAssignedToId = itemData.assignedToId;
      let finalAssignedTo = itemData.assignedTo || '';
      if (!finalAssignedToId && targetList?.defaultExecutorId) {
        const defaultExecutor = peopleData.people.find(p => p.id === targetList.defaultExecutorId);
        if (defaultExecutor) {
          finalAssignedToId = defaultExecutor.id;
          finalAssignedTo = defaultExecutor.name;
        }
      }
      
      // Автозаполнение заказчика из настроек списка
      let finalAssignedById = itemData.assignedById;
      let finalAssignedBy = itemData.assignedBy || '';
      if (!finalAssignedById && targetList?.defaultCustomerId) {
        const defaultCustomer = peopleData.people.find(p => p.id === targetList.defaultCustomerId);
        if (defaultCustomer) {
          finalAssignedById = defaultCustomer.id;
          finalAssignedBy = defaultCustomer.name;
        }
      }
      
      // Автозаполнение добавления на календарь из настроек списка
      const finalAddToCalendar = itemData.addToCalendar !== undefined 
        ? itemData.addToCalendar 
        : (targetList?.defaultAddToCalendar || false);
      
      const newTodo: Todo = {
        id: generateId(),
        title: itemData.title || '',
        description: itemData.description || '',
        completed: false,
        priority: itemData.priority || 'medium',
        status: itemData.status || 'pending', // Дефолтный статус - "В ожидании"
        dueDate: itemData.dueDate,
        listId: itemData.listId || 'work',
        categoryId: itemData.categoryId || undefined,
        tags: itemData.tags || [],
        assignedById: finalAssignedById || undefined,
        assignedBy: finalAssignedBy,
        assignedToId: finalAssignedToId || undefined,
        assignedTo: finalAssignedTo,
        addToCalendar: finalAddToCalendar,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        order: data.todos.filter(t => t.listId === (itemData.listId || 'work')).length
      };
      
      data.todos.push(newTodo);
      writeJsonFile('todos.json', data);
      
      // Отправка уведомления в Telegram исполнителю при создании задачи
      if (newTodo.assignedToId) {
        const executor = peopleData.people.find(p => p.id === newTodo.assignedToId);
        
        console.log('[Telegram] Trying to send notification:', {
          assignedToId: newTodo.assignedToId,
          executor: executor?.name,
          telegramId: executor?.telegramId,
          priority: newTodo.priority
        });
        
        if (executor?.telegramId) {
          const list = data.lists.find(l => l.id === newTodo.listId);
          const category = data.categories?.find(c => c.id === newTodo.categoryId);
          const priorityEmoji: Record<string, string> = { low: '🟢', medium: '🟡', high: '🔴' };
          const priorityText: Record<string, string> = { low: 'Низкий', medium: 'Средний', high: 'Высокий' };
          const taskUrl = `https://tools.connecting-server.ru/todos?task=${newTodo.id}`;
          
          const message = `📋 <b>НОВАЯ ЗАДАЧА</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📝 <b>${newTodo.title}</b>\n` +
            (newTodo.description ? `\n<i>${newTodo.description}</i>\n` : '') +
            `\n━━━━━━━━━━━━━━━━━━━━━\n` +
            `${priorityEmoji[newTodo.priority]} <b>Приоритет:</b> ${priorityText[newTodo.priority]}\n` +
            `📁 <b>Список:</b> ${list?.name || 'Работа'}\n` +
            (category ? `🏷 <b>Категория:</b> ${category.name}\n` : '') +
            (newTodo.assignedBy ? `👤 <b>Заказчик:</b> ${newTodo.assignedBy}\n` : '') +
            (newTodo.dueDate ? `📅 <b>Срок:</b> ${new Date(newTodo.dueDate).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })}\n` : '');
          
          // Отправляем уведомление с кнопкой
          await sendTelegramNotification(executor.telegramId, message, taskUrl, '🔗 Открыть задачу');
        }
      }
      
      return NextResponse.json(newTodo);
    }
  } catch (error) {
    console.error('Error creating todo:', error);
    return NextResponse.json({ error: 'Failed to create todo' }, { status: 500 });
  }
}

// PUT - обновить задачу или список
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, type, ...updates } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    
    const data = readJsonFile<TodosData>('todos.json', DEFAULT_DATA);
    
    if (type === 'category') {
      if (!data.categories) data.categories = DEFAULT_CATEGORIES;
      const catIndex = data.categories.findIndex(c => c.id === id);
      if (catIndex === -1) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      }
      
      data.categories[catIndex] = { ...data.categories[catIndex], ...updates };
      writeJsonFile('todos.json', data);
      
      return NextResponse.json(data.categories[catIndex]);
    } else if (type === 'list') {
      const listIndex = data.lists.findIndex(l => l.id === id);
      if (listIndex === -1) {
        return NextResponse.json({ error: 'List not found' }, { status: 404 });
      }
      
      data.lists[listIndex] = { ...data.lists[listIndex], ...updates };
      writeJsonFile('todos.json', data);
      
      return NextResponse.json(data.lists[listIndex]);
    } else {
      const todoIndex = data.todos.findIndex(t => t.id === id);
      if (todoIndex === -1) {
        return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
      }
      
      const oldTodo = data.todos[todoIndex];
      const updatedTodo = {
        ...oldTodo,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      data.todos[todoIndex] = updatedTodo;
      
      // Если назначен новый исполнитель - автоматически добавляем его в allowedUsers списка
      if (updates.assignedToId && updatedTodo.listId) {
        const listIndex = data.lists.findIndex(l => l.id === updatedTodo.listId);
        if (listIndex !== -1) {
          const list = data.lists[listIndex];
          // Инициализируем allowedUsers если его нет
          if (!list.allowedUsers) {
            list.allowedUsers = [];
          }
          // Добавляем исполнителя если его еще нет
          if (!list.allowedUsers.includes(updates.assignedToId)) {
            list.allowedUsers.push(updates.assignedToId);
            console.log(`[PUT] Added user ${updates.assignedToId} to allowedUsers of list ${list.name}`);
          }
        }
      }
      
      writeJsonFile('todos.json', data);
      
      // Отправка уведомления при назначении исполнителя (если поменялся)
      const isNewAssignee = updates.assignedToId && updates.assignedToId !== oldTodo.assignedToId;
      
      console.log('[PUT] Checking notification:', { 
        isNewAssignee, 
        oldAssignee: oldTodo.assignedToId, 
        newAssignee: updates.assignedToId 
      });
      
      const peopleData = readJsonFile<PeopleData>('todos-people.json', { people: [] });
      const list = data.lists.find(l => l.id === updatedTodo.listId);
      const category = data.categories?.find(c => c.id === updatedTodo.categoryId);
      const priorityEmoji: Record<string, string> = { low: '🟢', medium: '🟡', high: '🔴' };
      const priorityText: Record<string, string> = { low: 'Низкий', medium: 'Средний', high: 'Высокий' };
      const statusEmoji: Record<string, string> = { 'todo': '⚪️', 'pending': '🟠', 'in-progress': '🔵', 'review': '🟢', 'cancelled': '❌', 'stuck': '⚠️' };
      const statusText: Record<string, string> = { 'todo': 'К выполнению', 'pending': 'В ожидании', 'in-progress': 'В работе', 'review': 'Готово к проверке', 'cancelled': 'Отменена', 'stuck': 'Застряла' };
      const taskUrl = `https://tools.connecting-server.ru/todos?task=${updatedTodo.id}`;
      
      // Уведомление исполнителю при назначении
      if (isNewAssignee) {
        const executor = peopleData.people.find(p => p.id === updates.assignedToId);
        
        console.log('[PUT] Executor found:', executor?.name, 'telegramId:', executor?.telegramId);
        
        if (executor?.telegramId) {
          const assignerName = updatedTodo.assignedBy || 'Руководитель';
          const message = `📋 <b>НАЗНАЧЕНА ЗАДАЧА</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📝 <b>${updatedTodo.title}</b>\n` +
            (updatedTodo.description ? `\n<i>${updatedTodo.description}</i>\n` : '') +
            `\n━━━━━━━━━━━━━━━━━━━━━\n` +
            `${priorityEmoji[updatedTodo.priority]} <b>Приоритет:</b> ${priorityText[updatedTodo.priority]}\n` +
            `${statusEmoji[updatedTodo.status || 'pending']} <b>Статус:</b> ${statusText[updatedTodo.status || 'pending']}\n` +
            `📁 <b>Список:</b> ${list?.name || 'Работа'}\n` +
            (category ? `🏷 <b>Категория:</b> ${category.name}\n` : '') +
            `👤 <b>Заказчик:</b> ${assignerName}\n` +
            (updatedTodo.dueDate ? `📅 <b>Дедлайн:</b> ${new Date(updatedTodo.dueDate).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })}\n` : '');
          
          await sendTelegramNotification(executor.telegramId, message, taskUrl, '🔗 Открыть задачу');
        }
      }
      
      // Уведомление руководителю при статусе "Ожидает проверки"
      const isStatusChangedToReview = updates.status === 'review' && oldTodo.status !== 'review';
      
      if (isStatusChangedToReview && updatedTodo.assignedById) {
        const manager = peopleData.people.find(p => p.id === updatedTodo.assignedById);
        
        console.log('[PUT] Review status - Manager:', manager?.name, 'telegramId:', manager?.telegramId);
        
        if (manager?.telegramId) {
          const executor = peopleData.people.find(p => p.id === updatedTodo.assignedToId);
          const message = `✅ <b>ЗАДАЧА ГОТОВА К ПРОВЕРКЕ</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📝 <b>${updatedTodo.title}</b>\n` +
            (updatedTodo.description ? `\n<i>${updatedTodo.description}</i>\n` : '') +
            `\n━━━━━━━━━━━━━━━━━━━━━\n` +
            `${priorityEmoji[updatedTodo.priority]} <b>Приоритет:</b> ${priorityText[updatedTodo.priority]}\n` +
            `📁 <b>Список:</b> ${list?.name || 'Работа'}\n` +
            (category ? `🏷 <b>Категория:</b> ${category.name}\n` : '') +
            (executor ? `👷 <b>Исполнитель:</b> ${executor.name}\n` : '') +
            (updatedTodo.reviewComment ? `\n💬 <b>Комментарий исполнителя:</b>\n<i>${updatedTodo.reviewComment}</i>\n` : '');
          
          await sendTelegramNotification(manager.telegramId, message, taskUrl, '🔗 Проверить задачу');
        }
      }
      
      return NextResponse.json(updatedTodo);
    }
  } catch (error) {
    console.error('Error updating todo:', error);
    return NextResponse.json({ error: 'Failed to update todo' }, { status: 500 });
  }
}

// DELETE - удалить задачу или список
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    
    const data = readJsonFile<TodosData>('todos.json', DEFAULT_DATA);
    
    if (type === 'category') {
      if (!data.categories) data.categories = DEFAULT_CATEGORIES;
      data.categories = data.categories.filter(c => c.id !== id);
      // Убираем категорию из задач
      data.todos = data.todos.map(t => 
        t.categoryId === id ? { ...t, categoryId: undefined } : t
      );
      writeJsonFile('todos.json', data);
      return NextResponse.json({ success: true });
    } else if (type === 'list') {
      data.lists = data.lists.filter(l => l.id !== id);
      // Перемещаем задачи из удалённого списка в первый доступный
      const firstList = data.lists[0]?.id || 'work';
      data.todos = data.todos.map(t => 
        t.listId === id ? { ...t, listId: firstList } : t
      );
    } else {
      data.todos = data.todos.filter(t => t.id !== id);
    }
    
    writeJsonFile('todos.json', data);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting todo:', error);
    return NextResponse.json({ error: 'Failed to delete todo' }, { status: 500 });
  }
}
