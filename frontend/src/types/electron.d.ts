export interface NotificationData {
  senderName?: string;
  title?: string;
  subtitle?: string;
  chatName?: string;
  message: string;
  avatar?: string;
  timestamp?: string | number;
  badge?: number;
  chatId?: string;
  url?: string;
  kind?: 'message' | 'task' | 'event' | 'system';
}

export interface WindowControls {
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<boolean>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  reload: () => Promise<void>;
  zoomIn: () => Promise<void>;
  zoomOut: () => Promise<void>;
  setZoom: (factor: number) => Promise<void>;
  getZoom: () => Promise<number>;
  onMaximizedChanged: (callback: (isMaximized: boolean) => void) => () => void;
}

export interface SharDesktop {
  platform: string;
  assets: {
    logoSrc: string;
  };
  openExternal: (url: string) => Promise<void>;
  windowControls: WindowControls;
  showNotification: (data: NotificationData) => Promise<void>;
  onOpenChat: (callback: (chatId: string) => void) => () => void;
  onOpenRoute: (callback: (url: string) => void) => () => void;
}

declare global {
  interface Window {
    sharDesktop?: SharDesktop;
  }
}

export {};
