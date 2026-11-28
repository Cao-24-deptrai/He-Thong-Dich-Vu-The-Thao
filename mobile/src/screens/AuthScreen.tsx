import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { fonts, radius, spacing, useTheme } from '../theme/colors';
import { useAuthStore } from '../store/useAuthStore';
import { ThemeToggleButton } from '../components/ThemeToggleButton';

interface AuthScreenProps {
  onBack?: () => void;
  onSuccess?: () => void;
  onGuest?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onBack,
  onSuccess,
  onGuest,
}) => {
  const theme = useTheme();
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState<'PASSWORD' | 'OTP'>('PASSWORD');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [agreedPolicy, setAgreedPolicy] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);

  const { login, sendOtp, verifyOtp, register, isLoading, error } = useAuthStore();

  const handleSendOtp = async () => {
    setLocalError(null);
    if (!phone.trim()) {
      setLocalError('Vui lòng nhập số điện thoại.');
      return;
    }
    try {
      await sendOtp(phone.trim());
      setOtpSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể gửi mã OTP';
      setLocalError(msg);
    }
  };

  const handleSubmit = async () => {
    setLocalError(null);
    if (!agreedPolicy) {
      setLocalError('Vui lòng đồng ý với điều khoản dịch vụ trước khi tiếp tục.');
      return;
    }
    try {
      if (isLogin) {
        if (authMethod === 'OTP') {
          const code = otpDigits.join('');
          if (code.length < 6) {
            setLocalError('Vui lòng nhập đủ 6 chữ số OTP.');
            return;
          }
          await verifyOtp(phone.trim(), code);
        } else {
          await login(phone.trim(), password);
        }
      } else {
        await register(phone.trim(), password, fullName.trim(), email.trim() || undefined);
      }
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Thao tác thất bại';
      setLocalError(msg);
    }
  };

  const fillQuickCustomer = () => {
    setPhone('0911223344');
    setPassword('User@123456');
    setIsLogin(true);
    setAuthMethod('PASSWORD');
  };

  const updateOtp = (index: number, val: string) => {
    const next = [...otpDigits];
    next[index] = val.slice(-1);
    setOtpDigits(next);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topNav}>
          {onBack ? (
            <Pressable
              onPress={onBack}
              accessibilityLabel="Quay lại"
              style={({ pressed }) => [
                styles.backBtn,
                {
                  backgroundColor: theme.surfaceElevated,
                  borderColor: theme.border,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <ArrowLeft size={18} strokeWidth={1.75} color={theme.textPrimary} />
            </Pressable>
          ) : (
            <View style={styles.backPlaceholder} />
          )}
          <Text
            style={[
              styles.topTitle,
              { color: theme.textHeading, fontFamily: fonts.headingBold },
            ]}
          >
            Tài khoản khách hàng
          </Text>
          <ThemeToggleButton />
        </View>

        <View style={styles.header}>
          <View
            style={[
              styles.logoFrame,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <Image
              source={require('../../assets/logo.jpg')}
              style={styles.logoImg}
              resizeMode="cover"
            />
          </View>
          <Text
            style={[
              styles.title,
              { color: theme.textHeading, fontFamily: fonts.headingBold },
            ]}
          >
            Phanta Sports Pass
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: theme.textSecondary, fontFamily: fonts.body },
            ]}
          >
            Định danh tài khoản bằng số điện thoại duy nhất
          </Text>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <View
            style={[
              styles.tabContainer,
              {
                backgroundColor: theme.background,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <Pressable
              style={[
                styles.tab,
                isLogin && { backgroundColor: theme.accent },
              ]}
              onPress={() => setIsLogin(true)}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: isLogin ? theme.onAccent : theme.textSecondary,
                    fontFamily: fonts.bodySemiBold,
                  },
                ]}
              >
                Đăng nhập
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.tab,
                !isLogin && { backgroundColor: theme.accent },
              ]}
              onPress={() => setIsLogin(false)}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: !isLogin ? theme.onAccent : theme.textSecondary,
                    fontFamily: fonts.bodySemiBold,
                  },
                ]}
              >
                Đăng ký mới
              </Text>
            </Pressable>
          </View>

          {(localError || error) ? (
            <View
              style={[
                styles.errorBox,
                {
                  backgroundColor: theme.dangerSoft,
                  borderColor: theme.danger,
                },
              ]}
            >
              <Text
                style={[
                  styles.errorText,
                  { color: theme.danger, fontFamily: fonts.bodyMedium },
                ]}
              >
                {localError || error}
              </Text>
            </View>
          ) : null}

          {!isLogin ? (
            <View style={styles.fieldGroup}>
              <Text
                style={[
                  styles.label,
                  { color: theme.textSecondary, fontFamily: fonts.bodyMedium },
                ]}
              >
                Họ và tên
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.inputBorder,
                    color: theme.textHeading,
                    fontFamily: fonts.bodyMedium,
                  },
                ]}
                placeholder="Nguyễn Văn Nam"
                placeholderTextColor={theme.placeholder}
                value={fullName}
                onChangeText={setFullName}
              />
            </View>
          ) : null}

          <View style={styles.fieldGroup}>
            <Text
              style={[
                styles.label,
                { color: theme.textSecondary, fontFamily: fonts.bodyMedium },
              ]}
            >
              Số điện thoại đăng ký
            </Text>
            <View
              style={[
                styles.phoneInputWrap,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder,
                },
              ]}
            >
              <View
                style={[
                  styles.countryPrefix,
                  { borderRightColor: theme.border },
                ]}
              >
                <Text
                  style={[
                    styles.prefixText,
                    { color: theme.accent, fontFamily: fonts.heading },
                  ]}
                >
                  VN +84
                </Text>
              </View>
              <TextInput
                style={[
                  styles.phoneInput,
                  {
                    color: theme.textHeading,
                    fontFamily: fonts.bodyMedium,
                  },
                ]}
                placeholder="0911 223 344"
                placeholderTextColor={theme.placeholder}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>
          </View>

          {!isLogin ? (
            <View style={styles.fieldGroup}>
              <Text
                style={[
                  styles.label,
                  { color: theme.textSecondary, fontFamily: fonts.bodyMedium },
                ]}
              >
                Email (tùy chọn)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.inputBorder,
                    color: theme.textHeading,
                    fontFamily: fonts.bodyMedium,
                  },
                ]}
                placeholder="email@example.com"
                placeholderTextColor={theme.placeholder}
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          ) : null}

          {isLogin ? (
            <View style={styles.fieldGroup}>
              <Text
                style={[
                  styles.label,
                  { color: theme.textSecondary, fontFamily: fonts.bodyMedium },
                ]}
              >
                Phương thức xác thực
              </Text>
              <View
                style={[
                  styles.methodRow,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.borderSubtle,
                  },
                ]}
              >
                <Pressable
                  onPress={() => setAuthMethod('PASSWORD')}
                  style={[
                    styles.methodBtn,
                    authMethod === 'PASSWORD' && {
                      backgroundColor: theme.surfaceElevated,
                      borderColor: theme.borderAccent,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.methodText,
                      {
                        color:
                          authMethod === 'PASSWORD'
                            ? theme.textHeading
                            : theme.textSecondary,
                        fontFamily: fonts.bodyMedium,
                      },
                    ]}
                  >
                    Mật khẩu
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setAuthMethod('OTP')}
                  style={[
                    styles.methodBtn,
                    authMethod === 'OTP' && {
                      backgroundColor: theme.surfaceElevated,
                      borderColor: theme.borderAccent,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.methodText,
                      {
                        color:
                          authMethod === 'OTP'
                            ? theme.textHeading
                            : theme.textSecondary,
                        fontFamily: fonts.bodyMedium,
                      },
                    ]}
                  >
                    Mã OTP (ZNS/SMS)
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {isLogin && authMethod === 'OTP' ? (
            <View style={styles.fieldGroup}>
              <View style={styles.otpHeader}>
                <Text
                  style={[
                    styles.label,
                    { color: theme.textSecondary, fontFamily: fonts.bodyMedium },
                  ]}
                >
                  Mã xác thực 6 số
                </Text>
                <Pressable onPress={handleSendOtp} disabled={isLoading}>
                  <Text
                    style={[
                      styles.otpTimer,
                      { color: theme.accent, fontFamily: fonts.bodyMedium },
                    ]}
                  >
                    {otpSent ? 'Gửi lại mã OTP' : 'Gửi mã OTP'}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.otpGrid}>
                {otpDigits.map((digit, idx) => (
                  <TextInput
                    key={idx}
                    value={digit}
                    onChangeText={(v) => updateOtp(idx, v)}
                    maxLength={1}
                    keyboardType="number-pad"
                    style={[
                      styles.otpCell,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: digit ? theme.accent : theme.inputBorder,
                        color: theme.textHeading,
                        fontFamily: fonts.headingBold,
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.fieldGroup}>
              <Text
                style={[
                  styles.label,
                  { color: theme.textSecondary, fontFamily: fonts.bodyMedium },
                ]}
              >
                Mật khẩu
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.inputBorder,
                    color: theme.textHeading,
                    fontFamily: fonts.bodyMedium,
                  },
                ]}
                placeholder="Nhập mật khẩu"
                placeholderTextColor={theme.placeholder}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
          )}

          <Pressable
            onPress={() => setAgreedPolicy(!agreedPolicy)}
            style={[
              styles.policyBox,
              {
                backgroundColor: theme.surfaceElevated,
                borderColor: theme.border,
              },
            ]}
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: agreedPolicy ? theme.accent : theme.borderLight,
                  backgroundColor: agreedPolicy ? theme.accent : 'transparent',
                },
              ]}
            >
              {agreedPolicy ? (
                <Text
                  style={{
                    color: theme.onAccent,
                    fontSize: 11,
                    fontFamily: fonts.headingBold,
                  }}
                >
                  ✓
                </Text>
              ) : null}
            </View>
            <Text
              style={[
                styles.policyText,
                { color: theme.textSecondary, fontFamily: fonts.body },
              ]}
            >
              Tôi đồng ý với Điều khoản dịch vụ Phanta và Chính sách bảo vệ dữ liệu cá nhân theo Luật 91/2025/QH15.
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              {
                backgroundColor: theme.accentSecondary,
                opacity: isLoading ? 0.6 : pressed ? 0.85 : 1,
              },
            ]}
            disabled={isLoading}
            onPress={handleSubmit}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.onAccentSecondary} />
            ) : (
              <Text
                style={[
                  styles.submitBtnText,
                  { color: theme.onAccentSecondary, fontFamily: fonts.bodySemiBold },
                ]}
              >
                {isLogin ? 'Xác nhận đăng nhập' : 'Tạo tài khoản khách hàng'}
              </Text>
            )}
          </Pressable>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            <Text
              style={[
                styles.dividerText,
                { color: theme.textMuted, fontFamily: fonts.bodyMedium },
              ]}
            >
              Hoặc dùng tài khoản mẫu
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.quickBtn,
              {
                backgroundColor: theme.surfaceElevated,
                borderColor: theme.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            onPress={fillQuickCustomer}
          >
            <Text
              style={[
                styles.quickBtnText,
                { color: theme.textHeading, fontFamily: fonts.bodySemiBold },
              ]}
            >
              Điền tài khoản khách hàng mẫu
            </Text>
            <Text
              style={[
                styles.quickBtnSub,
                { color: theme.textSecondary, fontFamily: fonts.body },
              ]}
            >
              0911223344 - User@123456
            </Text>
          </Pressable>

          {onGuest ? (
            <Pressable
              onPress={onGuest}
              style={({ pressed }) => [styles.guestBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text
                style={[
                  styles.guestText,
                  { color: theme.textSecondary, fontFamily: fonts.bodyMedium },
                ]}
              >
                Trải nghiệm với tư cách khách
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: spacing.xl,
    justifyContent: 'center',
    flexGrow: 1,
    maxWidth: 460,
    width: '100%',
    alignSelf: 'center',
    gap: spacing.lg,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontSize: 15,
  },
  backPlaceholder: {
    width: 44,
  },
  header: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  logoFrame: {
    width: 72,
    height: 72,
    borderRadius: 18,
    borderWidth: 1,
    padding: 3,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  logoImg: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  title: {
    fontSize: 22,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  card: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    gap: spacing.md,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 4,
  },
  tab: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  tabText: {
    fontSize: 13,
  },
  errorBox: {
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 12,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
  },
  input: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: 14,
  },
  phoneInputWrap: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryPrefix: {
    paddingHorizontal: spacing.md,
    borderRightWidth: 1,
    justifyContent: 'center',
    height: 24,
  },
  prefixText: {
    fontSize: 13,
  },
  phoneInput: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    fontSize: 14,
  },
  methodRow: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  methodBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodText: {
    fontSize: 12,
  },
  otpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  otpTimer: {
    fontSize: 11,
  },
  otpGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 6,
  },
  otpCell: {
    flex: 1,
    minWidth: 0,
    maxWidth: 48,
    height: 44,
    paddingHorizontal: 0,
    borderRadius: radius.md,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 16,
  },
  policyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  policyText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
  submitBtn: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 14,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
  },
  quickBtn: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  quickBtnText: {
    fontSize: 13,
  },
  quickBtnSub: {
    fontSize: 11,
  },
  guestBtn: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestText: {
    fontSize: 13,
  },
});
