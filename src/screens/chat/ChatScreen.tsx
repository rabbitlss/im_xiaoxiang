import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '@/types';
import { useApp } from '@/store';
import { formatTime } from '@/utils';

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file';
  isOwn: boolean;
}

export default function ChatScreen() {
  const route = useRoute<ChatScreenRouteProp>();
  const { chatId, userName } = route.params;
  const { state } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // 模拟消息数据
  useEffect(() => {
    const mockMessages: Message[] = [
      {
        id: 'msg-001',
        senderId: 'other-user',
        senderName: userName,
        content: '你好！有什么问题吗？',
        timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1小时前
        type: 'text',
        isOwn: false,
      },
      {
        id: 'msg-002',
        senderId: state.currentUser?.id || 'current-user',
        senderName: state.currentUser?.name || '我',
        content: '嗨！我想了解一下项目进度',
        timestamp: new Date(Date.now() - 55 * 60 * 1000), // 55分钟前
        type: 'text',
        isOwn: true,
      },
      {
        id: 'msg-003',
        senderId: 'other-user',
        senderName: userName,
        content: '当前项目进展顺利，预计下周完成第一阶段的开发',
        timestamp: new Date(Date.now() - 50 * 60 * 1000), // 50分钟前
        type: 'text',
        isOwn: false,
      },
      {
        id: 'msg-004',
        senderId: state.currentUser?.id || 'current-user',
        senderName: state.currentUser?.name || '我',
        content: '太好了！有什么需要我配合的吗？',
        timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45分钟前
        type: 'text',
        isOwn: true,
      },
      {
        id: 'msg-005',
        senderId: 'other-user',
        senderName: userName,
        content: '暂时没有，如果有问题我会及时联系你的',
        timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5分钟前
        type: 'text',
        isOwn: false,
      },
    ];

    setMessages(mockMessages);
  }, [chatId, userName, state.currentUser]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      senderId: state.currentUser?.id || 'current-user',
      senderName: state.currentUser?.name || '我',
      content: inputText.trim(),
      timestamp: new Date(),
      type: 'text',
      isOwn: true,
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');

    // 滚动到底部
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // 模拟对方回复
    setTimeout(() => {
      const replyMessage: Message = {
        id: `msg-reply-${Date.now()}`,
        senderId: 'other-user',
        senderName: userName,
        content: '收到！谢谢你的关心',
        timestamp: new Date(),
        type: 'text',
        isOwn: false,
      };
      setMessages(prev => [...prev, replyMessage]);
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 2000);
  };

  const handleMoreActions = () => {
    Alert.alert(
      '更多操作',
      '选择操作',
      [
        { text: '发送图片', onPress: () => Alert.alert('提示', '图片功能开发中') },
        { text: '发送文件', onPress: () => Alert.alert('提示', '文件功能开发中') },
        { text: '取消', style: 'cancel' },
      ]
    );
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.isOwn ? styles.ownMessage : styles.otherMessage
    ]}>
      <View style={[
        styles.messageBubble,
        item.isOwn ? styles.ownBubble : styles.otherBubble
      ]}>
        <Text style={[
          styles.messageText,
          item.isOwn ? styles.ownText : styles.otherText
        ]}>
          {item.content}
        </Text>
      </View>
      <Text style={styles.messageTime}>
        {formatTime(item.timestamp)}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      {/* 消息列表 */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        style={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {/* 正在输入指示器 */}
      {isTyping && (
        <View style={styles.typingIndicator}>
          <Text style={styles.typingText}>{userName} 正在输入...</Text>
        </View>
      )}

      {/* 输入框 */}
      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={handleMoreActions}
        >
          <Ionicons name="add" size={24} color="#007AFF" />
        </TouchableOpacity>

        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="输入消息..."
          multiline
          maxLength={1000}
          returnKeyType="send"
          onSubmitEditing={handleSendMessage}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            inputText.trim() ? styles.sendButtonActive : styles.sendButtonInactive
          ]}
          onPress={handleSendMessage}
          disabled={!inputText.trim()}
        >
          <Ionicons
            name="send"
            size={20}
            color={inputText.trim() ? '#fff' : '#C7C7CC'}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 4,
  },
  ownBubble: {
    backgroundColor: '#007AFF',
  },
  otherBubble: {
    backgroundColor: '#E5E5EA',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownText: {
    color: '#fff',
  },
  otherText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 12,
    color: '#8E8E93',
  },
  typingIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  typingText: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  inputContainer: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  moreButton: {
    padding: 8,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    backgroundColor: '#F8F9FA',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonActive: {
    backgroundColor: '#007AFF',
  },
  sendButtonInactive: {
    backgroundColor: '#F8F9FA',
  },
});