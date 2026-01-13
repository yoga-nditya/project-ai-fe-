import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import Voice from '@react-native-voice/voice';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as Linking from 'expo-linking';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

type MenuCard = {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  taskType: string;
  disabled?: boolean;
};

const menuCards: MenuCard[] = [
  { id: '1', title: 'Membuat Invoice', icon: 'receipt-outline', taskType: 'invoice', disabled: false },
  { id: '2', title: 'Membuat Berita Acara', icon: 'pricetag-outline', taskType: 'penawaran', disabled: true },
  { id: '3', title: 'Membuat Penawaran', icon: 'document-text-outline', taskType: 'quotation', disabled: false },
  { id: '4', title: 'Membuat MoU', icon: 'people-outline', taskType: 'mou', disabled: false },
];

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);

  const wave1 = useRef(new Animated.Value(1)).current;
  const wave2 = useRef(new Animated.Value(1)).current;
  const wave3 = useRef(new Animated.Value(1)).current;

  const startingRef = useRef(false);

  const ensureMicPermission = async (): Promise<boolean> => {
    try {
      const perm = await Audio.getPermissionsAsync();
      if (perm.granted) return true;

      const req = await Audio.requestPermissionsAsync();
      if (req.granted) return true;

      Alert.alert(
        'Izin Mikrofon Diperlukan',
        'Untuk menggunakan voice input, izinkan akses mikrofon di pengaturan.',
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Buka Pengaturan', onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    } catch {
      return false;
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      Voice.onSpeechStart = () => setIsListening(true);
      Voice.onSpeechEnd = () => setIsListening(false);

      Voice.onSpeechResults = (event: any) => {
        const text = event?.value?.[0] ?? '';
        setInputText(text);
        processCommand(text);
      };

      Voice.onSpeechPartialResults = (event: any) => {
        if (event.value && event.value.length > 0) {
          setInputText(event.value[0]);
        }
      };

      Voice.onSpeechError = () => setIsListening(false);

      return () => {
        Voice.stop().catch(() => {});
        Voice.cancel().catch(() => {});
        setIsListening(false);

        Voice.onSpeechStart = undefined as any;
        Voice.onSpeechEnd = undefined as any;
        Voice.onSpeechResults = undefined as any;
        Voice.onSpeechPartialResults = undefined as any;
        Voice.onSpeechError = undefined as any;
      };
    }, [])
  );

  useEffect(() => {
    if (isListening) {
      const animate = (value: Animated.Value, delay: number) => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(value, { toValue: 1.4, duration: 800, delay, useNativeDriver: true }),
            Animated.timing(value, { toValue: 1, duration: 800, useNativeDriver: true }),
          ])
        ).start();
      };

      animate(wave1, 0);
      animate(wave2, 200);
      animate(wave3, 400);
    } else {
      wave1.setValue(1);
      wave2.setValue(1);
      wave3.setValue(1);
    }
  }, [isListening, wave1, wave2, wave3]);

  /**
   * ✅ Router command yang "anti nyasar"
   */
  const processCommand = (text: string) => {
    const lower = (text || '').toLowerCase();

    // ✅ INVOICE
    if (
      lower.includes('invoice') ||
      lower.includes('invois') ||
      lower.includes('invoys') ||
      lower.includes('invoyce') ||
      lower.includes('faktur') ||
      lower.includes('tagihan')
    ) {
      if (isListening) Voice.stop().catch(() => {});
      // ✅ ADD: sessionKey untuk force remount
      navigation.navigate('Chat', { 
        taskType: 'invoice', 
        autoStart: true,
        sessionKey: Date.now().toString() // ✅ NEW
      });
      return;
    }

    // ✅ MOU
    if (lower.includes('mou') || lower.includes('memorandum')) {
      if (isListening) Voice.stop().catch(() => {});
      navigation.navigate('Chat', { 
        taskType: 'mou', 
        autoStart: true,
        sessionKey: Date.now().toString() // ✅ NEW
      });
      return;
    }

    // ✅ QUOTATION
    if (lower.includes('quotation') || lower.includes('kuotasi') || lower.includes('penawaran')) {
      if (isListening) Voice.stop().catch(() => {});
      navigation.navigate('Chat', { 
        taskType: 'quotation', 
        autoStart: true,
        sessionKey: Date.now().toString() // ✅ NEW
      });
      return;
    }

    // ✅ Jika user hanya bilang "buatkan / buat" tanpa menyebut jenis dokumen
    if (lower.includes('buat') || lower.includes('buatkan')) {
      Alert.alert('Pilih Dokumen', 'Mau buat apa? Invoice / Quotation / MoU');
    }
  };

  const handleCardPress = (taskType: string, disabled?: boolean) => {
    if (disabled) {
      Alert.alert('Info', 'Fitur ini akan segera hadir!');
      return;
    }

    Voice.stop().catch(() => {});
    Voice.cancel().catch(() => {});
    setIsListening(false);

    // ✅ autoStart untuk invoice, quotation, mou dengan sessionKey
    if (taskType === 'quotation' || taskType === 'mou' || taskType === 'invoice') {
      navigation.navigate('Chat', { 
        taskType, 
        autoStart: true,
        sessionKey: Date.now().toString() // ✅ NEW: Force remount
      });
      return;
    }

    navigation.navigate('Chat', { 
      taskType,
      sessionKey: Date.now().toString() // ✅ NEW: Force remount
    });
  };

  const handleVoicePress = async () => {
    if (startingRef.current) return;
    startingRef.current = true;

    try {
      const ok = await ensureMicPermission();
      if (!ok) return;

      if (isListening) {
        await Voice.stop().catch(() => {});
        setIsListening(false);
      } else {
        await Voice.cancel().catch(() => {});
        await Voice.start('id-ID');
        setIsListening(true);
      }
    } catch {
      setIsListening(false);
    } finally {
      startingRef.current = false;
    }
  };

  const handleSendMessage = () => {
    if (inputText.trim()) {
      processCommand(inputText);
      setInputText('');
    }
  };

  const handleMenuPress = () => navigation.navigate('History');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress} activeOpacity={0.7}>
            <Ionicons name="menu" size={24} color="#000" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Raisa</Text>

          <View style={styles.headerRight}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>R</Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.decorativeDotsContainer}>
            <View style={styles.decorativeDots}>
              {[...Array(50)].map((_, i) => (
                <View key={i} style={styles.dot} />
              ))}
            </View>
          </View>

          <Text style={styles.title}>Bagaimana saya</Text>
          <Text style={styles.title}>bisa membantu</Text>
          <Text style={styles.title}>Anda hari ini!</Text>

          <View style={styles.cardsContainer}>
            <View style={styles.cardRow}>
              <TouchableOpacity
                style={[
                  styles.card,
                  menuCards[0].disabled && styles.cardDisabled,
                  !menuCards[0].disabled && styles.cardActive,
                ]}
                onPress={() => handleCardPress(menuCards[0].taskType, menuCards[0].disabled)}
                activeOpacity={0.7}
              >
                <View style={[styles.cardIcon, menuCards[0].disabled && styles.cardIconDisabled]}>
                  <Ionicons name={menuCards[0].icon} size={28} color={menuCards[0].disabled ? '#999' : '#000'} />
                </View>
                <Text style={[styles.cardTitle, menuCards[0].disabled && styles.cardTitleDisabled]}>
                  {menuCards[0].title}
                </Text>
                {menuCards[0].disabled && <Text style={styles.comingSoon}>Segera Hadir</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.card, menuCards[1].disabled && styles.cardDisabled]}
                onPress={() => handleCardPress(menuCards[1].taskType, menuCards[1].disabled)}
                activeOpacity={0.7}
              >
                <View style={[styles.cardIcon, menuCards[1].disabled && styles.cardIconDisabled]}>
                  <Ionicons name={menuCards[1].icon} size={28} color={menuCards[1].disabled ? '#999' : '#000'} />
                </View>
                <Text style={[styles.cardTitle, menuCards[1].disabled && styles.cardTitleDisabled]}>
                  {menuCards[1].title}
                </Text>
                {menuCards[1].disabled && <Text style={styles.comingSoon}>Segera Hadir</Text>}
              </TouchableOpacity>
            </View>

            <View style={styles.cardRow}>
              <TouchableOpacity
                style={[styles.card, !menuCards[2].disabled && styles.cardActive]}
                onPress={() => handleCardPress(menuCards[2].taskType, menuCards[2].disabled)}
                activeOpacity={0.7}
              >
                <View style={styles.cardIcon}>
                  <Ionicons name={menuCards[2].icon} size={28} color="#000" />
                </View>
                <Text style={styles.cardTitle}>{menuCards[2].title}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.card, !menuCards[3].disabled && styles.cardActive]}
                onPress={() => handleCardPress(menuCards[3].taskType, menuCards[3].disabled)}
                activeOpacity={0.7}
              >
                <View style={styles.cardIcon}>
                  <Ionicons name={menuCards[3].icon} size={28} color="#000" />
                </View>
                <Text style={styles.cardTitle}>{menuCards[3].title}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomContainer}>
          <View style={styles.inputContainer}>
            <Ionicons name="filter-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSendMessage}
              placeholder="Tanya apapun..."
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity onPress={handleSendMessage} style={styles.inputButton}>
              <Ionicons name="arrow-up-circle" size={28} color="#000" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.voiceButton} onPress={handleVoicePress}>
            {isListening && (
              <>
                <Animated.View
                  style={[
                    styles.wave,
                    {
                      transform: [{ scale: wave1 }],
                      opacity: wave1.interpolate({ inputRange: [1, 1.4], outputRange: [0.3, 0] }),
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.wave,
                    {
                      transform: [{ scale: wave2 }],
                      opacity: wave2.interpolate({ inputRange: [1, 1.4], outputRange: [0.3, 0] }),
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.wave,
                    {
                      transform: [{ scale: wave3 }],
                      opacity: wave3.interpolate({ inputRange: [1, 1.4], outputRange: [0.3, 0] }),
                    },
                  ]}
                />
              </>
            )}
            <Ionicons name="mic" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  keyboardView: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },

  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: '#2F5BFF',
  },

  headerRight: {
    width: 40,
    height: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },

  profileContainer: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  profileImage: { width: '100%', height: '100%' },

  content: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  decorativeDotsContainer: { alignItems: 'center', marginTop: 20, marginBottom: 30 },
  decorativeDots: { flexDirection: 'row', flexWrap: 'wrap', width: 200, justifyContent: 'center' },
  dot: { width: 2, height: 2, borderRadius: 1, backgroundColor: '#D1D5DB', margin: 2 },

  title: { fontSize: 32, fontWeight: '600', color: '#000', textAlign: 'center', lineHeight: 40 },

  cardsContainer: { paddingHorizontal: 20, marginTop: 40 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },

  card: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardDisabled: { opacity: 0.5 },

  cardActive: { borderWidth: 1.5, borderColor: '#111' },

  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIconDisabled: { backgroundColor: '#E5E7EB' },

  cardTitle: { fontSize: 14, fontWeight: '500', color: '#000', lineHeight: 18 },
  cardTitleDisabled: { color: '#999' },
  comingSoon: { fontSize: 10, fontWeight: '600', color: '#999', marginTop: 4 },

  bottomContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    gap: 12,
  },

  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: '#000' },

  inputButton: { marginLeft: 8, padding: 4, opacity: 0.6 },

  voiceButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2F5BFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },

  wave: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#2F5BFF',
  },
});