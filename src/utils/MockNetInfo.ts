// Mock implementation for @react-native-community/netinfo when not available
export interface NetInfoState {
  isConnected: boolean | null;
  type: string;
  details?: {
    strength?: number;
  };
}

export interface NetInfoSubscription {
  (): void;
}

export class MockNetInfo {
  private static listeners: ((state: NetInfoState) => void)[] = [];
  private static currentState: NetInfoState = {
    isConnected: true,
    type: 'wifi'
  };

  static addEventListener(listener: (state: NetInfoState) => void): NetInfoSubscription {
    this.listeners.push(listener);
    
    // 立即调用一次监听器
    setTimeout(() => listener(this.currentState), 0);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  static async fetch(): Promise<NetInfoState> {
    return Promise.resolve(this.currentState);
  }

  static setMockState(state: Partial<NetInfoState>): void {
    this.currentState = { ...this.currentState, ...state };
    this.listeners.forEach(listener => {
      try {
        listener(this.currentState);
      } catch (error) {
        console.error('Mock NetInfo listener error:', error);
      }
    });
  }
}

// 导出Mock版本
export default MockNetInfo;