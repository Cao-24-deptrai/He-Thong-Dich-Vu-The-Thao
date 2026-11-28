import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Info, X } from 'lucide-react-native';
import { fonts, radius, spacing, useTheme } from '../theme/colors';

interface AppDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  onClose: () => void;
}

export const AppDialog: React.FC<AppDialogProps> = ({
  visible,
  title,
  message,
  confirmText = 'Đã hiểu',
  onClose,
}) => {
  const theme = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.backdrop, { backgroundColor: theme.scrim }]}>
        <View
          style={[
            styles.box,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <View
            style={[
              styles.header,
              { borderBottomColor: theme.borderSubtle },
            ]}
          >
            <View style={styles.titleRow}>
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: theme.accentSoft },
                ]}
              >
                <Info size={18} strokeWidth={1.75} color={theme.accent} />
              </View>
              <View style={styles.titleGroup}>
                <Text
                  style={[
                    styles.title,
                    { color: theme.textHeading, fontFamily: fonts.headingBold },
                  ]}
                >
                  {title}
                </Text>
                <Text
                  style={[
                    styles.subtitle,
                    { color: theme.textMuted, fontFamily: fonts.body },
                  ]}
                >
                  Phanta Sports
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityLabel="Đóng thông báo"
              style={({ pressed }) => [
                styles.closeBtn,
                {
                  backgroundColor: theme.surfaceElevated,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <X size={16} strokeWidth={1.75} color={theme.textSecondary} />
            </Pressable>
          </View>

          <Text
            style={[
              styles.message,
              { color: theme.textPrimary, fontFamily: fonts.body },
            ]}
          >
            {message}
          </Text>

          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.confirmBtn,
                {
                  backgroundColor: theme.accent,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.confirmText,
                  { color: theme.onAccent, fontFamily: fonts.bodySemiBold },
                ]}
              >
                {confirmText}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  box: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleGroup: {
    flex: 1,
  },
  title: {
    fontSize: 16,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  confirmBtn: {
    minHeight: 44,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontSize: 13,
  },
});
