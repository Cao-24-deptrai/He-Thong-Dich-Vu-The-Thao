import React from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { fonts, radius, spacing, useTheme } from '../theme/colors';
import { ThemeToggleButton } from '../components/ThemeToggleButton';

interface WelcomeScreenProps {
  onLogin: () => void;
  onOnboarding: () => void;
  onGuest: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onLogin,
  onOnboarding,
  onGuest,
}) => {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: theme.textHeading, fontFamily: fonts.headingBold }}>
            Phanta Sports
          </Text>
          <ThemeToggleButton />
        </View>
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=800&q=80',
            }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroOverlay}>
            <View
              style={[
                styles.heroTag,
                { backgroundColor: theme.accent },
              ]}
            >
              <Text
                style={[
                  styles.heroTagText,
                  { color: theme.onAccent, fontFamily: fonts.bodySemiBold },
                ]}
              >
                Tổ hợp đa tiện ích
              </Text>
            </View>
            <Text style={[styles.heroTitle, { fontFamily: fonts.headingBold }]}>
              Sân bãi và khu tập luyện tiêu chuẩn
            </Text>
            <Text style={[styles.heroMeta, { fontFamily: fonts.body }]}>
              8 sân bóng đá, 4 sân cầu lông, 2 sân tennis, Gym AI, 2 hồ bơi và Cyber 100 máy
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text
            style={[
              styles.heading,
              { color: theme.textHeading, fontFamily: fonts.headingBold },
            ]}
          >
            Chào mừng đến với Phanta
          </Text>
          <Text
            style={[
              styles.description,
              { color: theme.textSecondary, fontFamily: fonts.body },
            ]}
          >
            Đặt sân theo khung 30 phút với khóa giữ chỗ 10 phút tránh trùng lịch, mở cổng bằng vé QR động 60 giây hoặc thẻ Gym Face ID.
          </Text>

          <View style={styles.actions}>
            <Pressable
              onPress={onLogin}
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  backgroundColor: theme.accentSecondary,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.primaryBtnText,
                  { color: theme.onAccentSecondary, fontFamily: fonts.bodySemiBold },
                ]}
              >
                Đăng nhập bằng số điện thoại
              </Text>
            </Pressable>

            <Pressable
              onPress={onOnboarding}
              style={({ pressed }) => [
                styles.outlineBtn,
                {
                  backgroundColor: theme.surfaceElevated,
                  borderColor: theme.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.outlineBtnText,
                  { color: theme.accent, fontFamily: fonts.bodySemiBold },
                ]}
              >
                Xem hướng dẫn 3 bước
              </Text>
            </Pressable>

            <Pressable
              onPress={onGuest}
              style={({ pressed }) => [styles.guestBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text
                style={[
                  styles.guestBtnText,
                  { color: theme.textSecondary, fontFamily: fonts.bodyMedium },
                ]}
              >
                Khám phá không cần đăng nhập
              </Text>
            </Pressable>
          </View>
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
    flexGrow: 1,
    padding: spacing.xxl,
    justifyContent: 'space-between',
    gap: spacing.xl,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  heroCard: {
    height: 280,
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.56)',
    padding: spacing.lg,
    justifyContent: 'flex-end',
    gap: 6,
  },
  heroTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  heroTagText: {
    fontSize: 11,
  },
  heroTitle: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  heroMeta: {
    fontSize: 12,
    color: '#E2E8F0',
    lineHeight: 18,
  },
  body: {
    gap: spacing.md,
  },
  heading: {
    fontSize: 22,
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  primaryBtn: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 14,
  },
  outlineBtn: {
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: {
    fontSize: 13,
  },
  guestBtn: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestBtnText: {
    fontSize: 13,
  },
});
