import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { User, X } from 'lucide-react-native';
import { fonts, radius, spacing, useTheme } from '../theme/colors';

export interface ProfileFormData {
  fullName: string;
  phone: string;
  email: string;
  dob: string;
  gender: string;
  sports: string[];
}

interface EditProfileModalProps {
  visible: boolean;
  initialData: ProfileFormData;
  onSave: (data: ProfileFormData) => void;
  onClose: () => void;
}

const SPORT_OPTIONS = ['Bóng đá', 'Gym Fitness', 'Tennis', 'Bơi lội', 'Phanta Gaming'];
const GENDER_OPTIONS = ['Nam', 'Nữ', 'Khác'];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  initialData,
  onSave,
  onClose,
}) => {
  const theme = useTheme();
  const [form, setForm] = useState<ProfileFormData>(initialData);

  const toggleSport = (sport: string) => {
    setForm((prev) => {
      const exists = prev.sports.includes(sport);
      return {
        ...prev,
        sports: exists
          ? prev.sports.filter((s) => s !== sport)
          : [...prev.sports, sport],
      };
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: theme.scrim }]}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: theme.borderSubtle }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconBox, { backgroundColor: theme.accentSoft }]}>
                <User size={18} strokeWidth={1.75} color={theme.accent} />
              </View>
              <Text
                style={[
                  styles.headerTitle,
                  { color: theme.textHeading, fontFamily: fonts.headingBold },
                ]}
              >
                Chỉnh sửa thông tin cá nhân
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityLabel="Đóng"
              style={({ pressed }) => [
                styles.closeBtn,
                {
                  backgroundColor: theme.surfaceElevated,
                  borderColor: theme.border,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <X size={16} strokeWidth={1.75} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formBody}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary, fontFamily: fonts.bodyMedium }]}>
                Họ và tên
              </Text>
              <TextInput
                value={form.fullName}
                onChangeText={(fullName) => setForm((p) => ({ ...p, fullName }))}
                placeholderTextColor={theme.placeholder}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.inputBorder,
                    color: theme.textHeading,
                    fontFamily: fonts.bodyMedium,
                  },
                ]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary, fontFamily: fonts.bodyMedium }]}>
                Số điện thoại
              </Text>
              <TextInput
                value={form.phone}
                onChangeText={(phone) => setForm((p) => ({ ...p, phone }))}
                keyboardType="phone-pad"
                placeholderTextColor={theme.placeholder}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.inputBorder,
                    color: theme.textHeading,
                    fontFamily: fonts.bodyMedium,
                  },
                ]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary, fontFamily: fonts.bodyMedium }]}>
                Email
              </Text>
              <TextInput
                value={form.email}
                onChangeText={(email) => setForm((p) => ({ ...p, email }))}
                keyboardType="email-address"
                placeholderTextColor={theme.placeholder}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.inputBorder,
                    color: theme.textHeading,
                    fontFamily: fonts.bodyMedium,
                  },
                ]}
              />
            </View>

            <View style={styles.row2}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: theme.textSecondary, fontFamily: fonts.bodyMedium }]}>
                  Ngày sinh
                </Text>
                <TextInput
                  value={form.dob}
                  onChangeText={(dob) => setForm((p) => ({ ...p, dob }))}
                  placeholderTextColor={theme.placeholder}
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.inputBg,
                      borderColor: theme.inputBorder,
                      color: theme.textHeading,
                      fontFamily: fonts.bodyMedium,
                    },
                  ]}
                />
              </View>

              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: theme.textSecondary, fontFamily: fonts.bodyMedium }]}>
                  Giới tính
                </Text>
                <View style={styles.genderRow}>
                  {GENDER_OPTIONS.map((g) => {
                    const active = form.gender === g;
                    return (
                      <Pressable
                        key={g}
                        onPress={() => setForm((p) => ({ ...p, gender: g }))}
                        style={[
                          styles.genderChip,
                          {
                            backgroundColor: active ? theme.accent : theme.surfaceElevated,
                            borderColor: active ? theme.accent : theme.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.genderText,
                            {
                              color: active ? theme.onAccent : theme.textPrimary,
                              fontFamily: fonts.bodyMedium,
                            },
                          ]}
                        >
                          {g}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary, fontFamily: fonts.bodyMedium }]}>
                Môn thể thao quan tâm
              </Text>
              <View style={styles.sportsWrap}>
                {SPORT_OPTIONS.map((sport) => {
                  const active = form.sports.includes(sport);
                  return (
                    <Pressable
                      key={sport}
                      onPress={() => toggleSport(sport)}
                      style={[
                        styles.sportChip,
                        {
                          backgroundColor: active ? theme.accent : theme.surfaceElevated,
                          borderColor: active ? theme.accent : theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.sportText,
                          {
                            color: active ? theme.onAccent : theme.textPrimary,
                            fontFamily: fonts.bodyMedium,
                          },
                        ]}
                      >
                        {sport}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: theme.borderSubtle }]}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.cancelBtn,
                {
                  backgroundColor: theme.surfaceElevated,
                  borderColor: theme.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={[styles.btnText, { color: theme.textSecondary, fontFamily: fonts.bodySemiBold }]}>
                Hủy bỏ
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onSave(form)}
              style={({ pressed }) => [
                styles.saveBtn,
                {
                  backgroundColor: theme.accent,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={[styles.btnText, { color: theme.onAccent, fontFamily: fonts.bodySemiBold }]}>
                Lưu thay đổi
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
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: '88%',
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formBody: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
  },
  input: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: 14,
  },
  row2: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 6,
  },
  genderChip: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderText: {
    fontSize: 12,
  },
  sportsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sportChip: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportText: {
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 13,
  },
});
