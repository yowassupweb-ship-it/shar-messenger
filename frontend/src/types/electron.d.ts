export interface NotificationData {
  senderName: string;
  chatName?: string;
  message: string;
  avatar?: string;
  timestamp?: string | number;
  badge?: number;
  chatId?: string;
}

export interface WindowControls {
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<boolean>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
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
}

declare global {
  interface Window {
    sharDesktop?: SharDesktop;
  }
}

export {};
