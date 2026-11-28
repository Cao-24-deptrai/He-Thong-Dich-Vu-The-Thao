import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ArrowLeft, X } from 'lucide-react-native';
import { fonts, radius, spacing, useTheme } from '../theme/colors';
import { ThemeToggleButton } from './ThemeToggleButton';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backIcon?: 'arrow' | 'close';
  rightElement?: React.ReactNode;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  onBack,
  backIcon = 'arrow',
  rightElement,
}) => {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: theme.surface,
          borderBottomColor: theme.border,
        },
      ]}
    >
      <View style={styles.leftSlot}>
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
            {backIcon === 'close' ? (
              <X size={18} strokeWidth={1.75} color={theme.textPrimary} />
            ) : (
              <ArrowLeft size={18} strokeWidth={1.75} color={theme.textPrimary} />
            )}
          </Pressable>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      <View style={styles.centerSlot}>
        <Text
          numberOfLines={1}
          style={[
            styles.title,
            { color: theme.textHeading, fontFamily: fonts.headingBold },
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={[
              styles.subtitle,
              { color: theme.accent, fontFamily: fonts.bodyMedium },
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.rightSlot}>
        {rightElement}
        <ThemeToggleButton />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  leftSlot: {
    minWidth: 44,
    alignItems: 'flex-start',
  },
  centerSlot: {
    flex: 1,
    alignItems: 'center',
  },
  rightSlot: {
    minWidth: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 44,
    height: 44,
  },
  title: {
    fontSize: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
});
