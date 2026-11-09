// mobile/src/screens/ContractsScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { colors } from '../theme/colors';
import { TwoLineText } from '../components/TwoLineText';

interface FixedContract {
  id: string;
  code: string;
  teamName: string;
  sport: 'SOCCER' | 'BADMINTON' | 'TENNIS' | 'PICKLEBALL';
  venueName: string;
  schedule: string;
  startDate: string;
  endDate: string;
  totalSessions: number;
  completedSessions: number;
  totalAmount: number;
  paidAmount: number;
  status: 'ACTIVE' | 'PENDING_DEPOSIT' | 'COMPLETED' | 'EXPIRED';
  nextMatch: string;
}

export const ContractsScreen: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'PENDING_DEPOSIT'>('ALL');
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [newTeamName, setNewTeamName] = useState<string>('');
  const [newSport, setNewSport] = useState<string>('SOCCER');
  const [newSessionsPerWeek, setNewSessionsPerWeek] = useState<string>('2');
  const [newNotes, setNewNotes] = useState<string>('');

  const [contractsList, setContractsList] = useState<FixedContract[]>([
    {
      id: 'CTR-01',
      code: 'HĐ-2026-CLB01',
      teamName: 'CLB Bóng Đá Báo Thủ Q7',
      sport: 'SOCCER',
      venueName: 'Sân Bóng 7A (Cụm Sân Trung Tâm Q7)',
      schedule: 'Thứ 2 & Thứ 5 hàng tuần | 18:30 - 20:30',
      startDate: '01/10/2026',
      endDate: '31/12/2026',
      totalSessions: 26,
      completedSessions: 9,
      totalAmount: 18200000,
      paidAmount: 9100000,
      status: 'ACTIVE',
      nextMatch: '18:30 Tối nay (Sân 7A)',
    },
    {
      id: 'CTR-02',
      code: 'HĐ-2026-VTL04',
      teamName: 'Đội Thể Thao Viettel Q7',
      sport: 'BADMINTON',
      venueName: 'Sân Cầu Lông 01 & 02 (Nhà Thi Đấu A)',
      schedule: 'Thứ 3 & Thứ 7 hàng tuần | 17:30 - 19:30',
      startDate: '15/09/2026',
      endDate: '15/12/2026',
      totalSessions: 28,
      completedSessions: 14,
      totalAmount: 11200000,
      paidAmount: 11200000,
      status: 'ACTIVE',
      nextMatch: '17:30 Thứ 7 (Sân Cầu Lông 01-02)',
    },
    {
      id: 'CTR-03',
      code: 'HĐ-2026-FPT09',
      teamName: 'CLB Pickleball FPT Software',
      sport: 'PICKLEBALL',
      venueName: 'Sân Pickleball PK-03 (Mái Che VIP)',
      schedule: 'Chủ Nhật hàng tuần | 07:00 - 10:00',
      startDate: '01/11/2026',
      endDate: '31/01/2027',
      totalSessions: 14,
      completedSessions: 0,
      totalAmount: 8400000,
      paidAmount: 2000000,
      status: 'PENDING_DEPOSIT',
      nextMatch: '07:00 Chủ Nhật 01/11',
    },
  ]);

  const filteredContracts = contractsList.filter((c) => {
    if (filterStatus === 'ALL') return true;
    return c.status === filterStatus;
  });

  const handleRegisterContract = () => {
    if (!newTeamName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên CLB hoặc Tổ Chức / Doanh Nghiệp!');
      return;
    }
    const newContract: FixedContract = {
      id: `CTR-${Date.now().toString().slice(-4)}`,
      code: `HĐ-2026-NEW${Math.floor(Math.random() * 90 + 10)}`,
      teamName: newTeamName.trim(),
      sport: (newSport as any) || 'SOCCER',
      venueName: 'Sân Trung Tâm (Chờ Quản Lý Gán Sân)',
      schedule: `${newSessionsPerWeek} buổi/tuần | Cố định dài hạn`,
      startDate: '01/11/2026',
      endDate: '31/01/2027',
      totalSessions: parseInt(newSessionsPerWeek, 10) * 12,
      completedSessions: 0,
      totalAmount: parseInt(newSessionsPerWeek, 10) * 12 * 600000,
      paidAmount: 0,
      status: 'PENDING_DEPOSIT',
      nextMatch: 'Chờ thanh toán tiền cọc giữ sân',
    };

    setContractsList([newContract, ...contractsList]);
    setShowRegisterModal(false);
    setNewTeamName('');
    setNewNotes('');
    Alert.alert(
      'Gửi Đăng Ký Thành Công',
      `Hợp đồng ${newContract.code} đã được tạo thành công! Vui lòng đặt cọc giữ sân để kích hoạt slot cố định.`
    );
  };

  const handlePayNextInstallment = (contract: FixedContract) => {
    const remaining = contract.totalAmount - contract.paidAmount;
    if (remaining <= 0) {
      Alert.alert('Đã Tất Toán', 'Hợp đồng này đã được thanh toán 100%!');
      return;
    }
    Alert.alert(
      'Thanh Toán Kỳ Tiếp Theo',
      `Xác nhận thanh toán ${remaining.toLocaleString('vi-VN')} đ cho Hợp đồng ${contract.code} qua Ví Phanta Pay?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Thanh Toán Ngay',
          onPress: () => {
            setContractsList((prev) =>
              prev.map((c) =>
                c.id === contract.id
                  ? { ...c, paidAmount: c.totalAmount, status: 'ACTIVE' }
                  : c
              )
            );
            Alert.alert('Thành Công', 'Đã thanh toán hợp đồng cố định thành công!');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>
          )}
          <TwoLineText
            primary="Hợp Đồng Thuê Cố Định"
            secondary="Dành cho CLB / Doanh Nghiệp / Nhóm Bạn Giữ Khung Giờ Vàng"
            badge="CHIẾT KHẤU 15%"
            badgeColor="#10b981"
          />
        </View>

        {/* Benefits banner */}
        <View style={styles.bannerCard}>
          <Text style={styles.bannerTitle}>ĐẶC QUYỀN THUÊ SÂN CỐ ĐỊNH DÀI HẠN</Text>
          <Text style={styles.bannerSub}>
            Ưu tiên giữ sân 100% đúng khung giờ • Chiết khấu 15-20% • Đổi lịch linh hoạt khi mưa • Hỗ trợ xuất Hóa đơn VAT Doanh Nghiệp
          </Text>
        </View>

        {/* Action button & Tabs */}
        <View style={styles.actionRow}>
          <View style={styles.tabsRow}>
            {(['ALL', 'ACTIVE', 'PENDING_DEPOSIT'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setFilterStatus(tab)}
                style={[styles.tabBtn, filterStatus === tab && styles.tabBtnActive]}
              >
                <Text style={[styles.tabText, filterStatus === tab && styles.tabTextActive]}>
                  {tab === 'ALL'
                    ? 'Tất Cả'
                    : tab === 'ACTIVE'
                    ? 'Đang Hiệu Lực'
                    : 'Chờ Đặt Cọc'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => setShowRegisterModal(true)}
          >
            <Text style={styles.registerBtnText}>+ Ký Hợp Đồng</Text>
          </TouchableOpacity>
        </View>

        {/* Contracts List */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {filteredContracts.map((contract) => {
            const progress = Math.round(
              (contract.completedSessions / (contract.totalSessions || 1)) * 100
            );
            const remaining = contract.totalAmount - contract.paidAmount;

            return (
              <View key={contract.id} style={styles.contractCard}>
                {/* Top card header */}
                <View style={styles.cardHeader}>
                  <View>
                    <View style={styles.codeRow}>
                      <Text style={styles.contractCode}>{contract.code}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          contract.status === 'ACTIVE'
                            ? styles.statusActive
                            : styles.statusPending,
                        ]}
                      >
                        <Text style={styles.statusText}>
                          {contract.status === 'ACTIVE' ? 'ĐANG HIỆU LỰC' : 'CHỜ ĐẶT CỌC'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.teamName}>{contract.teamName}</Text>
                  </View>
                  <Text style={styles.sportBadge}>
                    {contract.sport === 'SOCCER'
                      ? '⚽ Bóng Đá'
                      : contract.sport === 'BADMINTON'
                      ? '🏸 Cầu Lông'
                      : '🏓 Pickleball'}
                  </Text>
                </View>

                {/* Details Section */}
                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>Sân & Vị Trí:</Text>
                  <Text style={styles.detailValue}>{contract.venueName}</Text>

                  <Text style={styles.detailLabel}>Lịch Thi Đấu:</Text>
                  <Text style={styles.detailHighlight}>{contract.schedule}</Text>

                  <Text style={styles.detailLabel}>Trận Tiếp Theo:</Text>
                  <Text style={styles.nextMatchText}>{contract.nextMatch}</Text>
                </View>

                {/* Progress bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Tiến độ thi đấu:</Text>
                    <Text style={styles.progressPercent}>
                      {contract.completedSessions}/{contract.totalSessions} buổi ({progress}%)
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                  </View>
                </View>

                {/* Financial summary */}
                <View style={styles.financeRow}>
                  <View>
                    <Text style={styles.financeLabel}>Tổng Giá Trị Hợp Đồng</Text>
                    <Text style={styles.financeValue}>
                      {contract.totalAmount.toLocaleString('vi-VN')} đ
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.financeLabel}>
                      {remaining > 0 ? 'Còn Cần Thanh Toán' : 'Tình Trạng'}
                    </Text>
                    <Text
                      style={[
                        styles.financeRemaining,
                        remaining === 0 && { color: colors.volt },
                      ]}
                    >
                      {remaining > 0
                        ? `${remaining.toLocaleString('vi-VN')} đ`
                        : 'ĐÃ TẤT TOÁN 100%'}
                    </Text>
                  </View>
                </View>

                {/* Card Action Buttons */}
                <View style={styles.cardActions}>
                  {remaining > 0 ? (
                    <TouchableOpacity
                      style={styles.payBtn}
                      onPress={() => handlePayNextInstallment(contract)}
                    >
                      <Text style={styles.payBtnText}>
                        💳 Thanh Toán Kế Tiếp ({remaining.toLocaleString('vi-VN')} đ)
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.completedBtn}
                      onPress={() =>
                        Alert.alert('Lịch Thi Đấu', `Lịch đấu: ${contract.schedule}`)
                      }
                    >
                      <Text style={styles.completedBtnText}>📅 Xem Sổ Lịch Đấu Chi Tiết</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Modal Đăng Ký Hợp Đồng Thuê Cố Định */}
        <Modal
          visible={showRegisterModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowRegisterModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Ký Hợp Đồng Thuê Sân Cố Định</Text>
                <TouchableOpacity onPress={() => setShowRegisterModal(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                <Text style={styles.inputLabel}>Tên CLB / Tổ Chức / Doanh Nghiệp *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ví dụ: FC Báo Thủ / Doanh Nghiệp FPT Q7"
                  placeholderTextColor="#64748b"
                  value={newTeamName}
                  onChangeText={setNewTeamName}
                />

                <Text style={styles.inputLabel}>Môn Thể Thao Thuê Cố Định</Text>
                <View style={styles.modalSportRow}>
                  {[
                    { id: 'SOCCER', label: 'Bóng Đá' },
                    { id: 'BADMINTON', label: 'Cầu Lông' },
                    { id: 'TENNIS', label: 'Tennis' },
                    { id: 'PICKLEBALL', label: 'Pickleball' },
                  ].map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => setNewSport(s.id)}
                      style={[
                        styles.modalSportBtn,
                        newSport === s.id && styles.modalSportBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.modalSportText,
                          newSport === s.id && styles.modalSportTextActive,
                        ]}
                      >
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Số Buổi Cố Định Mỗi Tuần</Text>
                <View style={styles.modalSportRow}>
                  {['1', '2', '3', '4'].map((num) => (
                    <TouchableOpacity
                      key={num}
                      onPress={() => setNewSessionsPerWeek(num)}
                      style={[
                        styles.modalSportBtn,
                        newSessionsPerWeek === num && styles.modalSportBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.modalSportText,
                          newSessionsPerWeek === num && styles.modalSportTextActive,
                        ]}
                      >
                        {num} Buổi/Tuần
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Ghi Chú Khung Giờ Mong Muốn</Text>
                <TextInput
                  style={[styles.input, { height: 70 }]}
                  placeholder="Ví dụ: Thứ 2 và Thứ 5 từ 18:30 - 20:30, cần xuất HĐ VAT..."
                  placeholderTextColor="#64748b"
                  multiline
                  value={newNotes}
                  onChangeText={setNewNotes}
                />

                <View style={styles.modalBenefitBox}>
                  <Text style={styles.modalBenefitText}>
                    💡 Khách hàng ký hợp đồng từ 3 tháng trở lên được giảm 15% tổng giá trị và ưu tiên chọn sân trung tâm có khán đài.
                  </Text>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowRegisterModal(false)}
                >
                  <Text style={styles.cancelBtnText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={handleRegisterContract}
                >
                  <Text style={styles.confirmBtnText}>Xác Nhận Đăng Ký</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  header: { marginBottom: 12 },
  backBtn: { marginBottom: 6 },
  backText: { color: colors.volt, fontSize: 20, fontWeight: 'bold' },
  bannerCard: {
    backgroundColor: '#191C14',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(156, 255, 147, 0.22)',
    marginBottom: 12,
  },
  bannerTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#9CFF93',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  bannerSub: { fontSize: 11, color: '#A1A79F', lineHeight: 16 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tabsRow: { flexDirection: 'row', gap: 6 },
  tabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#191C14',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(156, 255, 147, 0.15)',
    borderColor: '#9CFF93',
  },
  tabText: { fontSize: 11, color: '#A1A79F', fontWeight: '600' },
  tabTextActive: { color: '#9CFF93', fontWeight: '800' },
  registerBtn: {
    backgroundColor: '#9CFF93',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  registerBtnText: { color: '#0C0F0C', fontSize: 11, fontWeight: '900' },
  scroll: { paddingBottom: 30 },
  contractCard: {
    backgroundColor: '#191C14',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(156, 255, 147, 0.22)',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  contractCode: { fontSize: 11, fontWeight: '800', color: '#9CFF93' },
  statusBadge: { paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4 },
  statusActive: { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
  statusPending: { backgroundColor: 'rgba(245, 158, 11, 0.2)' },
  statusText: { fontSize: 9, fontWeight: '800', color: '#9CFF93' },
  teamName: { fontSize: 15, fontWeight: '900', color: '#FFFFFF' },
  sportBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A1A79F',
    backgroundColor: '#22261E',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  detailBox: {
    backgroundColor: '#22261E',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  detailLabel: { fontSize: 10, color: '#A1A79F', marginTop: 4, fontWeight: '600' },
  detailValue: { fontSize: 12, color: '#FFFFFF', fontWeight: '700' },
  detailHighlight: { fontSize: 12, color: '#9CFF93', fontWeight: '800' },
  nextMatchText: { fontSize: 12, color: '#F59E0B', fontWeight: '800' },
  progressContainer: { marginBottom: 10 },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: { fontSize: 10, color: '#A1A79F' },
  progressPercent: { fontSize: 10, fontWeight: '700', color: '#9CFF93' },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22261E',
    overflow: 'hidden',
  },
  progressBarFill: { height: 6, backgroundColor: '#9CFF93', borderRadius: 3 },
  financeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 8,
    marginBottom: 10,
  },
  financeLabel: { fontSize: 10, color: '#A1A79F' },
  financeValue: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  financeRemaining: { fontSize: 13, fontWeight: '800', color: '#EA580C' },
  cardActions: { marginTop: 4 },
  payBtn: {
    backgroundColor: '#9CFF93',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  payBtnText: { color: '#0C0F0C', fontSize: 12, fontWeight: '900' },
  completedBtn: {
    backgroundColor: '#22261E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  completedBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#121512',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(156, 255, 147, 0.3)',
    padding: 16,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 15, fontWeight: '900', color: '#FFFFFF' },
  modalClose: { fontSize: 18, color: '#A1A79F', padding: 4 },
  modalScroll: { maxHeight: 380 },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A1A79F',
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#191C14',
    borderWidth: 1,
    borderColor: 'rgba(156, 255, 147, 0.22)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 12,
  },
  modalSportRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  modalSportBtn: {
    backgroundColor: '#191C14',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  modalSportBtnActive: {
    backgroundColor: 'rgba(156, 255, 147, 0.2)',
    borderColor: '#9CFF93',
  },
  modalSportText: { fontSize: 11, color: '#A1A79F', fontWeight: '600' },
  modalSportTextActive: { color: '#9CFF93', fontWeight: '800' },
  modalBenefitBox: {
    backgroundColor: '#22261E',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#9CFF93',
  },
  modalBenefitText: { fontSize: 11, color: '#A1A79F', lineHeight: 16 },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 10,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#191C14',
  },
  cancelBtnText: { color: '#A1A79F', fontSize: 12, fontWeight: '700' },
  confirmBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#9CFF93',
  },
  confirmBtnText: { color: '#0C0F0C', fontSize: 12, fontWeight: '900' },
});
