// 用户类型定义
export interface User {
  id: string;
  name: string;
  avatar?: string;
  email: string;
  department: string;
  position: string;
  phone?: string;
  status: 'online' | 'offline' | 'busy';
}

// 消息类型定义
export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: 'text' | 'image' | 'file';
  timestamp: Date;
  isRead: boolean;
}

// 聊天会话类型定义
export interface Chat {
  id: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  type: 'private' | 'group';
  name?: string; // 群聊名称
  avatar?: string; // 群聊头像
}

// 组织架构类型定义
export interface Department {
  id: string;
  name: string;
  parentId?: string;
  children?: Department[];
  members: User[];
}

// 导航类型定义
export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  Chat: { chatId: string; userName: string };
  Profile: { userId: string };
};

export type TabParamList = {
  Messages: undefined;
  Contacts: undefined;
};