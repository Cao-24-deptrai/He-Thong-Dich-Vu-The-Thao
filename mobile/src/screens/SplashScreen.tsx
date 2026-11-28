import React from 'react';
import { View, Text, Image, Pressable, StyleSheet, SafeAreaView } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { fonts, radius, spacing, useTheme } from '../theme/colors';
import { ThemeToggleButton } from '../components/ThemeToggleButton';

interface SplashScreenProps {
  onStart: () => void;
  onSkipToHome: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onStart,
  onSkipToHome,
}) => {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: theme.accentSoft,
                borderColor: theme.borderAccent,
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: theme.accent, fontFamily: fonts.bodySemiBold },
              ]}
            >
              Phanta Sports
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Pressable
              onPress={onSkipToHome}
              style={({ pressed }) => [styles.skipBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text
                style={[
                  styles.skipText,
                  { color: theme.textSecondary, fontFamily: fonts.bodyMedium },
                ]}
              >
                Bỏ qua
              </Text>
            </Pressable>
            <ThemeToggleButton />
          </View>
        </View>

        <View style={styles.centerBlock}>
          <View
            style={[
              styles.logoWrapper,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <Image
              source={require('../../assets/logo.jpg')}
              style={styles.logoImage}
              resizeMode="cover"
            />
          </View>

          <Text
            style={[
              styles.brandTitle,
              { color: theme.textHeading, fontFamily: fonts.headingBold },
            ]}
          >
            Phanta Sports
          </Text>
          <Text
            style={[
              styles.brandSubtitle,
              { color: theme.textSecondary, fontFamily: fonts.body },
            ]}
          >
            Tổ hợp thể thao và Esports đa tiện ích
          </Text>
        </View>

        <View style={styles.bottomActions}>
          <Pressable
            onPress={onStart}
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
              Bắt đầu trải nghiệm
            </Text>
            <ArrowRight size={16} strokeWidth={2} color={theme.onAccentSecondary} />
          </Pressable>

          <Pressable
            onPress={onSkipToHome}
            style={({ pressed }) => [
              styles.secondaryLink,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text
              style={[
                styles.secondaryLinkText,
                { color: theme.textSecondary, fontFamily: fonts.bodyMedium },
              ]}
            >
              Vào thẳng trang chủ
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: spacing.xxl,
    justifyContent: 'space-between',
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
  },
  skipBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  skipText: {
    fontSize: 13,
  },
  centerBlock: {
    alignItems: 'center',
    gap: spacing.md,
  },
  logoWrapper: {
    width: 104,
    height: 104,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 4,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  brandTitle: {
    fontSize: 28,
    marginTop: spacing.xs,
  },
  brandSubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  bottomActions: {
    gap: spacing.sm,
  },
  primaryBtn: {
    minHeight: 48,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primaryBtnText: {
    fontSize: 14,
  },
  secondaryLink: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLinkText: {
    fontSize: 13,
  },
});
