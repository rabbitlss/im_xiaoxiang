import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  SectionList,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, User } from '@/types';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface ContactSection {
  title: string;
  data: User[];
}

export default function ContactsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [searchText, setSearchText] = useState('');
  const [contacts, setContacts] = useState<ContactSection[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<ContactSection[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // 模拟通讯录数据
  useEffect(() => {
    const mockContacts: User[] = [
      {
        id: 'user-001',
        name: '张三',
        email: 'zhangsan@xiaoxiang.com',
        department: '产品部',
        position: '产品经理',
        phone: '138****1234',
        status: 'online',
      },
      {
        id: 'user-002',
        name: '李四',
        email: 'lisi@xiaoxiang.com',
        department: '技术部',
        position: '前端工程师',
        phone: '139****5678',
        status: 'busy',
      },
      {
        id: 'user-003',
        name: '王五',
        email: 'wangwu@xiaoxiang.com',
        department: '设计部',
        position: 'UI设计师',
        phone: '137****9012',
        status: 'offline',
      },
      {
        id: 'user-004',
        name: '赵六',
        email: 'zhaoliu@xiaoxiang.com',
        department: '技术部',
        position: '后端工程师',
        phone: '135****3456',
        status: 'online',
      },
      {
        id: 'user-005',
        name: '钱七',
        email: 'qianqi@xiaoxiang.com',
        department: '市场部',
        position: '市场专员',
        phone: '133****7890',
        status: 'offline',
      },
    ];

    // 按部门分组
    const groupedByDepartment = mockContacts.reduce((acc, contact) => {
      const dept = contact.department;
      if (!acc[dept]) {
        acc[dept] = [];
      }
      acc[dept].push(contact);
      return acc;
    }, {} as Record<string, User[]>);

    const sections: ContactSection[] = Object.keys(groupedByDepartment)
      .sort()
      .map(dept => ({
        title: dept,
        data: groupedByDepartment[dept].sort((a, b) => a.name.localeCompare(b.name)),
      }));

    setContacts(sections);
    setFilteredContacts(sections);
  }, []);

  // 搜索过滤
  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredContacts(contacts);
      return;
    }

    const filtered = contacts.map(section => ({
      ...section,
      data: section.data.filter(contact =>
        contact.name.toLowerCase().includes(searchText.toLowerCase()) ||
        contact.department.toLowerCase().includes(searchText.toLowerCase()) ||
        contact.position.toLowerCase().includes(searchText.toLowerCase())
      ),
    })).filter(section => section.data.length > 0);

    setFilteredContacts(filtered);
  }, [searchText, contacts]);

  const handleContactPress = (contact: User) => {
    navigation.navigate('Chat', {
      chatId: `chat-${contact.id}`,
      userName: contact.name,
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // 模拟刷新延迟
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return '#34C759';
      case 'busy':
        return '#FF9500';
      case 'offline':
      default:
        return '#8E8E93';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online':
        return '在线';
      case 'busy':
        return '忙碌';
      case 'offline':
      default:
        return '离线';
    }
  };

  const renderContactItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => handleContactPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.name.charAt(0)}
          </Text>
        </View>
        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]} />
      </View>

      <View style={styles.contactInfo}>
        <View style={styles.contactHeader}>
          <Text style={styles.contactName}>{item.name}</Text>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusText(item.status)}
          </Text>
        </View>
        
        <Text style={styles.contactPosition}>{item.position}</Text>
        
        <View style={styles.contactDetails}>
          <Ionicons name="mail-outline" size={14} color="#8E8E93" />
          <Text style={styles.contactEmail}>{item.email}</Text>
        </View>
        
        <View style={styles.contactDetails}>
          <Ionicons name="call-outline" size={14} color="#8E8E93" />
          <Text style={styles.contactPhone}>{item.phone}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.chatButton}
        onPress={() => handleContactPress(item)}
      >
        <Ionicons name="chatbubble-outline" size={20} color="#007AFF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: { section: ContactSection }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionCount}>({section.data.length})</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 搜索框 */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder="搜索联系人"
            value={searchText}
            onChangeText={setSearchText}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* 联系人列表 */}
      <SectionList
        sections={filteredContacts}
        keyExtractor={(item) => item.id}
        renderItem={renderContactItem}
        renderSectionHeader={renderSectionHeader}
        style={styles.contactList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        stickySectionHeadersEnabled={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  contactList: {
    flex: 1,
  },
  sectionHeader: {
    backgroundColor: '#F8F9FA',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  sectionCount: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 4,
  },
  contactItem: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  contactInfo: {
    flex: 1,
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  contactPosition: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  contactDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  contactEmail: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
  },
  contactPhone: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
  },
  chatButton: {
    padding: 8,
    marginLeft: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginLeft: 76,
  },
});