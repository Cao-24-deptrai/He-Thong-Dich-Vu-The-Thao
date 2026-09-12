// mobile/src/components/PitchMap2D.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { colors } from '../theme/colors';
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
  // Determine sport category
  const isEsports = sportTypes.some((s) => s.toLowerCase().includes('esport') || s.toLowerCase().includes('pc') || s.toLowerCase().includes('gaming')) ||
    venues.some((v) => v.type?.toLowerCase().includes('esport') || v.name?.toLowerCase().includes('pc') || v.name?.toLowerCase().includes('vip'));

  const isBadminton = sportTypes.some((s) => s.toLowerCase().includes('cầu lông') || s.toLowerCase().includes('badminton'));
  const isPickleball = sportTypes.some((s) => s.toLowerCase().includes('pickleball'));

  return (
    <View style={styles.container}>
      {/* Header Info */}
      <View style={styles.mapHeader}>
        <View style={styles.mapHeaderLeft}>
          <Text style={styles.mapTitle}>
            {isEsports ? '🎮 SƠ ĐỒ PHÒNG MÁY CYBER VIP' : isBadminton ? '🏸 SƠ ĐỒ CỤM SÂN CẦU LÔNG' : isPickleball ? '🏓 SƠ ĐỒ SÂN PICKLEBALL 2D' : '⚽ SƠ ĐỒ MẶT SÂN CỎ NHÂN TẠO 2D'}
          </Text>
          <Text style={styles.mapSubtitle}>Chạm trực tiếp vào vị trí sân để chọn</Text>
        </View>
        <View style={styles.activeCourtBadge}>
          <Text style={styles.activeCourtBadgeText}>
            {venues.length} Sân hoạt động
          </Text>
        </View>
      </View>

      {/* 2D Stadium / Field Container */}
      <View style={[
        styles.fieldContainer,
        isEsports && styles.fieldEsports,
        isBadminton && styles.fieldBadminton,
        isPickleball && styles.fieldPickleball,
      ]}>
        {/* Pitch Lines & Markings (Soccer) */}
        {!isEsports && !isBadminton && !isPickleball && (
          <View style={styles.soccerFieldOverlay} pointerEvents="none">
            {/* Alternating grass stripes */}
            <View style={styles.grassStripes}>
              <View style={[styles.stripe, { backgroundColor: colors.pitchGrassDark }]} />
              <View style={[styles.stripe, { backgroundColor: colors.pitchGrassLight }]} />
              <View style={[styles.stripe, { backgroundColor: colors.pitchGrassDark }]} />
              <View style={[styles.stripe, { backgroundColor: colors.pitchGrassLight }]} />
              <View style={[styles.stripe, { backgroundColor: colors.pitchGrassDark }]} />
            </View>
            {/* Center Circle & Line */}
            <View style={styles.centerLine} />
            <View style={styles.centerCircle}>
              <View style={styles.centerSpot} />
            </View>
            {/* Goal Boxes */}
            <View style={styles.topGoalBox} />
            <View style={styles.bottomGoalBox} />
          </View>
        )}

        {/* Court Lines (Badminton / Pickleball) */}
        {(isBadminton || isPickleball) && (
          <View style={styles.badmintonFieldOverlay} pointerEvents="none">
            {/* Center Net */}
            <View style={styles.badmintonNet}>
              <Text style={styles.netLabel}>━━ LƯỚI THI ĐẤU ━━</Text>
            </View>
            <View style={styles.badmintonKitchenTop} />
            <View style={styles.badmintonKitchenBottom} />
            <View style={styles.courtCenterVerticalLine} />
          </View>
        )}

        {/* Esports Gaming Stations Layout */}
        {isEsports && (
          <View style={styles.esportsOverlay} pointerEvents="none">
            <View style={styles.esportsStage}>
              <Text style={styles.esportsStageText}>★ ARENA MAIN STAGE & SPECTATOR SCREEN ★</Text>
            </View>
            <View style={styles.rgbUnderglow} />
          </View>
        )}

        {/* Interactive Courts Grid / Stations */}
        <View style={styles.courtsLayer}>
          {venues.map((venue, index) => {
            const isSelected = selectedVenue?._id === venue._id;

            return (
              <TouchableOpacity
                key={venue._id || index}
                activeOpacity={0.85}
                style={[
                  styles.courtCard,
                  isEsports && styles.esportsCard,
                  isSelected && styles.courtCardSelected,
                  isSelected && isEsports && styles.esportsCardSelected,
                ]}
                onPress={() => onSelectVenue(venue)}
              >
                {/* Court Number / Tag */}
                <View style={styles.courtBadgeRow}>
                  <View style={[
                    styles.courtNumberCircle,
                    isSelected && styles.courtNumberCircleSelected,
                  ]}>
                    <Text style={[styles.courtNumberText, isSelected && styles.courtNumberTextSelected]}>
                      {index + 1}
                    </Text>
                  </View>
                  <View style={[styles.liveStatusDot, isSelected ? styles.liveStatusSelected : styles.liveStatusAvailable]} />
                </View>

                {/* Court Name */}
                <Text style={[styles.courtName, isSelected && styles.courtNameSelected]} numberOfLines={1}>
                  {venue.name}
                </Text>

                {/* Spec Tag */}
                <Text style={[styles.courtSpecs, isSelected && styles.courtSpecsSelected]}>
                  {isEsports ? 'i9 / RTX 4080' : isBadminton ? 'Thảm Yonex' : isPickleball ? 'Sân Chuẩn QT' : 'Sân 5-7 Người'}
                </Text>

                {/* Price Pill */}
                <View style={[styles.courtPricePill, isSelected && styles.courtPricePillSelected]}>
                  <Text style={[styles.courtPriceText, isSelected && styles.courtPriceTextSelected]}>
                    {((venue as any).defaultPrice ?? venue.basePricePerHour ?? 200000).toLocaleString('vi-VN')} đ
                  </Text>
                </View>

                {/* Selection Indicator Banner */}
                {isSelected && (
                  <View style={styles.selectedBanner}>
                    <Text style={styles.selectedBannerText}>✓ ĐANG CHỌN</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Selected Venue Quick Summary Bar */}
      {selectedVenue && (
        <View style={styles.summaryBar}>
          <View style={styles.summaryLeft}>
            <Text style={styles.summaryTitle}>
              {isEsports ? 'Trạm máy' : 'Sân đang chọn'}: <Text style={styles.summaryHighlight}>{selectedVenue.name}</Text>
            </Text>
            <Text style={styles.summarySub}>
              Giá cơ sở: {((selectedVenue as any).defaultPrice ?? selectedVenue.basePricePerHour ?? 200000).toLocaleString('vi-VN')} đ/giờ • Giờ mở: 06:00 - 22:00
            </Text>
          </View>
          <View style={styles.readyIndicator}>
            <Text style={styles.readyIndicatorText}>Sẵn sàng đặt</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  mapHeaderLeft: {
    flex: 1,
  },
  mapTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  mapSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activeCourtBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  activeCourtBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
  },
  fieldContainer: {
    backgroundColor: colors.pitchGrassDark,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    overflow: 'hidden',
    position: 'relative',
    padding: 12,
    minHeight: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  fieldBadminton: {
    backgroundColor: colors.courtBadminton,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  fieldPickleball: {
    backgroundColor: colors.courtPickleball,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  fieldEsports: {
    backgroundColor: colors.esportsDark,
    borderColor: colors.esportsRgbPurple,
  },
  soccerFieldOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grassStripes: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  stripe: {
    flex: 1,
    height: '100%',
  },
  centerLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 2,
    backgroundColor: colors.pitchLine,
  },
  centerCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: colors.pitchLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerSpot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.pitchLine,
  },
  topGoalBox: {
    position: 'absolute',
    top: 0,
    width: 120,
    height: 35,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: colors.pitchLine,
  },
  bottomGoalBox: {
    position: 'absolute',
    bottom: 0,
    width: 120,
    height: 35,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: colors.pitchLine,
  },
  badmintonFieldOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badmintonNet: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    marginTop: -10,
    height: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  netLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
  },
  badmintonKitchenTop: {
    position: 'absolute',
    top: 30,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.courtBadmintonLine,
  },
  badmintonKitchenBottom: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.courtBadmintonLine,
  },
  courtCenterVerticalLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 2,
    backgroundColor: colors.courtBadmintonLine,
  },
  esportsOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
  },
  esportsStage: {
    marginTop: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.esportsRgbPurple,
  },
  esportsStageText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.esportsRgbCyan,
    letterSpacing: 0.5,
  },
  rgbUnderglow: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: colors.esportsRgbCyan,
    shadowColor: colors.esportsRgbCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
  },
  courtsLayer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    zIndex: 2,
    paddingVertical: 10,
  },
  courtCard: {
    width: '46%',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  esportsCard: {
    backgroundColor: 'rgba(17, 24, 39, 0.92)',
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  courtCardSelected: {
    borderColor: '#00f2fe',
    borderWidth: 2.5,
    backgroundColor: 'rgba(6, 78, 59, 0.95)',
    shadowColor: '#00f2fe',
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  esportsCardSelected: {
    backgroundColor: 'rgba(30, 27, 75, 0.95)',
    borderColor: colors.esportsRgbCyan,
    shadowColor: colors.esportsRgbCyan,
  },
  courtBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  courtNumberCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  courtNumberCircleSelected: {
    backgroundColor: '#00f2fe',
  },
  courtNumberText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  courtNumberTextSelected: {
    color: '#0f172a',
  },
  liveStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveStatusAvailable: {
    backgroundColor: '#10b981',
  },
  liveStatusSelected: {
    backgroundColor: '#00f2fe',
    shadowColor: '#00f2fe',
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  courtName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  courtNameSelected: {
    color: '#ffffff',
  },
  courtSpecs: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  courtSpecsSelected: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  courtPricePill: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  courtPricePillSelected: {
    backgroundColor: 'rgba(0, 242, 254, 0.25)',
  },
  courtPriceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'monospace',
  },
  courtPriceTextSelected: {
    color: '#00f2fe',
    fontWeight: '800',
  },
  selectedBanner: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#00f2fe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderBottomLeftRadius: 8,
  },
  selectedBannerText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#0f172a',
  },
  summaryBar: {
    marginTop: 10,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLeft: {
    flex: 1,
    marginRight: 10,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  summaryHighlight: {
    color: '#ffffff',
    fontWeight: '800',
  },
  summarySub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  readyIndicator: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.success,
  },
  readyIndicatorText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
});
