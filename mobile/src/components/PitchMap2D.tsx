import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { fonts, radius, spacing, useTheme } from '../theme/colors';
import { Venue } from '../types';

interface PitchMap2DProps {
  venues: Venue[];
  selectedVenue: Venue | null;
  onSelectVenue: (venue: Venue) => void;
  sportTypes?: string[];
}

export const PitchMap2D: React.FC<PitchMap2DProps> = ({
  venues,
  selectedVenue,
  onSelectVenue,
  sportTypes = [],
}) => {
  const theme = useTheme();

  const isEsports =
    sportTypes.some(
      (s) =>
        s.toLowerCase().includes('esport') ||
        s.toLowerCase().includes('pc') ||
        s.toLowerCase().includes('gaming')
    ) ||
    venues.some(
      (v) =>
        v.type?.toLowerCase().includes('esport') ||
        v.name?.toLowerCase().includes('pc') ||
        v.name?.toLowerCase().includes('vip')
    );

  const isBasketball =
    sportTypes.some(
      (s) =>
        s.toLowerCase().includes('bóng rổ') ||
        s.toLowerCase().includes('basketball')
    ) ||
    venues.some(
      (v) =>
        v.type?.toLowerCase().includes('basketball') ||
        v.name?.toLowerCase().includes('bóng rổ')
    );

  const isBadminton =
    sportTypes.some(
      (s) =>
        s.toLowerCase().includes('cầu lông') ||
        s.toLowerCase().includes('badminton')
    ) ||
    venues.some(
      (v) =>
        v.type?.toLowerCase().includes('badminton') ||
        v.name?.toLowerCase().includes('cầu lông')
    );

  const isPickleball =
    sportTypes.some((s) => s.toLowerCase().includes('pickleball')) ||
    venues.some(
      (v) =>
        v.type?.toLowerCase().includes('pickleball') ||
        v.name?.toLowerCase().includes('pickleball')
    );

  const isTennis =
    sportTypes.some(
      (s) =>
        s.toLowerCase().includes('tennis') ||
        s.toLowerCase().includes('quần vợt')
    ) ||
    venues.some(
      (v) =>
        v.type?.toLowerCase().includes('tennis') ||
        v.name?.toLowerCase().includes('tennis') ||
        v.name?.toLowerCase().includes('quần vợt')
    );

  const isVolleyball =
    sportTypes.some(
      (s) =>
        s.toLowerCase().includes('bóng chuyền') ||
        s.toLowerCase().includes('volleyball')
    ) ||
    venues.some(
      (v) =>
        v.type?.toLowerCase().includes('volleyball') ||
        v.name?.toLowerCase().includes('bóng chuyền')
    );

  const mapTitle = isEsports
    ? 'Sơ đồ phòng máy Cyber VIP'
    : isBasketball
      ? 'Sơ đồ sân bóng rổ tiêu chuẩn'
      : isBadminton
        ? 'Sơ đồ cụm sân cầu lông'
        : isPickleball
          ? 'Sơ đồ sân Pickleball'
          : isTennis
            ? 'Sơ đồ sân quần vợt Tennis'
            : isVolleyball
              ? 'Sơ đồ sân bóng chuyền'
              : 'Sơ đồ mặt sân cỏ 2D';

  return (
    <View style={styles.container}>
      <View style={styles.mapHeader}>
        <View style={styles.mapHeaderLeft}>
          <Text
            style={[
              styles.mapTitle,
              { color: theme.textHeading, fontFamily: fonts.headingBold },
            ]}
          >
            {mapTitle}
          </Text>
          <Text
            style={[
              styles.mapSubtitle,
              { color: theme.textSecondary, fontFamily: fonts.body },
            ]}
          >
            Chạm vào vị trí sân để chọn khung giờ
          </Text>
        </View>
        <View
          style={[
            styles.activeCourtBadge,
            {
              backgroundColor: theme.accentSoft,
              borderColor: theme.borderAccent,
            },
          ]}
        >
          <Text
            style={[
              styles.activeCourtBadgeText,
              { color: theme.accent, fontFamily: fonts.bodySemiBold },
            ]}
          >
            {venues.length} sân hoạt động
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.fieldContainer,
          {
            backgroundColor: isEsports
              ? theme.esportsDark
              : isBadminton
                ? theme.courtBadminton
                : isPickleball
                  ? theme.courtPickleball
                  : theme.pitchGrassDark,
            borderColor: theme.border,
          },
        ]}
      >
        {!isEsports && !isBadminton && !isPickleball ? (
          <View style={styles.soccerFieldOverlay} pointerEvents="none">
            <View style={styles.grassStripes}>
              <View style={[styles.stripe, { backgroundColor: theme.pitchGrassDark }]} />
              <View style={[styles.stripe, { backgroundColor: theme.pitchGrassLight }]} />
              <View style={[styles.stripe, { backgroundColor: theme.pitchGrassDark }]} />
              <View style={[styles.stripe, { backgroundColor: theme.pitchGrassLight }]} />
              <View style={[styles.stripe, { backgroundColor: theme.pitchGrassDark }]} />
            </View>
            <View style={[styles.centerLine, { backgroundColor: theme.pitchLine }]} />
            <View style={[styles.centerCircle, { borderColor: theme.pitchLine }]} />
            <View style={[styles.topGoalBox, { borderColor: theme.pitchLine }]} />
            <View style={[styles.bottomGoalBox, { borderColor: theme.pitchLine }]} />
          </View>
        ) : null}

        {(isBadminton || isPickleball) ? (
          <View style={styles.badmintonFieldOverlay} pointerEvents="none">
            <View style={styles.badmintonNet}>
              <Text style={[styles.netLabel, { fontFamily: fonts.bodySemiBold }]}>
                Lưới thi đấu
              </Text>
            </View>
            <View style={styles.courtCenterVerticalLine} />
          </View>
        ) : null}

        {isEsports ? (
          <View style={styles.esportsOverlay} pointerEvents="none">
            <View style={styles.esportsStage}>
              <Text style={[styles.esportsStageText, { fontFamily: fonts.heading }]}>
                Khu vực sân khấu chính
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.courtsLayer}>
          {venues.map((venue, index) => {
            const isSelected = selectedVenue?._id === venue._id;
            const price =
              (venue as { defaultPrice?: number }).defaultPrice ??
              venue.basePricePerHour ??
              200000;

            return (
              <Pressable
                key={venue._id || index}
                style={({ pressed }) => [
                  styles.courtCard,
                  {
                    backgroundColor: isSelected
                      ? theme.surface
                      : 'rgba(15, 17, 16, 0.86)',
                    borderColor: isSelected ? theme.accent : 'rgba(255,255,255,0.2)',
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                onPress={() => onSelectVenue(venue)}
              >
                <View style={styles.courtBadgeRow}>
                  <View
                    style={[
                      styles.courtNumberCircle,
                      {
                        backgroundColor: isSelected
                          ? theme.accent
                          : 'rgba(255,255,255,0.12)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.courtNumberText,
                        {
                          color: isSelected ? theme.onAccent : '#FFFFFF',
                          fontFamily: fonts.headingBold,
                        },
                      ]}
                    >
                      {venue.courtCode || index + 1}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.courtName,
                    {
                      color: isSelected ? theme.accent : '#FFFFFF',
                      fontFamily: fonts.heading,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {venue.name}
                </Text>

                {venue.isComposite ? (
                  <View style={styles.compositeTagBox}>
                    <Text style={[styles.compositeTagText, { fontFamily: fonts.bodySemiBold }]}>
                      Ghép ({venue.baseUnitCodes?.join('+') || 'N/A'})
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.courtSpecs, { fontFamily: fonts.body }]}>
                    {venue.courtCode ? `Sân chuẩn ${venue.courtCode}` : 'Sân 5 người'}
                  </Text>
                )}

                <View style={styles.courtPricePill}>
                  <Text
                    style={[
                      styles.courtPriceText,
                      {
                        color: isSelected ? theme.accent : '#E2E8F0',
                        fontFamily: fonts.heading,
                      },
                    ]}
                  >
                    {price.toLocaleString('vi-VN')} đ
                  </Text>
                </View>

                {isSelected ? (
                  <View
                    style={[
                      styles.selectedBanner,
                      { backgroundColor: theme.accent },
                    ]}
                  >
                    <Check size={10} strokeWidth={2.5} color={theme.onAccent} />
                    <Text
                      style={[
                        styles.selectedBannerText,
                        { color: theme.onAccent, fontFamily: fonts.bodySemiBold },
                      ]}
                    >
                      Đang chọn
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      {selectedVenue ? (
        <View
          style={[
            styles.summaryBar,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.summaryLeft}>
            <View style={styles.summaryTitleRow}>
              <Text
                style={[
                  styles.summaryTitle,
                  { color: theme.textSecondary, fontFamily: fonts.body },
                ]}
              >
                {isEsports ? 'Trạm máy' : 'Sân đang chọn'}:{' '}
                <Text
                  style={{
                    color: theme.textHeading,
                    fontFamily: fonts.headingBold,
                  }}
                >
                  {selectedVenue.name}
                </Text>
              </Text>
              {selectedVenue.courtCode ? (
                <View
                  style={[
                    styles.courtCodeTag,
                    {
                      backgroundColor: theme.accentSoft,
                      borderColor: theme.borderAccent,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.courtCodeTagText,
                      { color: theme.accent, fontFamily: fonts.heading },
                    ]}
                  >
                    #{selectedVenue.courtCode}
                  </Text>
                </View>
              ) : null}
            </View>

            {selectedVenue.isComposite ? (
              <Text
                style={[
                  styles.summaryComposite,
                  { color: theme.warning, fontFamily: fonts.bodyMedium },
                ]}
              >
                Sân ghép gồm: {selectedVenue.baseUnitCodes?.join(' + ') || 'Chưa gán'}
              </Text>
            ) : null}

            <Text
              style={[
                styles.summarySub,
                { color: theme.accent, fontFamily: fonts.bodySemiBold, marginTop: 4 },
              ]}
            >
              Giá chuẩn:{' '}
              {(
                (selectedVenue as { defaultPrice?: number }).defaultPrice ??
                selectedVenue.basePricePerHour ??
                200000
              ).toLocaleString('vi-VN')}{' '}
              đ/giờ (Khung 30 phút)
            </Text>
            <Text
              style={[
                styles.summarySub,
                { color: theme.textMuted, fontFamily: fonts.body, marginTop: 2 },
              ]}
            >
              Giờ hoạt động: 06:00 - 23:00
            </Text>
          </View>
          <View
            style={[
              styles.readyIndicator,
              {
                backgroundColor: theme.successSoft,
                borderColor: theme.borderAccent,
              },
            ]}
          >
            <Text
              style={[
                styles.readyIndicatorText,
                { color: theme.success, fontFamily: fonts.bodySemiBold },
              ]}
            >
              Sẵn sàng
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  mapHeaderLeft: {
    flex: 1,
  },
  mapTitle: {
    fontSize: 15,
  },
  mapSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  activeCourtBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  activeCourtBadgeText: {
    fontSize: 11,
  },
  fieldContainer: {
    minHeight: 260,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
    padding: spacing.md,
  },
  soccerFieldOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grassStripes: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  stripe: {
    flex: 1,
  },
  centerLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 2,
  },
  centerCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
  },
  topGoalBox: {
    position: 'absolute',
    left: 0,
    top: '35%',
    bottom: '35%',
    width: 24,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 2,
  },
  bottomGoalBox: {
    position: 'absolute',
    right: 0,
    top: '35%',
    bottom: '35%',
    width: 24,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
  },
  badmintonFieldOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badmintonNet: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  netLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.85)',
  },
  courtCenterVerticalLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  esportsOverlay: {
    ...StyleSheet.absoluteFillObject,
    paddingTop: spacing.sm,
    alignItems: 'center',
  },
  esportsStage: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  esportsStageText: {
    fontSize: 11,
    color: '#E2E8F0',
  },
  courtsLayer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  courtCard: {
    width: '48%',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  courtBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  courtNumberCircle: {
    minWidth: 28,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courtNumberText: {
    fontSize: 11,
  },
  courtName: {
    fontSize: 13,
  },
  courtSpecs: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 2,
  },
  compositeTagBox: {
    marginTop: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  compositeTagText: {
    fontSize: 10,
    color: '#FBBF24',
  },
  courtPricePill: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  courtPriceText: {
    fontSize: 11,
  },
  selectedBanner: {
    marginTop: spacing.sm,
    borderRadius: 6,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  selectedBannerText: {
    fontSize: 10,
  },
  summaryBar: {
    marginTop: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  summaryLeft: {
    flex: 1,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  summaryTitle: {
    fontSize: 13,
  },
  courtCodeTag: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  courtCodeTagText: {
    fontSize: 11,
  },
  summaryComposite: {
    fontSize: 11,
    marginTop: 4,
  },
  summarySub: {
    fontSize: 11,
  },
  readyIndicator: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  readyIndicatorText: {
    fontSize: 11,
  },
});
