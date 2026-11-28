import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Sun, Moon } from 'lucide-react-native';
import { radius, useTheme } from '../theme/colors';
import { useThemeStore } from '../store/useThemeStore';

export const ThemeToggleButton: React.FC = () => {
  const theme = useTheme();
  const { mode, toggleTheme } = useThemeStore();

  return (
    <Pressable
      onPress={toggleTheme}
      accessibilityLabel={
        mode === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'
      }
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: theme.surfaceElevated,
          borderColor: theme.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      {mode === 'dark' ? (
        <Sun size={17} strokeWidth={1.75} color={theme.textPrimary} />
      ) : (
        <Moon size={17} strokeWidth={1.75} color={theme.textPrimary} />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
