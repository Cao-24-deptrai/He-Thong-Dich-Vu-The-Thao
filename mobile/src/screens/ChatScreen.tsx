import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Send } from 'lucide-react-native';
import { fonts, radius, spacing, useTheme } from '../theme/colors';
import { ScreenHeader } from '../components/ScreenHeader';

interface Props {
  onBack: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'SYSTEM' | 'STAFF' | 'USER';
  text: string;
  time?: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: '1',
    sender: 'SYSTEM',
    text: 'Phiên hỗ trợ trực tuyến đã kết nối với chuyên viên chăm sóc khách hàng Phanta.',
  },
  {
    id: '2',
    sender: 'STAFF',
    text: 'Chào bạn Duy Khang. Lễ tân Phanta có thể hỗ trợ bạn về lịch sân bóng, lớp bơi lội hay đăng ký Face ID phòng Gym hôm nay không?',
    time: '14:02',
  },
  {
    id: '3',
    sender: 'USER',
    text: 'Sân F1 chiều nay lúc 17:30 bên mình đã chuẩn bị sẵn 10 áo bib và 1 quả bóng FIFA Pro cho đội mình chưa?',
    time: '14:03',
  },
  {
    id: '4',
    sender: 'STAFF',
    text: 'Hệ thống đã xuất phiếu chuẩn bị dụng cụ trước 60 phút tại quầy. Bạn chỉ cần quét mã QR vào sân để nhận ngay.',
    time: '14:04',
  },
];

const QUICK_PROMPTS = [
  'Kiểm tra đơn sân F1 của tôi',
  'Tôi muốn đổi lịch sang 19:00',
  'Hướng dẫn nạp ví VietQR',
];

export const ChatScreen: React.FC<Props> = ({ onBack }) => {
  const theme = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'USER',
      text: trimmed,
      time: timeStr,
    };

    const replyMsg: ChatMessage = {
      id: String(Date.now() + 1),
      sender: 'STAFF',
      text: 'Đã tiếp nhận yêu cầu của bạn. Nhân viên lễ tân đang kiểm tra và sẽ phản hồi trong ít phút.',
      time: timeStr,
    };

    setMessages((prev) => [...prev, userMsg, replyMsg]);
    setInputText('');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Tổng đài Phanta Support 24/7"
        subtitle="Trực tuyến phản hồi tức thì"
        onBack={onBack}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.messagesList}
      >
        {messages.map((m) => {
          if (m.sender === 'SYSTEM') {
            return (
              <View
                key={m.id}
                style={[styles.systemBox, { backgroundColor: theme.surfaceElevated, borderColor: theme.borderSubtle }]}
              >
                <Text style={[styles.systemText, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                  {m.text}
                </Text>
              </View>
            );
          }

          if (m.sender === 'USER') {
            return (
              <View
                key={m.id}
                style={[styles.userBubble, { backgroundColor: theme.accent }]}
              >
                <Text style={[styles.userText, { color: theme.onAccent, fontFamily: fonts.bodyMedium }]}>
                  {m.text}
                </Text>
                {m.time ? (
                  <Text style={[styles.timeText, { color: theme.onAccent, opacity: 0.75, fontFamily: fonts.body }]}>
                    {m.time}
                  </Text>
                ) : null}
              </View>
            );
          }

          return (
            <View key={m.id} style={styles.staffRow}>
              <View style={[styles.staffAvatar, { backgroundColor: theme.accent }]}>
                <Text style={[styles.staffAvatarText, { color: theme.onAccent, fontFamily: fonts.headingBold }]}>
                  P
                </Text>
              </View>
              <View
                style={[
                  styles.staffBubble,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.staffText, { color: theme.textPrimary, fontFamily: fonts.body }]}>
                  {m.text}
                </Text>
                {m.time ? (
                  <Text style={[styles.timeText, { color: theme.textMuted, fontFamily: fonts.body }]}>
                    {m.time}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.composerWrap, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
          {QUICK_PROMPTS.map((q) => (
            <Pressable
              key={q}
              onPress={() => setInputText(q)}
              style={[
                styles.quickChip,
                { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.quickChipText, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                {q}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            placeholder="Nhập tin nhắn hỗ trợ"
            placeholderTextColor={theme.placeholder}
            style={[
              styles.input,
              {
                backgroundColor: theme.inputBg,
                borderColor: theme.inputBorder,
                color: theme.textHeading,
                fontFamily: fonts.body,
              },
            ]}
          />
          <Pressable
            onPress={handleSend}
            accessibilityLabel="Gửi tin nhắn"
            style={({ pressed }) => [
              styles.sendBtn,
              { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Send size={16} strokeWidth={2} color={theme.onAccent} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  messagesList: {
    padding: spacing.lg,
    gap: spacing.md,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  systemBox: { borderRadius: radius.md, borderWidth: 1, padding: spacing.md },
  systemText: { fontSize: 11, textAlign: 'center', lineHeight: 16 },
  staffRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, maxWidth: '86%' },
  staffAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  staffAvatarText: { fontSize: 12 },
  staffBubble: { flex: 1, borderRadius: radius.lg, borderTopLeftRadius: 4, borderWidth: 1, padding: spacing.md, gap: 4 },
  staffText: { fontSize: 13, lineHeight: 19 },
  userBubble: { alignSelf: 'flex-end', maxWidth: '84%', borderRadius: radius.lg, borderTopRightRadius: 4, padding: spacing.md, gap: 4 },
  userText: { fontSize: 13, lineHeight: 19 },
  timeText: { fontSize: 10, textAlign: 'right' },
  composerWrap: { borderTopWidth: 1, padding: spacing.md, gap: spacing.sm },
  quickRow: { gap: spacing.sm },
  quickChip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1 },
  quickChipText: { fontSize: 11 },
  inputRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  input: { flex: 1, minHeight: 44, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, fontSize: 13 },
  sendBtn: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
