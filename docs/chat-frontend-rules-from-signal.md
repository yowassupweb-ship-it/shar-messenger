# Правила Работы Фронтенда Чата

Документ фиксирует не код и не копию Signal Desktop, а извлеченные архитектурные правила стабильного фронтенда чата, которые можно безопасно повторить в этом проекте.

Источник референса: Signal Desktop.

## 1. Главный принцип

Фронтенд чата не должен быть страницей, где смешаны:

- роутинг;
- выбор чата;
- загрузка сообщений;
- логика скролла;
- composer state;
- pinned state;
- search state;
- unread state.

Чат должен быть разложен на отдельные домены состояния и отдельные визуальные зоны.

## 2. Каноническая структура экрана

Экран чата всегда состоит из трех независимых зон:

1. Header
2. Timeline
3. Composition Area

Правило:

- header не управляет сообщениями напрямую;
- timeline не должен хранить business state выбора чата;
- composer не должен зависеть от случайных DOM-эффектов таймлайна.

Минимальная структура контейнера:

```ts
type ConversationScreen = {
  selectedConversationId: string | null;
  header: HeaderState;
  timeline: TimelineState;
  composer: ComposerState;
};
```

## 3. Один Source Of Truth Для Активного Чата

Активный чат должен определяться ровно одним полем:

```ts
selectedConversationId: string | null;
```

Правила:

- URL может отражать selectedConversationId;
- localStorage может использоваться только как fallback на первом открытии;
- selectedChat object не является источником истины;
- ручной history.replaceState не должен менять выбор чата в обход state;
- любой переход в чат обязан идти через единый action selectConversation(id).

Запрещено:

- одновременно держать истину в URL, localStorage и React state;
- обновлять selected chat напрямую в нескольких местах;
- выбирать чат через side effects polling-логики.

## 4. Модель Данных Таймлайна

Сообщения в чате нельзя хранить только как массив full objects.

Нужны две сущности:

1. lookup сообщений
2. timeline state конкретного чата

Рекомендуемая схема:

```ts
type MessageLookup = Record<string, Message>;

type ConversationMetrics = {
  newestMessageId?: string;
  oldestMessageId?: string;
  oldestUnseenMessageId?: string;
  totalUnseen: number;
};

type ConversationTimelineState = {
  conversationId: string;
  messageIds: string[];
  pinnedMessageIds: string[];
  loadingState: 'initial' | 'older' | 'newer' | 'idle' | 'error';
  messageChangeCounter: number;
  isNearBottom: boolean | null;
  scrollToMessageId?: string;
  scrollToMessageCounter: number;
  metrics: ConversationMetrics;
};
```

Правила:

- UI рендерит messageIds, а не сырой messages[];
- lookup обновляется независимо;
- timeline знает не только список, но и метрики;
- unread boundary не вычисляется на лету из DOM как единственный источник;
- targeted scroll хранится в state, а не только в ref.

## 5. Таймлайн Это Отдельный Движок

Timeline обязан быть изолированным компонентом со своей моделью поведения.

Он отвечает только за:

- отображение списка сообщений;
- виртуализацию или контролируемый рендер;
- определение near bottom;
- кнопку scroll down;
- unread boundary;
- targeted message scroll;
- догрузку вверх и вниз;
- сохранение viewport anchor.

Timeline не должен отвечать за:

- глобальный routing;
- список чатов;
- черновики composer;
- business-логику авторизации.

## 6. Правило Скролла: Не ScrollTop, А Anchor Snapshot

Главная инварианта:

позиция в чате должна восстанавливаться через anchor message, а не только через scrollTop.

Рекомендуемый snapshot:

```ts
type ViewportSnapshot = {
  anchorMessageId: string | null;
  anchorOffset: number;
  scrollTop: number;
};
```

Правила:

- при уходе из чата сохраняется первый видимый или частично видимый message id;
- вместе с ним сохраняется смещение от верхней границы контейнера;
- при возврате чат пытается восстановиться по anchorMessageId;
- fallback только потом идет на scrollTop;
- если сообщение удалено, берется ближайшее доступное положение;
- если чат пустой, snapshot очищается.

Запрещено:

- считать raw scrollTop достаточным для стабильного restore;
- восстанавливать позицию до окончания primary render списка;
- полагаться только на scrollIntoView последнего сообщения.

## 7. Правило Автоскролла

Новые сообщения не должны всегда тащить пользователя вниз.

Нужны три режима:

1. User is near bottom
2. User reads history
3. User opened targeted message or notification target

Инварианты:

- если пользователь near bottom, новые входящие могут скроллить вниз;
- если пользователь читает историю, новые сообщения не ломают viewport;
- если открыт чат из уведомления, допустим controlled jump;
- если произошла догрузка старых сообщений, viewport визуально сохраняется.

Минимальное правило:

```ts
if (isNearBottom) {
  scrollToBottom();
} else {
  preserveViewportAnchor();
}
```

## 8. Unread Boundary Это Явное Состояние

Непрочитанные не должны строиться из случайных side effects.

Нужны явные поля:

- oldestUnseenMessageId;
- totalUnseen;
- lastReadMessageId или lastReadTimestamp per user.

Правила:

- unread marker должен вычисляться в state layer;
- timeline только визуализирует boundary;
- read state обновляется отдельно от рендера сообщений;
- scrolling не должен автоматически помечать все прочитанным без явного условия.

## 9. Composer State Живет Отдельно По Каждому Чату

Нельзя держать один плоский setNewMessage на всю страницу без conversation scope.

Рекомендуемая модель:

```ts
type ComposerStateByConversation = Record<string, {
  draftText: string;
  attachments: ComposerAttachment[];
  replyToMessageId?: string;
  editMessageId?: string;
  isDisabled?: boolean;
  focusCounter?: number;
  linkPreview?: LinkPreview | null;
}>;
```

Правила:

- draft хранится per conversation;
- reply и edit не должны теряться при переключении чатов;
- composer height хранится независимо от timeline;
- attachments и quote state принадлежат conversation composer state;
- очистка composer происходит только явным action после send или cancel.

## 10. Список Чатов Должен Быть Отдельным Контуром

Conversation list не должен зависеть от DOM состояния активного таймлайна.

Для каждого чата список показывает только summary:

- title;
- avatar;
- last message preview;
- timestamp;
- unread count;
- typing state;
- selected state;
- pinned state;
- archived state.

Правила:

- список чатов не читает messages DOM refs таймлайна;
- выбор чата идет через единый select action;
- search results и archived mode должны быть отдельными row modes, а не набором if внутри одного item;
- список чатов лучше строить на row model, а не на ad hoc JSX ветках.

## 11. Message Item Должен Быть Чистым И Стабильным

Message item обязан получать уже подготовленные props.

Он не должен сам вычислять тяжелую бизнес-логику:

- unread policy;
- targeted selection policy;
- full author resolution;
- conversation-level metrics.

Message item отвечает за:

- rendering bubble;
- metadata;
- context menu;
- reply preview;
- reactions;
- attachment rendering;
- focus target;
- selection visuals.

Правило:

- message item должен быть максимально pure;
- expensive selectors должны выполняться выше;
- ref на DOM-элемент сообщения обязателен для scroll targeting и viewport restore.

## 12. Для Search, Scroll Target И Jump Нужен Единый Механизм

Нельзя отдельно иметь:

- scrollToMessage;
- open from notification;
- jump to unread;
- jump to quoted message.

Нужен один action:

```ts
targetMessage({
  conversationId,
  messageId,
  reason: 'search' | 'notification' | 'quote' | 'unread',
});
```

Правила:

- target message сначала делает чат активным;
- затем гарантирует присутствие сообщения в данных;
- затем увеличивает scrollToMessageCounter;
- timeline уже применяет фактический scroll.

## 13. Пустое Состояние Не Должно Ломать Геометрию

Пустой чат рисуется как overlay внутри timeline area, но:

- не ломает scroll container;
- не участвует в метриках списка сообщений;
- центрируется по доступной области между header и composer.

Правило:

- empty state должен жить рядом с timeline, а не внутри списка message rows.

## 14. Polling, WebSocket И UI Не Должны Смешиваться

Сетевые обновления обязаны попадать в store/domain layer, а не напрямую в JSX page.

Правила:

- transport layer получает события;
- reducers или domain actions обновляют lookup и timeline state;
- UI реагирует на state change, а не на fetch callback напрямую;
- polling не должен переоткрывать чат и не должен сам менять selectedConversationId.

## 15. Все Редкие Режимы Должны Быть Явными Режимами

Не надо скрывать режимы в десятках boolean useState.

Примеры режимов:

- select mode;
- search mode;
- pinned mode;
- archived mode;
- jump target mode;
- loading older messages;
- message detail panel;
- chat info panel.

Правило:

- если режим влияет на layout или interaction, он должен быть описан явно в state model.

## 16. Минимальный Целевой Контракт Для Этого Проекта

Ниже тот минимум, который стоит ввести в текущем проекте.

```ts
type ChatFrontendState = {
  selectedConversationId: string | null;
  messageLookup: Record<string, Message>;
  timelines: Record<string, ConversationTimelineState>;
  composerByConversation: Record<string, ComposerState>;
  viewportByConversation: Record<string, ViewportSnapshot>;
  ui: {
    showChatInfo: boolean;
    showMessageSearch: boolean;
    selectionMode: boolean;
    targetedMessageId?: string;
  };
};
```

## 17. Порядок Рефакторинга Без Полной Переписки Приложения

Шаг 1.

Вынести selectedConversationId в единый источник истины.

Шаг 2.

Вынести timeline state по чатам отдельно от page-level useState.

Шаг 3.

Перевести restore scroll полностью на viewport snapshot по anchor message.

Шаг 4.

Вынести composer state per conversation.

Шаг 5.

Собрать отдельный TimelineController или hook useConversationTimeline.

Шаг 6.

Только после этого решать, нужна ли виртуализация через react-virtuoso или @tanstack/react-virtual.

## 18. Что Не Нужно Тащить Из Signal

Не нужно переносить:

- их transport layer;
- crypto stack;
- их redux ducks один в один;
- их Signal-specific domain entities;
- их конкретные UI-компоненты и стили.

Нужно переносить только:

- инварианты;
- модель состояния;
- декомпозицию экрана;
- lifecycle таймлайна;
- правила scroll, unread и composer.

## 19. Критерий Готовности Хорошего Фронтенда Чата

Чат считается архитектурно стабилизированным, когда выполняются все условия:

1. Открытие чата всегда детерминировано одним selectedConversationId.
2. Переключение между чатами не теряет draft, reply и edit state.
3. Возврат в чат восстанавливает viewport по anchor snapshot.
4. Новые сообщения не сбрасывают пользователя вниз, если он читает историю.
5. Notification jump, search jump и quote jump используют один target-message pipeline.
6. Empty state не ломает layout.
7. Message list не зависит от случайных side effects page компонента.
8. Timeline можно тестировать отдельно от header и composer.

## 20. Практическое Решение Для Этого Репозитория

Для этого проекта оптимальная цель не копировать Signal, а сделать упрощенный Signal-подобный frontend contract:

- один selectedConversationId;
- один timeline engine на чат;
- composer state per chat;
- viewport snapshot per chat;
- target-message pipeline;
- затем при необходимости заменить сам список сообщений на виртуализированный.

Это даст почти весь выигрыш стабильности без полной миграции приложения.