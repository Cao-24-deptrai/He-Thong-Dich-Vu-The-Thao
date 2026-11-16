// mobile/src/components/TwoLineText.tsx
import React from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

interface TwoLineTextProps {
  primary: string;
  secondary?: string;
  containerStyle?: ViewStyle;
  primaryStyle?: TextStyle;
  secondaryStyle?: TextStyle;
  align?: 'left' | 'center' | 'right';
  badge?: string;
  badgeColor?: string;
}

export const TwoLineText: React.FC<TwoLineTextProps> = ({
  primary,
  secondary,
  containerStyle,
  primaryStyle,
  secondaryStyle,
  align = 'left',
  badge,
  badgeColor = colors.primary,
}) => {
  const alignmentStyle: TextStyle = {
    textAlign: align,
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={[styles.row, align === 'center' && styles.rowCenter, align === 'right' && styles.rowRight]}>
        <Text style={[styles.primary, alignmentStyle, primaryStyle]} numberOfLines={1}>
          {primary}
        </Text>
        {badge && (
          <View style={[styles.badge, { borderColor: badgeColor, backgroundColor: badgeColor + '20' }]}>
            <Text style={[styles.badgeText, { color: badgeColor }]}>{badge}</Text>
          </View>
        )}
      </View>
      {secondary ? (
        <Text style={[styles.secondary, alignmentStyle, secondaryStyle]} numberOfLines={2}>
          {secondary}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowCenter: {
    justifyContent: 'center',
  },
  rowRight: {
    justifyContent: 'flex-end',
  },
  primary: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  secondary: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary || '#cbd5e1',
    marginTop: 2,
    lineHeight: 16,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
