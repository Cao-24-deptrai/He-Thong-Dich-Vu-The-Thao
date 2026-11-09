// mobile/src/screens/ChatScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { colors } from '../theme/colors';
import { TwoLineText } from '../components/TwoLineText';

interface ChatMessage {
  id: string;
  sender: 'BOT' | 'USER';
  text: string;
  time: string;
}

export const ChatScreen: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'BOT',
      text: 'Xin chào! Tôi là Trợ Lý Ảo Phanta Sports. Tôi có thể hỗ trợ gì cho bạn về đặt sân, nạp ví, cổng xoay Face ID hay thuê dụng cụ?',
      time: '18:30',
    },
    {
      id: '2',
      sender: 'BOT',
      text: 'Mẹo nhanh: Bạn có thể hủy sân trước 12 giờ để nhận hoàn tiền cọc 100% tự động trong 3 giây vào ví Phanta Pay.',
      time: '18:30',
    },
  ]);

  const [inputText, setInputText] = useState<string>('');

  const quickQuestions = [
    'Quy định hủy sân hoàn cọc?',
    'Cách qua cổng xoay Face ID?',
    'Nạp ví PayOS bao lâu có tiền?',
    'Thời gian mượn dụng cụ?',
  ];

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'USER',
      text,
      time: '18:32',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');

    setTimeout(() => {
      let botReply = 'Cảm ơn bạn đã liên hệ! Yêu cầu của bạn đã được chuyển đến nhân viên hỗ trợ trực ban.';
      if (text.includes('hủy') || text.includes('hoàn')) {
        botReply = 'Quy định hủy sân: Hủy trước 12 giờ bắt đầu trận đấu được hoàn 100% tiền cọc tự động trong 3 giây vào ví Phanta Pay. Hủy muộn hơn tiền cọc sẽ chuyển vào quỹ bồi thường cơ sở.';
      } else if (text.includes('Face ID') || text.includes('cổng')) {
        botReply = 'Cổng xoay Gym & Hồ bơi: Bạn chỉ cần quét khuôn mặt tại camera AI cổng xoay (nhận diện < 500ms). Nếu chưa đăng ký, hãy ghé quầy lễ tân để ghi nhận sinh trắc học nhé!';
      } else if (text.includes('nạp') || text.includes('PayOS')) {
        botReply = 'Nạp ví VietQR PayOS: Sau khi chuyển khoản đúng nội dung và ngân hàng báo Có, hệ thống tự động cộng số dư vào ví trong vòng 3 giây!';
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'BOT',
          text: botReply,
          time: '18:32',
        },
      ]);
    }, 500);
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
            primary="Hỗ Trợ Khách Hàng 24/7"
            secondary="Trợ lý thông minh Phanta & Nhân viên hỗ trợ trực tuyến"
            badge="ONLINE"
            badgeColor={colors.success}
          />
        </View>

        {/* Messages List */}
        <ScrollView style={styles.messagesContainer} contentContainerStyle={styles.messagesContent}>
          {messages.map((m) => {
            const isUser = m.sender === 'USER';
            return (
              <View key={m.id} style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowBot]}>
                <View style={[styles.msgBubble, isUser ? styles.msgBubbleUser : styles.msgBubbleBot]}>
                  <Text style={[styles.msgText, isUser ? styles.msgTextUser : styles.msgTextBot]}>
                    {m.text}
                  </Text>
                  <Text style={[styles.msgTime, isUser ? styles.msgTimeUser : styles.msgTimeBot]}>
                    {m.time}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Quick FAQ Chips */}
        <View style={styles.faqBox}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.faqScroll}>
            {quickQuestions.map((q, idx) => (
              <TouchableOpacity key={idx} style={styles.faqChip} onPress={() => handleSend(q)}>
                <Text style={styles.faqChipText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Nhập câu hỏi của bạn..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSend()}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={() => handleSend()}>
            <Text style={styles.sendBtnText}>Gửi</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#0f172a',
  },
  backBtn: { padding: 8, backgroundColor: colors.card, borderRadius: 8 },
  backText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 16, gap: 12 },
  msgRow: { flexDirection: 'row' },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowBot: { justifyContent: 'flex-start' },
  msgBubble: { maxWidth: '80%', padding: 12, borderRadius: 16 },
  msgBubbleUser: { backgroundColor: colors.primary, borderBottomRightRadius: 2 },
  msgBubbleBot: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 2 },
  msgText: { fontSize: 13, lineHeight: 19 },
  msgTextUser: { color: '#000', fontWeight: '600' },
  msgTextBot: { color: '#f1f5f9' },
  msgTime: { fontSize: 9, marginTop: 4, textAlign: 'right' },
  msgTimeUser: { color: '#00000080' },
  msgTimeBot: { color: colors.textMuted },
  faqBox: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#0f172a' },
  faqScroll: { maxHeight: 34 },
  faqChip: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  faqChipText: { fontSize: 11, color: '#38bdf8', fontWeight: '600' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#0f172a',
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 13,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendBtnText: { color: '#000', fontWeight: '800', fontSize: 13 },
});
