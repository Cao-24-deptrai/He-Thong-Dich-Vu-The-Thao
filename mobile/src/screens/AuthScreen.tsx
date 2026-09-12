// mobile/src/screens/AuthScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { colors } from '../theme/colors';
import { useAuthStore } from '../store/useAuthStore';

export const AuthScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState('0911223344');
  const [password, setPassword] = useState('User@123456');
  const [fullName, setFullName] = useState('Nguyễn Văn Khách Hàng');
  const [email, setEmail] = useState('khachhang@gmail.com');
  const [localError, setLocalError] = useState<string | null>(null);

  const { login, register, isLoading, error } = useAuthStore();

  const handleSubmit = async () => {
    setLocalError(null);
    try {
      if (isLogin) {
        await login(phone, password);
      } else {
        await register(phone, password, fullName, email);
      }
    } catch (err: any) {
      setLocalError(err.message || 'Thao tác thất bại');
    }
  };

  const fillQuickCustomer = () => {
    setPhone('0911223344');
    setPassword('User@123456');
    setIsLogin(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>⚡</Text>
          </View>
          <Text style={styles.title}>Sports Booking App</Text>
          <Text style={styles.subtitle}>Đặt sân thể thao & Esports nhanh chóng, tiện lợi</Text>
        </View>

        {/* Auth Card */}
        <View style={styles.card}>
          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, isLogin && styles.activeTab]}
              onPress={() => setIsLogin(true)}
            >
              <Text style={[styles.tabText, isLogin && styles.activeTabText]}>Đăng nhập</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, !isLogin && styles.activeTab]}
              onPress={() => setIsLogin(false)}
            >
              <Text style={[styles.tabText, !isLogin && styles.activeTabText]}>Đăng ký mới</Text>
            </TouchableOpacity>
          </View>

          {(localError || error) && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{localError || error}</Text>
            </View>
          )}

          {/* Form Fields */}
          {!isLogin && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Họ và Tên *</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: Nguyễn Văn Nam"
                placeholderTextColor={colors.textMuted}
                value={fullName}
                onChangeText={setFullName}
              />
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Số điện thoại *</Text>
            <TextInput
              style={styles.input}
              placeholder="0911223344"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          {!isLogin && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email (Tùy chọn)</Text>
              <TextInput
                style={styles.input}
                placeholder="email@example.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Mật khẩu *</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            style={styles.submitBtn}
            disabled={isLoading}
            onPress={handleSubmit}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>
                {isLogin ? 'Đăng Nhập Ngay' : 'Tạo Tài Khoản Khách Hàng'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Quick Login Shortcut */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>HOẶC THỬ NHANH</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.quickBtn} onPress={fillQuickCustomer}>
            <Text style={styles.quickBtnText}>👤 Điền tài khoản Khách hàng mẫu</Text>
            <Text style={styles.quickBtnSub}>0911223344 | User@123456</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: 20,
    justifyContent: 'center',
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  logoIcon: {
    fontSize: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: colors.dangerBg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '500',
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 10,
    color: colors.textMuted,
    marginHorizontal: 10,
    fontWeight: '700',
  },
  quickBtn: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  quickBtnSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    fontFamily: 'monospace',
  },
});
