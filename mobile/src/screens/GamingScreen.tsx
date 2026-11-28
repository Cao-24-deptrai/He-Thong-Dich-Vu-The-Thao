import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { fonts, radius, spacing, useTheme } from '../theme/colors';
import { api } from '../api/client';
import { ScreenHeader } from '../components/ScreenHeader';
import { AppDialog } from '../components/AppDialog';

interface Props {
  onBack: () => void;
  onCheckout?: () => void;
}

interface GamingMachine {
  _id: string;
  machineCode: string;
  name?: string;
  zone?: string;
  status: string;
  hourlyPrice?: number;
  pricePerHour?: number;
  position?: {
    x?: number;
    y?: number;
    floor?: number;
    roomName?: string;
  };
  specs?:
    | string
    | {
        cpu?: string;
        ram?: string;
        gpu?: string;
        screen?: string;
      };
}

const isMachineAvailable = (status?: string) => {
  const s = (status || '').toUpperCase();
  return s === 'IDLE' || s === 'AVAILABLE';
};

export const GamingScreen: React.FC<Props> = ({ onBack }) => {
  const theme = useTheme();
  const [cluster, setCluster] = useState<'LOBBY' | 'VIP'>('LOBBY');
  const [machines, setMachines] = useState<GamingMachine[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [dialog, setDialog] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  const loadMachines = async () => {
    try {
      setLoading(true);
      const data = await api.getGamingMachines();
      setMachines(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load gaming machines:', err);
      setMachines([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMachines();
  }, []);

  const filteredMachines = machines.filter((m) => {
    const z = (m.zone || '').toUpperCase();
    const isVipOrEsport = z.includes('VIP') || z.includes('STREAM') || z.includes('ESPORT');
    if (cluster === 'VIP') return isVipOrEsport;
    return !isVipOrEsport;
  });

  const vipRooms = Object.values(
    machines
      .filter((m) => {
        const z = (m.zone || '').toUpperCase();
        return z.includes('VIP') || z.includes('STREAM') || z.includes('ESPORT');
      })
      .reduce<
        Record<
          string,
          {
            roomName: string;
            total: number;
            available: number;
            gpu: string;
            screen: string;
            price: number;
          }
        >
      >((acc, m) => {
        const roomName = m.position?.roomName || 'Phòng VIP';
        if (!acc[roomName]) {
          const specObj = typeof m.specs === 'object' && m.specs ? m.specs : undefined;
          acc[roomName] = {
            roomName,
            total: 0,
            available: 0,
            gpu: specObj?.gpu || 'RTX 4090',
            screen: specObj?.screen || '240Hz',
            price: m.hourlyPrice ?? m.pricePerHour ?? 15000,
          };
        }
        acc[roomName].total += 1;
        if (isMachineAvailable(m.status)) {
          acc[roomName].available += 1;
        }
        return acc;
      }, {})
  );

  const togglePc = (id: string, status: string) => {
    if (!isMachineAvailable(status)) return;
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= 16) {
        setDialog({
          visible: true,
          title: 'Giới hạn đặt online',
          message: 'Mỗi đơn online đặt tối đa 16 máy để tránh khóa phòng máy ảo.',
        });
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleStartSession = async () => {
    if (selectedIds.length === 0) {
      setDialog({
        visible: true,
        title: 'Chưa chọn máy',
        message: 'Vui lòng chọn ít nhất 1 máy trống trên sơ đồ.',
      });
      return;
    }

    try {
      setStarting(true);
      await Promise.all(
        selectedIds.map((machineId) =>
          api.startGamingSession({ machineId, depositAmount: 50000 })
        )
      );
      setDialog({
        visible: true,
        title: 'Đã mở phiên chơi thành công',
        message: `Đã khởi tạo phiên chơi cho ${selectedIds.length} máy đã chọn.`,
      });
      setSelectedIds([]);
      await loadMachines();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Vui lòng đăng nhập hoặc kiểm tra số dư ví.';
      setDialog({ visible: true, title: 'Không thể đặt máy', message: msg });
    } finally {
      setStarting(false);
    }
  };

  const totalEstimate = machines
    .filter((m) => selectedIds.includes(m._id))
    .reduce((sum, m) => sum + (m.hourlyPrice ?? m.pricePerHour ?? (cluster === 'VIP' ? 15000 : 10000)), 0);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Cyber Esports 100 máy"
        onBack={onBack}
        rightElement={
          <Pressable
            onPress={() =>
              setDialog({
                visible: true,
                title: 'Quy tắc Cyber Gaming',
                message:
                  'Tối đa 16 máy mỗi đơn online. Đơn lớn hơn vui lòng đặt trực tiếp tại quầy. Sảnh trang bị RTX 4080, phòng VIP trang bị RTX 4090.',
              })
            }
          >
            <Text style={[styles.ruleLink, { color: theme.accent, fontFamily: fonts.bodySemiBold }]}>
              Quy định
            </Text>
          </Pressable>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <View style={[styles.ruleBanner, { backgroundColor: theme.surface, borderColor: theme.borderAccent }]}>
          <View>
            <Text style={[styles.ruleTag, { color: theme.textSecondary, fontFamily: fonts.body }]}>
              Quy định đặt online
            </Text>
            <Text style={[styles.ruleMain, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
              Tối đa 16 máy / đơn
            </Text>
          </View>
          <View style={[styles.activeBadge, { backgroundColor: theme.accent }]}>
            <Text style={[styles.activeBadgeText, { color: theme.onAccent, fontFamily: fonts.bodySemiBold }]}>
              {machines.length} máy hoạt động
            </Text>
          </View>
        </View>

        <View style={styles.tabRow}>
          <Pressable
            onPress={() => setCluster('LOBBY')}
            style={[
              styles.tabBtn,
              {
                backgroundColor: cluster === 'LOBBY' ? theme.accent : theme.surfaceElevated,
                borderColor: cluster === 'LOBBY' ? theme.accent : theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: cluster === 'LOBBY' ? theme.onAccent : theme.textSecondary,
                  fontFamily: fonts.bodySemiBold,
                },
              ]}
            >
              Sảnh chính (50 máy)
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setCluster('VIP')}
            style={[
              styles.tabBtn,
              {
                backgroundColor: cluster === 'VIP' ? theme.accent : theme.surfaceElevated,
                borderColor: cluster === 'VIP' ? theme.accent : theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: cluster === 'VIP' ? theme.onAccent : theme.textSecondary,
                  fontFamily: fonts.bodySemiBold,
                },
              ]}
            >
              Phòng VIP & Esports (50 máy)
            </Text>
          </Pressable>
        </View>

        <View style={[styles.matrixCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.matrixHeader}>
            <Text style={[styles.matrixTitle, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
              Sơ đồ chọn máy
            </Text>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.accent }]} />
                <Text style={[styles.legendText, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                  Chọn
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.danger }]} />
                <Text style={[styles.legendText, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                  Bận
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { borderWidth: 1, borderColor: theme.borderLight }]} />
                <Text style={[styles.legendText, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                  Trống
                </Text>
              </View>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator color={theme.accent} style={{ marginVertical: spacing.lg }} />
          ) : filteredMachines.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: fonts.body }]}>
              Chưa có dữ liệu máy trong khu vực này.
            </Text>
          ) : (
            <View style={styles.pcGrid}>
              {filteredMachines.map((m) => {
                const isBusy = !isMachineAvailable(m.status);
                const isSelected = selectedIds.includes(m._id);

                return (
                  <Pressable
                    key={m._id}
                    disabled={isBusy}
                    onPress={() => togglePc(m._id, m.status)}
                    style={[
                      styles.pcBtn,
                      {
                        backgroundColor: isBusy
                          ? theme.dangerSoft
                          : isSelected
                            ? theme.accent
                            : theme.surfaceElevated,
                        borderColor: isBusy
                          ? theme.danger
                          : isSelected
                            ? theme.accent
                            : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.pcText,
                        {
                          color: isBusy
                            ? theme.danger
                            : isSelected
                              ? theme.onAccent
                              : theme.textPrimary,
                          fontFamily: fonts.bodySemiBold,
                        },
                      ]}
                    >
                      {m.machineCode}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <Text style={[styles.selectedInfo, { color: theme.textSecondary, fontFamily: fonts.body }]}>
            Đang chọn:{' '}
            <Text style={{ color: theme.accent, fontFamily: fonts.bodySemiBold }}>
              {selectedIds.length} máy
            </Text>{' '}
            (tối đa 16 máy)
          </Text>
        </View>

        {vipRooms.length > 0 ? (
          <View style={styles.vipSection}>
            <Text style={[styles.vipSectionTitle, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
              Phòng VIP & Thi đấu Esports ({vipRooms.length} khu vực)
            </Text>
            <View style={styles.vipGrid}>
              {vipRooms.map((room) => {
                const isFull = room.available === 0;
                const isAllFree = room.available === room.total;
                const statusLabel = isFull
                  ? 'HẾT MÁY'
                  : isAllFree
                    ? `TRỐNG ${room.available}/${room.total}`
                    : `CÒN ${room.available} MÁY`;
                const statusColor = isFull
                  ? theme.danger
                  : isAllFree
                    ? theme.success
                    : theme.warning;
                return (
                  <Pressable
                    key={room.roomName}
                    onPress={() => setCluster('VIP')}
                    style={[
                      styles.vipCard,
                      { backgroundColor: theme.surface, borderColor: theme.border },
                    ]}
                  >
                    <View style={styles.vipCardTop}>
                      <Text
                        numberOfLines={1}
                        style={[styles.vipRoomName, { color: theme.textHeading, fontFamily: fonts.headingBold }]}
                      >
                        {room.roomName}
                      </Text>
                      <Text style={[styles.vipStatus, { color: statusColor, fontFamily: fonts.bodySemiBold }]}>
                        {statusLabel}
                      </Text>
                    </View>
                    <Text style={[styles.vipSpec, { color: theme.textPrimary, fontFamily: fonts.bodySemiBold }]}>
                      {room.gpu}
                    </Text>
                    <Text numberOfLines={1} style={[styles.vipSub, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                      {room.screen}
                    </Text>
                    <Text style={[styles.vipPrice, { color: theme.accent, fontFamily: fonts.headingBold }]}>
                      {room.price.toLocaleString('vi-VN')} đ/h
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <Pressable
          disabled={starting}
          onPress={handleStartSession}
          style={({ pressed }) => [
            styles.ctaBtn,
            { backgroundColor: theme.accent, opacity: starting ? 0.6 : pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[styles.ctaText, { color: theme.onAccent, fontFamily: fonts.bodySemiBold }]}>
            Đặt {selectedIds.length} máy ({totalEstimate.toLocaleString('vi-VN')} đ/giờ)
          </Text>
        </Pressable>
      </ScrollView>

      <AppDialog
        visible={dialog.visible}
        title={dialog.title}
        message={dialog.message}
        onClose={() => setDialog((d) => ({ ...d, visible: false }))}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  ruleLink: { fontSize: 12 },
  body: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  ruleBanner: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  ruleTag: { fontSize: 11 },
  ruleMain: { fontSize: 15, marginTop: 2 },
  activeBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill },
  activeBadgeText: { fontSize: 11 },
  tabRow: { flexDirection: 'row', gap: spacing.sm },
  tabBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  tabText: { fontSize: 12, textAlign: 'center' },
  matrixCard: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.md },
  matrixHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  matrixTitle: { fontSize: 14 },
  legendRow: { flexDirection: 'row', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 11 },
  emptyText: { fontSize: 12, textAlign: 'center', paddingVertical: spacing.lg },
  pcGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pcBtn: {
    width: '15%',
    minHeight: 38,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pcText: { fontSize: 10 },
  selectedInfo: { fontSize: 12, textAlign: 'center' },
  vipSection: { gap: spacing.sm },
  vipSectionTitle: { fontSize: 14 },
  vipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  vipCard: {
    width: '48.5%',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: 4,
  },
  vipCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 },
  vipRoomName: { fontSize: 13, flex: 1 },
  vipStatus: { fontSize: 10 },
  vipSpec: { fontSize: 12 },
  vipSub: { fontSize: 11 },
  vipPrice: { fontSize: 13, marginTop: 2 },
  ctaBtn: { minHeight: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xs },
  ctaText: { fontSize: 14 },
});
