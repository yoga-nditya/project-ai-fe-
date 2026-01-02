import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type OnboardingScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
};

const { width, height } = Dimensions.get('window');

const onboardingData = [
  {
    id: 1,
    title: 'Buat Invoice Hanya dengan Suara',
    description: 'Cukup bicara, sistem kami akan membuat invoice dan dokumen bisnis lainnya secara otomatis tanpa perlu mengetik manual.',
  },
  {
    id: 2,
    title: 'Cara Kerja Super Simpel',
    description: 'Rekam perintah suara, sistem mengubahnya menjadi dokumen, dan kamu bisa langsung download atau kirim ke klien.',
  },
  {
    id: 3,
    title: 'Hemat Waktu Hingga 80%',
    description: 'Semua dokumen tersimpan rapi, pengingat jatuh tempo otomatis, dan kamu bisa lihat ringkasan revenue dengan mudah.',
  },
  {
    id: 4,
    title: 'Siap Mengoptimalkan Bisnismu?',
    description: 'Mulai sekarang, nikmati kemudahan buat dokumen bisnis dengan voice AI dan pantau bisnis secara real-time di genggamanmu.',
  },
];

export default function OnboardingScreen({ navigation }: OnboardingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  // Animated values untuk progress bars
  const progressAnims = useRef(
    onboardingData.map(() => new Animated.Value(0))
  ).current;

  // Auto-slide setiap 4 detik - Loop kembali ke awal setelah step terakhir
  useEffect(() => {
    // Reset semua progress bars
    progressAnims.forEach((anim, index) => {
      if (index < currentStep) {
        anim.setValue(1); // Sudah selesai
      } else if (index === currentStep) {
        anim.setValue(0); // Reset untuk animasi
      } else {
        anim.setValue(0); // Belum dimulai
      }
    });

    // Animate current progress bar
    Animated.timing(progressAnims[currentStep], {
      toValue: 1,
      duration: 4000,
      useNativeDriver: false,
    }).start();

    const timer = setTimeout(() => {
      if (currentStep < onboardingData.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        // Setelah step terakhir, kembali ke step pertama (loop)
        setCurrentStep(0);
      }
    }, 4000); // 4 detik

    // Cleanup timer saat component unmount atau step berubah
    return () => clearTimeout(timer);
  }, [currentStep]);

  const handleMulai = () => {
    // Klik "Mulai" langsung ke Login
    navigation.replace('Login');
  };

  const currentData = onboardingData[currentStep];

  return (
    <LinearGradient
      colors={['#8BA9C1', '#7A9EB8', '#6B93AF', '#5C88A6']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" />

        {/* Progress Indicators dengan Animasi */}
        <View style={styles.progressContainer}>
          {onboardingData.map((_, index) => (
            <View key={index} style={styles.progressBarBackground}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressAnims[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          ))}
        </View>

        {/* Title */}
        <Text style={styles.header}>Raisa</Text>

        {/* Microphone Image from Assets */}
        <View style={styles.imageContainer}>
          <Image
            source={require('../assets/microphone.png')}
            style={styles.microphoneImage}
            resizeMode="contain"
          />
          
          {/* Waveform decoration */}
          <View style={styles.waveformContainer}>
            <View style={styles.waveform1} />
            <View style={styles.waveform2} />
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          <Text style={styles.title}>{currentData.title}</Text>
          <Text style={styles.description}>{currentData.description}</Text>
        </View>

        {/* Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleMulai}
            activeOpacity={0.8}
          >
            <Text style={styles.startButtonText}>Mulai</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    marginBottom: 24,
    paddingHorizontal: 0,
  },
  progressBarBackground: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  header: {
    fontSize: 26,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    position: 'relative',
    height: height * 0.41,
  },
  microphoneImage: {
    width: 470,
    height: 640,
  },
  waveformContainer: {
    position: 'absolute',
    right: 2,
    top: '35%',
    gap: 20,
  },
  waveform1: {
    width: 120,
    height: 60,
    borderWidth: 4,
    borderColor: 'rgba(100, 220, 255, 0.7)',
    borderRadius: 40,
    borderLeftWidth: 0,
    transform: [{ rotate: '10deg' }],
  },
  waveform2: {
    width: 100,
    height: 50,
    borderWidth: 3,
    borderColor: 'rgba(100, 220, 255, 0.5)',
    borderRadius: 35,
    borderLeftWidth: 0,
    transform: [{ rotate: '-5deg' }],
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 12,
    paddingBottom: 4,
    marginTop: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
    lineHeight: 34,
  },
  description: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.95)',
    lineHeight: 22,
    paddingRight: 8,
  },
  buttonContainer: {
    paddingBottom: 24,
    paddingTop: 16,
    marginTop: 24,
  },
  startButton: {
    backgroundColor: '#2C2C2C',
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});