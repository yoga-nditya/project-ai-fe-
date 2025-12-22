import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { sendMessage, getFileUrl, getHistoryDetail } from '../services/api';
import Voice from '@react-native-voice/voice';
import { useFocusEffect } from '@react-navigation/native';

// ✅ TAMBAHAN: import PDF generator (expo-print safe)
import { generateQuotationPDF } from '../services/pdfGenerator';
import type { QuotationData } from '../services/pdfGenerator';

type ChatScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Chat'>;
  route: { params: { taskType: string; historyId?: number; autoStart?: boolean } };
};

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  files?: Array<{ type: string; filename: string; url: string }>;
  timestamp: Date;
};

export default function ChatScreen({ navigation, route }: ChatScreenProps) {
  const { taskType, historyId: initialHistoryId, autoStart } = route.params;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const [activeHistoryId, setActiveHistoryId] = useState<number | undefined>(initialHistoryId);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const autoStartTriggered = useRef(false);

  // Animasi gelombang untuk voice
  const wave1 = useRef(new Animated.Value(1)).current;
  const wave2 = useRef(new Animated.Value(1)).current;
  const wave3 = useRef(new Animated.Value(1)).current;

  // ✅ Anti double send dari event results (kadang keluar 2x)
  const lastAutoSentRef = useRef<string>('');
  const autoSendTimerRef = useRef<any>(null);

  // ✅ Voice lifecycle hanya saat Chat focus
  useFocusEffect(
    useCallback(() => {
      Voice.onSpeechStart = () => setIsListening(true);
      Voice.onSpeechEnd = () => setIsListening(false);

      Voice.onSpeechPartialResults = (event: any) => {
        if (event?.value && event.value.length > 0) {
          setInputText(event.value[0]);
        }
      };

      // ✅ FINAL RESULT -> auto send
      Voice.onSpeechResults = (event: any) => {
        const text = (event?.value?.[0] ?? '').trim();
        if (!text) return;

        setInputText(text);

        if (isLoading) return;

        if (text === lastAutoSentRef.current) return;
        lastAutoSentRef.current = text;

        if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
        autoSendTimerRef.current = setTimeout(() => {
          handleSend(text); // ✅ auto kirim seperti web
        }, 250);
      };

      Voice.onSpeechError = () => {
        setIsListening(false);
      };

      return () => {
        if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);

        Voice.stop().catch(() => {});
        Voice.cancel().catch(() => {});
        Voice.destroy().catch(() => {});

        setIsListening(false);

        Voice.onSpeechStart = undefined as any;
        Voice.onSpeechEnd = undefined as any;
        Voice.onSpeechResults = undefined as any;
        Voice.onSpeechPartialResults = undefined as any;
        Voice.onSpeechError = undefined as any;
      };
    }, [isLoading])
  );

  // Animasi gelombang
  useEffect(() => {
    if (isListening) {
      const animate = (value: Animated.Value, delay: number) => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(value, { toValue: 1.3, duration: 700, delay, useNativeDriver: true }),
            Animated.timing(value, { toValue: 1, duration: 700, useNativeDriver: true }),
          ])
        ).start();
      };

      animate(wave1, 0);
      animate(wave2, 150);
      animate(wave3, 300);
    } else {
      wave1.setValue(1);
      wave2.setValue(1);
      wave3.setValue(1);
    }
  }, [isListening, wave1, wave2, wave3]);

  useEffect(() => {
    if (initialHistoryId) {
      setMessages([]);
      loadHistory(initialHistoryId);
    } else if (autoStart && !autoStartTriggered.current) {
      autoStartTriggered.current = true;
      setTimeout(() => {
        handleSend('Buatkan quotation');
      }, 500);
    } else {
      if (!autoStart && messages.length === 0) {
        addMessage(
          '👋 Halo! Saya siap membantu Anda membuat quotation limbah B3.\n\n' +
            'Silakan ketik "Buatkan quotation" untuk memulai.',
          'assistant'
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialHistoryId]);

  const loadHistory = async (hid: number) => {
    try {
      setIsLoading(true);
      const detail = await getHistoryDetail(hid);

      const mapped: Message[] = (detail.messages || []).map((m: any) => ({
        id: m.id || `${Date.now()}_${Math.random()}`,
        sender: m.sender,
        text: (m.text || '').toString(),
        files: m.files || [],
        timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
      }));

      setMessages(mapped);
      setActiveHistoryId(hid);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 80);
    } catch {
      addMessage('❌ Gagal memuat chat sebelumnya.', 'assistant');
    } finally {
      setIsLoading(false);
    }
  };

  const addMessage = (text: string, sender: 'user' | 'assistant', files?: any[]) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender,
      files,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSend = async (customText?: string) => {
    const text = (customText || inputText).trim();
    if (!text || isLoading) return;

    Keyboard.dismiss();

    addMessage(text, 'user');
    setInputText('');

    setIsLoading(true);
    try {
      const response: any = await sendMessage(text, activeHistoryId);

      if (response?.history_id && !activeHistoryId) {
        setActiveHistoryId(Number(response.history_id));
      }

      let cleanText = response.text || 'Tidak ada respon';
      cleanText = cleanText.replace(/<br\s*\/?>/gi, '\n');
      cleanText = cleanText.replace(/<b>(.*?)<\/b>/gi, '$1');
      cleanText = cleanText.replace(/<i>(.*?)<\/i>/gi, '$1');
      cleanText = cleanText.replace(/<[^>]*>/g, '');

      let mergedFiles: Array<{ type: string; filename: string; url: string }> = Array.isArray(response.files)
        ? response.files
        : [];

      const quotationData: QuotationData | undefined = response.quotationData;

      if (quotationData && quotationData.items_limbah && quotationData.items_limbah.length > 0) {
        try {
          const pdfRes = await generateQuotationPDF(quotationData);
          if (pdfRes.success && pdfRes.filePath) {
            mergedFiles = [
              ...mergedFiles,
              {
                type: 'pdf',
                filename: `Quotation_${quotationData.nama_perusahaan || 'Client'}.pdf`,
                url: pdfRes.filePath,
              },
            ];
          }
        } catch {}
      }

      addMessage(cleanText, 'assistant', mergedFiles);
    } catch (error: any) {
      addMessage(`❌ Error: ${error.message}\n\nPastikan backend Flask berjalan dan IP address sudah benar.`, 'assistant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilePreview = (files: Array<{ type: string; filename: string; url: string }>) => {
    const docxFile = files.find((f) => f.type === 'docx');
    const pdfFile = files.find((f) => f.type === 'pdf');

    if (!docxFile && pdfFile) {
      const pdfUrl = pdfFile.url.startsWith('file://') ? pdfFile.url : getFileUrl(pdfFile.url);
      navigation.navigate('DocumentPreview', {
        documentUrl: pdfUrl,
        documentTitle: pdfFile.filename,
        pdfUrl: pdfUrl,
      });
      return;
    }

    if (!docxFile) return;

    const docxUrl = docxFile.url.startsWith('file://') ? docxFile.url : getFileUrl(docxFile.url);
    const pdfUrl = pdfFile ? (pdfFile.url.startsWith('file://') ? pdfFile.url : getFileUrl(pdfFile.url)) : undefined;

    navigation.navigate('DocumentPreview', {
      documentUrl: docxUrl,
      documentTitle: docxFile.filename,
      pdfUrl,
    });
  };

  const handleVoicePress = async () => {
    Keyboard.dismiss();

    if (isListening) {
      try {
        await Voice.stop();
        await Voice.cancel();
        setIsListening(false);
      } catch {
        setIsListening(false);
      }
    } else {
      try {
        // ✅ selalu cancel dulu biar start bersih (ngurangin error 5/7)
        await Voice.cancel().catch(() => {});
        await Voice.start('id-ID');
        setIsListening(true);
      } catch {
        setIsListening(false);
        // silent fail sesuai request kamu (tanpa munculin kode error)
      }
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';

    return (
      <View style={[styles.messageContainer, isUser && styles.userMessageContainer]}>
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>{item.text}</Text>

          {item.files && item.files.length > 0 && (
            <TouchableOpacity
              style={styles.fileCard}
              onPress={() => handleFilePreview(item.files!)}
              activeOpacity={0.7}
            >
              <View style={styles.filePreview}>
                <View style={styles.fileIconContainer}>
                  <Text style={styles.fileIconText}>📄</Text>
                </View>
                <Text style={styles.filePreviewText}>Klik untuk preview</Text>
              </View>

              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {item.files[0].filename}
                </Text>
                <View style={styles.fileTypes}>
                  {item.files.map((file, index) => (
                    <View key={index} style={styles.fileTypeBadge}>
                      <Text style={styles.fileTypeText}>{file.type.toUpperCase()}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.wrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              if (navigation.canGoBack()) navigation.goBack();
              else navigation.navigate('Home');
            }}
          >
            <Ionicons name="arrow-back" size={26} color="#111827" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Chat</Text>
          </View>

          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('History')}>
            <Ionicons name="menu" size={28} color="#111827" />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#6B7280" />
            <Text style={styles.loadingText}>Memproses...</Text>
          </View>
        )}

        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inputWrapper}>
            <View style={styles.inputContainer}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder={isListening ? 'Mendengarkan...' : 'Ketik pesan...'}
                placeholderTextColor="#9CA3AF"
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
                editable={!isLoading}
                returnKeyType="send"
                onSubmitEditing={() => handleSend()}
                blurOnSubmit={false}
              />

              <TouchableOpacity style={styles.voiceButton} onPress={handleVoicePress} disabled={isLoading}>
                {isListening && (
                  <>
                    <Animated.View
                      style={[
                        styles.wave,
                        {
                          transform: [{ scale: wave1 }],
                          opacity: wave1.interpolate({ inputRange: [1, 1.3], outputRange: [0.3, 0] }),
                        },
                      ]}
                    />
                    <Animated.View
                      style={[
                        styles.wave,
                        {
                          transform: [{ scale: wave2 }],
                          opacity: wave2.interpolate({ inputRange: [1, 1.3], outputRange: [0.25, 0] }),
                        },
                      ]}
                    />
                    <Animated.View
                      style={[
                        styles.wave,
                        {
                          transform: [{ scale: wave3 }],
                          opacity: wave3.interpolate({ inputRange: [1, 1.3], outputRange: [0.2, 0] }),
                        },
                      ]}
                    />
                  </>
                )}
                <Ionicons name="mic" size={20} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
                onPress={() => handleSend()}
                disabled={!inputText.trim() || isLoading}
              >
                <Text style={styles.sendIcon}>➤</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  wrapper: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitleWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },

  messagesContainer: { padding: 16, paddingBottom: 8, flexGrow: 1 },
  messageContainer: { marginBottom: 12, alignItems: 'flex-start' },
  userMessageContainer: { alignItems: 'flex-end' },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 16 },
  assistantBubble: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  userBubble: { backgroundColor: '#111827' },
  messageText: { fontSize: 15, lineHeight: 21, color: '#374151' },
  userMessageText: { color: '#fff' },

  fileCard: {
    marginTop: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  filePreview: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  fileIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileIconText: { fontSize: 32 },
  filePreviewText: { fontSize: 13, color: '#6B7280' },
  fileInfo: { padding: 12 },
  fileName: { fontSize: 14, fontWeight: '500', color: '#111827', marginBottom: 6 },
  fileTypes: { flexDirection: 'row', gap: 6 },
  fileTypeBadge: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#111827', borderRadius: 4 },
  fileTypeText: { fontSize: 11, fontWeight: '600', color: '#fff' },

  loadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 8 },
  loadingText: { fontSize: 13, color: '#6B7280' },

  inputWrapper: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingBottom: Platform.OS === 'android' ? 4 : 0 },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 8 },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 22,
    fontSize: 15,
    color: '#111827',
  },
  voiceButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  wave: { position: 'absolute', width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#111827' },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { backgroundColor: '#D1D5DB' },
  sendIcon: { fontSize: 18, color: '#fff' },
});
