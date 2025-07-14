import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User, Chat, Message } from '@/types';
import { dataService } from '@/services';

// 应用状态接口
export interface AppState {
  // 用户相关
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // 聊天相关
  chats: Chat[];
  activeChat: Chat | null;
  messages: { [chatId: string]: Message[] };
  
  // 应用状态
  networkStatus: 'online' | 'offline';
  theme: 'light' | 'dark';
  notifications: boolean;
  
  // 错误处理
  error: string | null;
}

// 初始状态
const initialState: AppState = {
  currentUser: null,
  isAuthenticated: false,
  isLoading: true,
  chats: [],
  activeChat: null,
  messages: {},
  networkStatus: 'online',
  theme: 'light',
  notifications: true,
  error: null,
};

// Action类型
export type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_AUTHENTICATED'; payload: boolean }
  | { type: 'SET_CHATS'; payload: Chat[] }
  | { type: 'SET_ACTIVE_CHAT'; payload: Chat | null }
  | { type: 'ADD_MESSAGE'; payload: { chatId: string; message: Message } }
  | { type: 'SET_MESSAGES'; payload: { chatId: string; messages: Message[] } }
  | { type: 'SET_NETWORK_STATUS'; payload: 'online' | 'offline' }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_NOTIFICATIONS'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'LOGOUT' };

// Reducer函数
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_USER':
      return { ...state, currentUser: action.payload };
    
    case 'SET_AUTHENTICATED':
      return { ...state, isAuthenticated: action.payload };
    
    case 'SET_CHATS':
      return { ...state, chats: action.payload };
    
    case 'SET_ACTIVE_CHAT':
      return { ...state, activeChat: action.payload };
    
    case 'ADD_MESSAGE':
      const { chatId, message } = action.payload;
      const currentMessages = state.messages[chatId] || [];
      return {
        ...state,
        messages: {
          ...state.messages,
          [chatId]: [...currentMessages, message],
        },
      };
    
    case 'SET_MESSAGES':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.chatId]: action.payload.messages,
        },
      };
    
    case 'SET_NETWORK_STATUS':
      return { ...state, networkStatus: action.payload };
    
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    
    case 'SET_NOTIFICATIONS':
      return { ...state, notifications: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    case 'LOGOUT':
      return {
        ...initialState,
        isLoading: false,
        networkStatus: state.networkStatus,
        theme: state.theme,
      };
    
    default:
      return state;
  }
}

// Context接口
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  
  // Action creators
  setLoading: (loading: boolean) => void;
  setUser: (user: User | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setChats: (chats: Chat[]) => void;
  setActiveChat: (chat: Chat | null) => void;
  addMessage: (chatId: string, message: Message) => void;
  setMessages: (chatId: string, messages: Message[]) => void;
  setNetworkStatus: (status: 'online' | 'offline') => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setNotifications: (enabled: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  logout: () => void;
  
  // 业务方法
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  sendMessage: (chatId: string, content: string, type?: 'text' | 'image' | 'file') => Promise<void>;
  loadChats: () => Promise<void>;
  loadMessages: (chatId: string) => Promise<void>;
  initializeApp: () => Promise<void>;
}

// 创建Context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider组件
interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Action creators
  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const setUser = (user: User | null) => {
    dispatch({ type: 'SET_USER', payload: user });
  };

  const setAuthenticated = (authenticated: boolean) => {
    dispatch({ type: 'SET_AUTHENTICATED', payload: authenticated });
  };

  const setChats = (chats: Chat[]) => {
    dispatch({ type: 'SET_CHATS', payload: chats });
  };

  const setActiveChat = (chat: Chat | null) => {
    dispatch({ type: 'SET_ACTIVE_CHAT', payload: chat });
  };

  const addMessage = (chatId: string, message: Message) => {
    dispatch({ type: 'ADD_MESSAGE', payload: { chatId, message } });
  };

  const setMessages = (chatId: string, messages: Message[]) => {
    dispatch({ type: 'SET_MESSAGES', payload: { chatId, messages } });
  };

  const setNetworkStatus = (status: 'online' | 'offline') => {
    dispatch({ type: 'SET_NETWORK_STATUS', payload: status });
    dataService.setNetworkStatus(status);
  };

  const setTheme = (theme: 'light' | 'dark') => {
    dispatch({ type: 'SET_THEME', payload: theme });
    dataService.updateUserSettings({ theme });
  };

  const setNotifications = (enabled: boolean) => {
    dispatch({ type: 'SET_NOTIFICATIONS', payload: enabled });
    dataService.updateUserSettings({ notifications: enabled });
  };

  const setError = (error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const logout = async () => {
    try {
      setLoading(true);
      await dataService.logout();
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      setError(error instanceof Error ? error.message : '登出失败');
    } finally {
      setLoading(false);
    }
  };

  // 业务方法
  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      setLoading(true);
      clearError();
      
      const user = await dataService.login(email, password, rememberMe);
      setUser(user);
      setAuthenticated(true);
      
      // 登录成功后加载用户数据
      await loadChats();
    } catch (error) {
      setError(error instanceof Error ? error.message : '登录失败');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (chatId: string, content: string, type: 'text' | 'image' | 'file' = 'text') => {
    try {
      if (!state.currentUser) {
        throw new Error('用户未登录');
      }

      const message = await dataService.sendMessage({
        senderId: state.currentUser.id,
        receiverId: chatId, // 暂时简化处理
        content,
        type,
        isRead: false,
      });

      addMessage(chatId, message);
    } catch (error) {
      setError(error instanceof Error ? error.message : '发送消息失败');
      throw error;
    }
  };

  const loadChats = async () => {
    try {
      const chats = await dataService.getChats();
      setChats(chats);
    } catch (error) {
      setError(error instanceof Error ? error.message : '加载聊天列表失败');
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      const messages = await dataService.getMessages(chatId);
      setMessages(chatId, messages);
    } catch (error) {
      setError(error instanceof Error ? error.message : '加载消息失败');
    }
  };

  const initializeApp = async () => {
    try {
      setLoading(true);
      
      // 初始化数据服务
      await dataService.initialize();
      
      // 检查登录状态
      const isLoggedIn = await dataService.isLoggedIn();
      if (isLoggedIn) {
        const user = await dataService.getCurrentUser();
        if (user) {
          setUser(user);
          setAuthenticated(true);
          await loadChats();
        }
      }
      
      // 加载用户设置
      const settings = await dataService.getUserSettings();
      setTheme(settings.theme);
      setNotifications(settings.notifications);
      
    } catch (error) {
      setError(error instanceof Error ? error.message : '应用初始化失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始化应用
  useEffect(() => {
    initializeApp();
  }, []);

  const contextValue: AppContextType = {
    state,
    dispatch,
    setLoading,
    setUser,
    setAuthenticated,
    setChats,
    setActiveChat,
    addMessage,
    setMessages,
    setNetworkStatus,
    setTheme,
    setNotifications,
    setError,
    clearError,
    logout,
    login,
    sendMessage,
    loadChats,
    loadMessages,
    initializeApp,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

// Hook for using the context
export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}