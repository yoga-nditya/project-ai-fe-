import { useState, useEffect } from 'react';
import { Platform, Alert } from 'react-native';

/**
 * Voice Recorder Hook untuk React Native
 * 
 * NOTES:
 * - iOS & Android memerlukan package expo-speech atau react-native-voice
 * - Perlu permission untuk microphone
 * - Ini adalah implementation guide/template
 */

// Type untuk voice recognition result
export type VoiceResult = {
  transcript: string;
  isFinal: boolean;
  confidence?: number;
};

export const useVoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Start recording
  const startRecording = async () => {
    try {
      setIsRecording(true);
      setTranscript('');
      setError(null);

      // ✅ IMPLEMENTATION NEEDED:
      // Install: expo install expo-speech
      // OR: npm install @react-native-voice/voice
      
      // Example with expo-speech (Text-to-Speech, not Speech-to-Text):
      // import * as Speech from 'expo-speech';
      
      // Example with @react-native-voice/voice:
      // import Voice from '@react-native-voice/voice';
      // await Voice.start('id-ID');
      
      console.log('Voice recording started...');
      
      // For now, show alert
      Alert.alert(
        'Voice Input',
        'Untuk menggunakan voice input, install:\n\n' +
        '• expo-speech (iOS/Android)\n' +
        '• @react-native-voice/voice (advanced)\n\n' +
        'Lihat implementasi di useVoiceRecorder.ts',
        [{ text: 'OK' }]
      );
      
    } catch (err: any) {
      setError(err.message || 'Failed to start recording');
      setIsRecording(false);
    }
  };

  // Stop recording
  const stopRecording = async () => {
    try {
      setIsRecording(false);

      // ✅ IMPLEMENTATION NEEDED:
      // await Voice.stop();
      // await Voice.destroy();
      
      console.log('Voice recording stopped.');
      
    } catch (err: any) {
      setError(err.message || 'Failed to stop recording');
    }
  };

  // Process voice text (normalization)
  const processVoiceText = (text: string): string => {
    let processed = text;

    // Replacements for Indonesian voice input
    const replacements: Record<string, string> = {
      'minus': '-',
      'min': '-',
      'strip': '-',
      'dash': '-',
      'sampai': '-',
      'hingga': '-',
      'garis': '-',
      'nol': '0',
      'satu': '1',
      'dua': '2',
      'tiga': '3',
      'empat': '4',
      'lima': '5',
      'enam': '6',
      'tujuh': '7',
      'delapan': '8',
      'sembilan': '9',
    };

    // Replace words
    for (const [word, replacement] of Object.entries(replacements)) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      processed = processed.replace(regex, replacement);
    }

    // Clean up spaces
    processed = processed.replace(/\s+/g, ' ').trim();
    processed = processed.replace(/\s*-\s*/g, '-');

    return processed;
  };

  // Toggle recording
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording();
      }
    };
  }, []);

  return {
    isRecording,
    transcript,
    error,
    startRecording,
    stopRecording,
    toggleRecording,
    processVoiceText,
  };
};

/**
 * FULL IMPLEMENTATION EXAMPLE:
 * 
 * 1. Install package:
 *    npm install @react-native-voice/voice
 * 
 * 2. iOS: Update Info.plist
 *    <key>NSMicrophoneUsageDescription</key>
 *    <string>We need access to your microphone for voice input</string>
 * 
 * 3. Android: Update AndroidManifest.xml
 *    <uses-permission android:name="android.permission.RECORD_AUDIO" />
 * 
 * 4. Implementation:
 * 
 * import Voice from '@react-native-voice/voice';
 * 
 * Voice.onSpeechStart = () => setIsRecording(true);
 * Voice.onSpeechEnd = () => setIsRecording(false);
 * Voice.onSpeechResults = (e) => {
 *   if (e.value && e.value.length > 0) {
 *     const text = e.value[0];
 *     setTranscript(text);
 *   }
 * };
 * Voice.onSpeechError = (e) => setError(e.error.message);
 * 
 * await Voice.start('id-ID'); // Indonesian
 * await Voice.stop();
 * await Voice.destroy();
 */

export default useVoiceRecorder;