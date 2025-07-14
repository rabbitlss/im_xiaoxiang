import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '@/types';
import { useApp } from '@/store';

type ProfileScreenRouteProp = RouteProp<RootStackParamList, 'Profile'>;

export default function ProfileScreen() {
  const route = useRoute<ProfileScreenRouteProp>();
  const navigation = useNavigation();
  const { state, dispatch } = useApp();
  const { userId } = route.params;

  // 获取用户信息（这里简化为当前用户）
  const user = state.currentUser;

  const handleEditProfile = () => {
    Alert.alert('提示', '个人信息编辑功能开发中');
  };

  const handleChangePassword = () => {
    Alert.alert('提示', '密码修改功能开发中');
  };

  const handleSettings = () => {
    Alert.alert('提示', '设置功能开发中');
  };

  const handleLogout = () => {
    Alert.alert(
      '确认退出',
      '确定要退出登录吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '退出',
          style: 'destructive',
          onPress: () => {
            dispatch({ type: 'LOGOUT' });
            navigation.goBack();
          },
        },
      ]
    );
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

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>用户信息不存在</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 用户头像和基本信息 */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.name.charAt(0)}
            </Text>
          </View>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(user.status) }]} />
        </View>

        <Text style={styles.userName}>{user.name}</Text>
        <Text style={[styles.userStatus, { color: getStatusColor(user.status) }]}>
          {getStatusText(user.status)}
        </Text>
        <Text style={styles.userPosition}>{user.position}</Text>
        <Text style={styles.userDepartment}>{user.department}</Text>
      </View>

      {/* 联系信息 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>联系信息</Text>
        
        <View style={styles.infoItem}>
          <Ionicons name="mail-outline" size={20} color="#007AFF" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>邮箱</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>
        </View>

        {user.phone && (
          <View style={styles.infoItem}>
            <Ionicons name="call-outline" size={20} color="#007AFF" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>电话</Text>
              <Text style={styles.infoValue}>{user.phone}</Text>
            </View>
          </View>
        )}

        <View style={styles.infoItem}>
          <Ionicons name="business-outline" size={20} color="#007AFF" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>部门</Text>
            <Text style={styles.infoValue}>{user.department}</Text>
          </View>
        </View>

        <View style={styles.infoItem}>
          <Ionicons name="person-outline" size={20} color="#007AFF" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>职位</Text>
            <Text style={styles.infoValue}>{user.position}</Text>
          </View>
        </View>
      </View>

      {/* 操作按钮 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>账户管理</Text>
        
        <TouchableOpacity style={styles.actionItem} onPress={handleEditProfile}>
          <Ionicons name="create-outline" size={20} color="#007AFF" />
          <Text style={styles.actionText}>编辑个人信息</Text>
          <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={handleChangePassword}>
          <Ionicons name="lock-closed-outline" size={20} color="#007AFF" />
          <Text style={styles.actionText}>修改密码</Text>
          <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={handleSettings}>
          <Ionicons name="settings-outline" size={20} color="#007AFF" />
          <Text style={styles.actionText}>应用设置</Text>
          <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
        </TouchableOpacity>
      </View>

      {/* 退出登录 */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
          <Text style={styles.logoutText}>退出登录</Text>
        </TouchableOpacity>
      </View>

      {/* 版本信息 */}
      <View style={styles.footer}>
        <Text style={styles.versionText}>小象聊天 v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  header: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '600',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userStatus: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  userPosition: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  userDepartment: {
    fontSize: 14,
    color: '#8E8E93',
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  logoutText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '500',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 14,
    color: '#8E8E93',
  },
});