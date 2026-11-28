import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import {
  Dumbbell,
  Gamepad2,
  UserCheck,
  Users,
  QrCode,
  ListChecks,
  Wallet,
  Star,
  MessageSquare,
  Bell,
  WifiOff,
  HelpCircle,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { fonts, radius, spacing, useTheme } from '../theme/colors';

export type ServiceScreenTarget =
  | 'GYM_POOL'
  | 'GAMING'
  | 'COACHES'
  | 'MATCHMAKING'
  | 'TICKET'
  | 'PROCESS'
  | 'WALLET'
  | 'RATINGS'
  | 'CHAT'
  | 'NOTIFICATIONS'
  | 'OFFLINE'
  | 'ONBOARDING';

interface ServicesDropupMenuProps {
  visible: boolean;
  currentScreen: string;
  onSelect: (target: ServiceScreenTarget) => void;
  onClose: () => void;
}

const SERVICE_ITEMS: {
  id: ServiceScreenTarget;
  label: string;
  Icon: LucideIcon;
  highlight?: 'primary' | 'secondary';
}[] = [
  { id: 'GYM_POOL', label: 'Gym & Bơi', Icon: Dumbbell, highlight: 'primary' },
  { id: 'GAMING', label: 'Phanta Gaming', Icon: Gamepad2, highlight: 'primary' },
  { id: 'COACHES', label: 'HLV & PT', Icon: UserCheck, highlight: 'primary' },
  { id: 'MATCHMAKING', label: 'Cáp kèo', Icon: Users, highlight: 'primary' },
  { id: 'TICKET', label: 'Vé QR 60s', Icon: QrCode },
  { id: 'PROCESS', label: 'Quy trình', Icon: ListChecks, highlight: 'secondary' },
  { id: 'WALLET', label: 'Ví Pay', Icon: Wallet },
  { id: 'RATINGS', label: 'Đánh giá', Icon: Star, highlight: 'secondary' },
  { id: 'CHAT', label: 'Chat 24/7', Icon: MessageSquare },
  { id: 'NOTIFICATIONS', label: 'Thông báo', Icon: Bell, highlight: 'secondary' },
  { id: 'OFFLINE', label: 'Ngoại tuyến', Icon: WifiOff, highlight: 'secondary' },
  { id: 'ONBOARDING', label: 'Hướng dẫn', Icon: HelpCircle },
];

export const ServicesDropupMenu: React.FC<ServicesDropupMenuProps> = ({
  visible,
  currentScreen,
  onSelect,
  onClose,
}) => {
  const theme = useTheme();

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { backgroundColor: theme.scrim }]}>
      <Pressable style={styles.dismissArea} onPress={onClose} />
      <View
        style={[
          styles.drawer,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={[styles.topBar, { borderBottomColor: theme.borderSubtle }]}>
          <View style={[styles.dragPill, { backgroundColor: theme.borderLight }]} />
          <Text
            style={[
              styles.drawerTitle,
              { color: theme.textHeading, fontFamily: fonts.heading },
            ]}
          >
            Tiện ích Phanta Sports
          </Text>
          <Pressable
            onPress={onClose}
            accessibilityLabel="Đóng menu dịch vụ"
            style={({ pressed }) => [
              styles.closeBtn,
              {
                backgroundColor: theme.surfaceElevated,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <X size={16} strokeWidth={1.75} color={theme.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.grid}>
          {SERVICE_ITEMS.map(({ id, label, Icon, highlight }) => {
            const isActive = currentScreen === id;
            const iconColor = isActive
              ? theme.onAccent
              : highlight === 'secondary'
                ? theme.accentSecondary
                : theme.accent;

            return (
              <Pressable
                key={id}
                onPress={() => onSelect(id)}
                style={({ pressed }) => [
                  styles.gridItem,
                  {
                    backgroundColor: isActive
                      ? theme.accent
                      : theme.surfaceElevated,
                    borderColor: isActive ? theme.accent : theme.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Icon size={18} strokeWidth={1.75} color={iconColor} />
                <Text
                  numberOfLines={2}
                  style={[
                    styles.itemLabel,
                    {
                      color: isActive ? theme.onAccent : theme.textPrimary,
                      fontFamily: fonts.bodyMedium,
                    },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 80,
  },
  dismissArea: {
    flex: 1,
  },
  drawer: {
    marginHorizontal: spacing.md,
    marginBottom: 76,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
  },
  dragPill: {
    width: 32,
    height: 4,
    borderRadius: radius.pill,
  },
  drawerTitle: {
    fontSize: 14,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  gridItem: {
    width: '23%',
    minHeight: 68,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  itemLabel: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  },
});
