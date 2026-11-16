// mobile/src/components/PitchMap2D.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
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
            {isEsports ? '🎮 SƠ ĐỒ PHÒNG MÁY CYBER VIP' : isBadminton ? '🏸 SƠ ĐỒ CỤM SÂN CẦU LÔNG' : isPickleball ? '🎾 SƠ ĐỒ SÂN PICKLEBALL 2D' : '⚽ SƠ ĐỒ MẶT SÂN CỎ NHÂN TẠO 2D'}
          </Text>
          <Text style={styles.mapSubtitle}>Chạm trực tiếp vào vị trí sân để chọn (Sân 5 / Sân 7 / Sân 11)</Text>
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
              <Text style={styles.netLabel}>════ LƯỚI THI ĐẤU ════</Text>
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
            const price = (venue as any).defaultPrice ?? venue.basePricePerHour ?? 200000;

            return (
              <TouchableOpacity
                key={venue._id || index}
                activeOpacity={0.85}
                style={[
                  styles.courtCard,
                  venue.isComposite && styles.compositeCard,
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
                    venue.isComposite && styles.courtNumberComposite,
                    isSelected && styles.courtNumberCircleSelected,
                  ]}>
                    <Text style={[styles.courtNumberText, isSelected && styles.courtNumberTextSelected]}>
                      {venue.courtCode || index + 1}
                    </Text>
                  </View>
                  <View style={[styles.liveStatusDot, isSelected ? styles.liveStatusSelected : styles.liveStatusAvailable]} />
                </View>

                {/* Court Name */}
                <Text style={[styles.courtName, isSelected && styles.courtNameSelected]} numberOfLines={1}>
                  {venue.name}
                </Text>

                {/* Spec Tag / Composite Tag */}
                {venue.isComposite ? (
                  <View style={styles.compositeTagBox}>
                    <Text style={styles.compositeTagText}>
                      ⚡ Ghép ({venue.baseUnitCodes?.join('+') || 'N/A'})
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.courtSpecs, isSelected && styles.courtSpecsSelected]}>
                    {venue.courtCode ? `Sân chuẩn ${venue.courtCode}` : 'Sân 5 Người'}
                  </Text>
                )}

                {/* Price Pill */}
                <View style={[styles.courtPricePill, isSelected && styles.courtPricePillSelected]}>
                  <Text style={[styles.courtPriceText, isSelected && styles.courtPriceTextSelected]}>
                    {price.toLocaleString('vi-VN')} đ
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={styles.summaryTitle}>
                {isEsports ? 'Trạm máy' : 'Sân đang chọn'}: <Text style={styles.summaryHighlight}>{selectedVenue.name}</Text>
              </Text>
              {selectedVenue.courtCode && (
                <View style={styles.courtCodeTag}>
                  <Text style={styles.courtCodeTagText}>#{selectedVenue.courtCode}</Text>
                </View>
              )}
            </View>

            {selectedVenue.isComposite && (
              <Text style={styles.summaryComposite}>
                ⚡ Sân ghép linh hoạt gồm: {selectedVenue.baseUnitCodes?.join(' + ') || 'Chưa gán'}
              </Text>
            )}

            <Text style={[styles.summarySub, { fontWeight: '700', color: colors.primary, marginTop: 2 }]}>
              Giá chuẩn: {((selectedVenue as any).defaultPrice ?? selectedVenue.basePricePerHour ?? 200000).toLocaleString('vi-VN')} đ/giờ (Block 30 phút)
            </Text>
            <Text style={[styles.summarySub, { marginTop: 1 }]}>
              Giờ hoạt động: 06:00 - 23:00 (BR-01)
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
    fontSize: 12,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  activeCourtBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.success,
  },
  fieldContainer: {
    minHeight: 280,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.pitchGrassDark,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    position: 'relative',
    padding: 12,
  },
  fieldEsports: {
    backgroundColor: '#05070e',
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  fieldBadminton: {
    backgroundColor: '#064e3b',
    borderColor: 'rgba(52, 211, 153, 0.4)',
  },
  fieldPickleball: {
    backgroundColor: '#0f766e',
    borderColor: 'rgba(45, 212, 191, 0.4)',
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
    backgroundColor: colors.pitchLine,
  },
  centerCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
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
    left: 0,
    top: '35%',
    bottom: '35%',
    width: 24,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.pitchLine,
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
    borderColor: colors.pitchLine,
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
    height: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  netLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#064e3b',
    letterSpacing: 1,
  },
  badmintonKitchenTop: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: '25%',
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  badmintonKitchenBottom: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: '25%',
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  courtCenterVerticalLine: {
    position: 'absolute',
    top: 10,
    bottom: 10,
    left: '50%',
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  esportsOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
  },
  esportsStage: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 5,
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8b5cf6',
  },
  esportsStageText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#c4b5fd',
    letterSpacing: 1,
  },
  rgbUnderglow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#06b6d4',
  },
  courtsLayer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    zIndex: 2,
  },
  courtCard: {
    width: '47%',
    backgroundColor: 'rgba(17, 24, 39, 0.92)',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  compositeCard: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: 'rgba(20, 20, 30, 0.94)',
  },
  esportsCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  courtCardSelected: {
    borderColor: '#00f2fe',
    backgroundColor: 'rgba(6, 182, 212, 0.18)',
    shadowColor: '#00f2fe',
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  esportsCardSelected: {
    borderColor: '#8b5cf6',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  courtBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  courtNumberCircle: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  courtNumberComposite: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.5)',
  },
  courtNumberCircleSelected: {
    backgroundColor: '#00f2fe',
  },
  courtNumberText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'monospace',
  },
  courtNumberTextSelected: {
    color: '#090d16',
  },
  liveStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveStatusAvailable: {
    backgroundColor: colors.success,
  },
  liveStatusSelected: {
    backgroundColor: '#00f2fe',
  },
  courtName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  courtNameSelected: {
    color: '#00f2fe',
  },
  courtSpecs: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 2,
  },
  courtSpecsSelected: {
    color: '#e2e8f0',
  },
  compositeTagBox: {
    marginTop: 3,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  compositeTagText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#fbbf24',
  },
  courtPricePill: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  courtPricePillSelected: {
    backgroundColor: 'rgba(0, 242, 254, 0.25)',
  },
  courtPriceText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
  },
  courtPriceTextSelected: {
    color: '#00f2fe',
  },
  selectedBanner: {
    marginTop: 6,
    backgroundColor: '#00f2fe',
    borderRadius: 4,
    paddingVertical: 2,
    alignItems: 'center',
  },
  selectedBannerText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#090d16',
    letterSpacing: 0.5,
  },
  summaryBar: {
    marginTop: 12,
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLeft: {
    flex: 1,
    marginRight: 10,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  summaryHighlight: {
    color: '#fff',
    fontWeight: '800',
  },
  courtCodeTag: {
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.4)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  courtCodeTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#00f2fe',
    fontFamily: 'monospace',
  },
  summaryComposite: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fbbf24',
    marginTop: 2,
  },
  summarySub: {
    fontSize: 11,
    color: colors.textMuted,
  },
  readyIndicator: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  readyIndicatorText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.success,
  },
});
