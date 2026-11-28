import React from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { fonts, useTheme } from '../theme/colors';

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
  badgeColor,
}) => {
  const theme = useTheme();
  const activeBadgeColor = badgeColor || theme.accent;
  const alignmentStyle: TextStyle = { textAlign: align };

  return (
    <View style={[styles.container, containerStyle]}>
      <View
        style={[
          styles.row,
          align === 'center' && styles.rowCenter,
          align === 'right' && styles.rowRight,
        ]}
      >
        <Text
          style={[
            styles.primary,
            { color: theme.textHeading, fontFamily: fonts.heading },
            alignmentStyle,
            primaryStyle,
          ]}
          numberOfLines={1}
        >
          {primary}
        </Text>
        {badge ? (
          <View
            style={[
              styles.badge,
              {
                borderColor: activeBadgeColor,
                backgroundColor: activeBadgeColor + '1A',
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: activeBadgeColor, fontFamily: fonts.bodySemiBold },
              ]}
            >
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
      {secondary ? (
        <Text
          style={[
            styles.secondary,
            { color: theme.textSecondary, fontFamily: fonts.body },
            alignmentStyle,
            secondaryStyle,
          ]}
          numberOfLines={2}
        >
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
    fontSize: 15,
    flexShrink: 1,
  },
  secondary: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 18,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
  },
});
