import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ GANTI dengan IP backend Anda!
// Untuk emulator Android: 'http://10.0.2.2:5000'
// Untuk device fisik di jaringan yang sama: 'http://192.168.X.X:5000'
// Untuk localhost iOS simulator: 'http://localhost:5000'
const API_BASE_URL = 'http://192.168.1.100:5000'; // ← GANTI IP INI!

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 detik (untuk AI processing)
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for session cookies
});

// Session management
let sessionId: string | null = null;

const getSessionId = async (): Promise<string> => {
  if (sessionId) return sessionId;
  
  // Try to get from storage
  const stored = await AsyncStorage.getItem('quotation_session');
  if (stored) {
    sessionId = stored;
    return stored;
  }
  
  // Generate new session ID
  const newSessionId = `mobile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  sessionId = newSessionId;
  await AsyncStorage.setItem('quotation_session', newSessionId);
  return newSessionId;
};

export const resetSession = async () => {
  sessionId = null;
  await AsyncStorage.removeItem('quotation_session');
};

// ===== API FUNCTIONS =====

/**
 * Send message to Flask backend
 * Returns: { text: string, files?: Array<{type, filename, url}> }
 */
export const sendMessage = async (message: string) => {
  try {
    const sid = await getSessionId();
    
    const response = await api.post('/api/chat', {
      message: message.trim(),
    }, {
      headers: {
        'Cookie': `session=${sid}`,
      },
    });
    
    return response.data;
  } catch (error: any) {
    console.error('API Error:', error);
    
    if (error.response) {
      // Server responded with error
      const errorMsg = error.response.data?.error || 'Server error';
      throw new Error(errorMsg);
    } else if (error.request) {
      // No response from server
      throw new Error('Tidak dapat terhubung ke server. Pastikan backend berjalan di ' + API_BASE_URL);
    } else {
      // Request setup error
      throw new Error(error.message || 'Network error');
    }
  }
};

/**
 * Get download URL for file
 */
export const getDownloadUrl = (filename: string): string => {
  return `${API_BASE_URL}/download/${filename}`;
};

/**
 * Get file URL from backend response
 */
export const getFileUrl = (url: string): string => {
  if (url.startsWith('http')) {
    return url;
  }
  // Remove leading slash if present
  const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
  return `${API_BASE_URL}/${cleanUrl}`;
};

/**
 * Check if backend is accessible
 */
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await api.get('/', { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
};

/**
 * Download file to device
 * Platform-specific implementation needed
 */
export const downloadFile = async (url: string, filename: string) => {
  try {
    const fullUrl = getFileUrl(url);
    
    // For React Native, you'll need expo-file-system or react-native-fs
    // This is a placeholder - see implementation guide
    console.log('Download:', fullUrl, filename);
    return fullUrl;
  } catch (error) {
    console.error('Download Error:', error);
    throw error;
  }
};

export default api;