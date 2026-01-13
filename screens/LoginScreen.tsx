import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    Keyboard.dismiss();

    if (email === 'admin@gmail.com' && password === 'admin123') {
      navigation.replace('Home');
    } else {
      Alert.alert('Gagal Masuk', 'Email atau password salah');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="always"
              contentInsetAdjustmentBehavior="automatic"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.appTitle}>Raisa</Text>

              <View style={styles.decorativeDotsContainer}>
                <View style={styles.decorativeDots}>
                  {[...Array(50)].map((_, i) => (
                    <View key={i} style={styles.dot} />
                  ))}
                </View>
              </View>

              <View style={styles.titleContainer}>
                <Text style={styles.title}>Selamat Datang</Text>
                <Text style={styles.subtitle}>
                  Masuk untuk terus membuat invoice dan dokumen dengan asisten suara AI Anda.
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={22} color="#2C2C2C" />
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan email Anda"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={22} color="#2C2C2C" />
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan kata sandi Anda"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={22}
                    color="#999"
                  />
                </TouchableOpacity>
              </View>

              {/* BUTTON TETAP DI POSISI ASLI */}
              <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                <Text style={styles.loginButtonText}>Masuk</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },

  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },

  appTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2F5BFF',
    textAlign: 'center',
    marginBottom: 14,
  },

  decorativeDotsContainer: {
    alignItems: 'center',
    marginBottom: 34,
  },

  decorativeDots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 200,
    justifyContent: 'center',
  },

  dot: {
    width: 2,
    height: 2,
    backgroundColor: '#D0D0D0',
    margin: 2,
  },

  titleContainer: {
    marginBottom: 48,
    alignItems: 'center',
  },

  title: {
    fontSize: 32,
    fontWeight: '600',
    marginBottom: 12,
  },

  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },

  input: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
  },

  loginButton: {
    backgroundColor: '#2F5BFF',
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center',
    marginTop: 32,
  },

  loginButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
  },
});
