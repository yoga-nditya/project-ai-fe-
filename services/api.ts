import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * API Service with Quotation Data Extraction
 * Extracts structured data from backend response for client-side PDF generation
 */

// ========== CONFIGURATION ==========
const API_BASE_URL = 'https://voizebit-ai.onrender.com'; // Production
// const API_BASE_URL = 'http://192.168.18.121:5000'; // Local

console.log('🌐 API Backend:', API_BASE_URL);

// ========== TYPES ==========
interface QuotationItem {
  jenis_limbah: string;
  kode_limbah: string;
  harga: string | number;
  satuan: string;
}

export interface QuotationData {
  nomor_depan: string;
  nama_perusahaan: string;
  alamat_perusahaan: string;
  items_limbah: QuotationItem[];
  harga_transportasi: string | number;
  harga_mou?: string | number;
  termin_hari: string | number;
}

export interface APIResponse {
  text: string;
  files?: Array<{
    type: string;
    filename: string;
    url: string;
  }>;
  quotationData?: QuotationData;

  // ✅ NEW: backend kamu sudah mengembalikan history_id saat start / finish
  history_id?: number;
}

/** ✅ NEW: History types (DB) */
export interface HistoryItem {
  id: number;
  title: string;
  task_type: string;
  created_at: string;
  updated_at?: string;
}

export interface HistoryMessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  files?: Array<{ type: string; filename: string; url: string }>;
  timestamp: string;
}

export interface HistoryDetail {
  id: number;
  title: string;
  task_type: string;
  created_at: string;
  data: any;
  files: Array<{ type: string; filename: string; url: string }>;
  messages: HistoryMessageItem[];
  state: any;
}

/** ✅ NEW: Documents list types */
export interface DocumentItem {
  history_id: number;
  history_title: string;
  task_type: string;
  created_at: string;
  type: string; // docx/pdf
  filename: string;
  url: string;
}

// ========== AXIOS INSTANCE ==========
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 90000, // 90 seconds for Render cold start
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// ========== SESSION MANAGEMENT ==========
let sessionId: string | null = null;
let conversationState: any = {}; // Store conversation state for PDF generation

const initializeSession = async (): Promise<string> => {
  try {
    let sid = await AsyncStorage.getItem('session_id');

    if (!sid) {
      sid = `mobile_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      await AsyncStorage.setItem('session_id', sid);
      console.log('✅ New session created:', sid);
    } else {
      console.log('✅ Existing session loaded:', sid);
    }

    sessionId = sid;
    return sid;
  } catch (error) {
    console.error('❌ Session init error:', error);
    const tempSid = `mobile_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    sessionId = tempSid;
    return tempSid;
  }
};

initializeSession();

// ========== REQUEST INTERCEPTOR ==========
api.interceptors.request.use(
  async (config) => {
    if (!sessionId) {
      await initializeSession();
    }

    if (sessionId) {
      config.headers['X-Session-ID'] = sessionId;
    }

    console.log('📤 API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      session: sessionId,
    });

    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// ========== RESPONSE INTERCEPTOR ==========
api.interceptors.response.use(
  (response) => {
    console.log('📥 API Response:', {
      status: response.status,
      url: response.config.url,
    });
    return response;
  },
  (error) => {
    console.error('❌ API Error:', {
      message: error.message,
      status: error.response?.status,
      url: error.config?.url,
    });
    return Promise.reject(error);
  }
);

// ========== QUOTATION DATA EXTRACTION ==========
const extractQuotationData = (responseText: string): QuotationData | undefined => {
  if (
    !responseText.includes('Quotation berhasil dibuat') &&
    !responseText.includes('🎉') &&
    !conversationState.nama_perusahaan
  ) {
    return undefined;
  }

  if (
    conversationState.nama_perusahaan &&
    conversationState.items_limbah &&
    conversationState.items_limbah.length > 0
  ) {
    const quotationData: QuotationData = {
      nomor_depan: conversationState.nomor_depan || '001',
      nama_perusahaan: conversationState.nama_perusahaan,
      alamat_perusahaan: conversationState.alamat_perusahaan || '',
      items_limbah: conversationState.items_limbah || [],
      harga_transportasi: conversationState.harga_transportasi || '1200000',
      harga_mou: conversationState.harga_mou,
      termin_hari: conversationState.termin_hari || '14',
    };

    console.log('✅ Quotation data extracted:', quotationData);
    return quotationData;
  }

  return undefined;
};

const updateConversationState = (responseText: string): void => {
  const text = responseText.toLowerCase();

  const nomorMatch = responseText.match(/Nomor Surat:.*?<b>(\d+)<\/b>/i);
  if (nomorMatch) conversationState.nomor_depan = nomorMatch[1];

  const namaMatch = responseText.match(/Nama:.*?<b>(.*?)<\/b>/i);
  if (namaMatch) conversationState.nama_perusahaan = namaMatch[1].trim();

  const alamatMatch = responseText.match(/Alamat:.*?<b>(.*?)<\/b>/i);
  if (alamatMatch && !alamatMatch[1].includes('belum ditemukan')) {
    conversationState.alamat_perusahaan = alamatMatch[1].trim();
  }

  const kodeMatch = responseText.match(/Kode:.*?<b>(.*?)<\/b>/i);
  const jenisMatch = responseText.match(/Jenis:.*?<b>(.*?)<\/b>/i);
  const satuanMatch = responseText.match(/Satuan:.*?<b>(.*?)<\/b>/i);
  const hargaMatch = responseText.match(/Harga:.*?<b>Rp ([\d.]+)<\/b>/i);

  if (kodeMatch && jenisMatch && satuanMatch && hargaMatch) {
    if (!conversationState.items_limbah) conversationState.items_limbah = [];
    conversationState.current_item = {
      kode_limbah: kodeMatch[1].trim(),
      jenis_limbah: jenisMatch[1].trim(),
      satuan: satuanMatch[1].trim(),
      harga: hargaMatch[1].replace(/\./g, ''),
    };
  }

  if (text.includes('item #') && text.includes('tersimpan')) {
    if (conversationState.current_item) {
      conversationState.items_limbah.push(conversationState.current_item);
      conversationState.current_item = null;
    }
  }

  const transportasiMatch = responseText.match(/Transportasi:.*?<b>Rp ([\d.]+)\/ritase<\/b>/i);
  if (transportasiMatch) conversationState.harga_transportasi = transportasiMatch[1].replace(/\./g, '');

  const mouMatch = responseText.match(/MoU:.*?<b>Rp ([\d.]+)\/Tahun<\/b>/i);
  if (mouMatch) conversationState.harga_mou = mouMatch[1].replace(/\./g, '');

  const terminMatch = responseText.match(/Termin:.*?<b>(\d+).*?hari<\/b>/i);
  if (terminMatch) conversationState.termin_hari = terminMatch[1];

  console.log('📊 Conversation state updated:', conversationState);
};

// ========== API FUNCTIONS ==========

/**
 * ✅ Send message to chatbot (support history_id supaya lanjut chat lama)
 */
export const sendMessage = async (message: string, historyId?: number): Promise<APIResponse> => {
  try {
    const payload: any = { message: message.trim() };
    if (historyId) payload.history_id = historyId;

    const response = await api.post('/api/chat', payload);
    const data = response.data;

    if (data.text) {
      updateConversationState(data.text);
    }

    const quotationData = extractQuotationData(data.text);

    if (quotationData && data.text.includes('Quotation berhasil dibuat')) {
      const finalData = { ...quotationData };
      conversationState = {};
      return { ...data, quotationData: finalData };
    }

    return { ...data, quotationData };
  } catch (error: any) {
    console.error('❌ sendMessage error:', error);

    if (error.response) {
      throw new Error(error.response.data?.error || `Server error: ${error.response.status}`);
    } else if (error.request) {
      throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
    } else {
      throw new Error(error.message || 'Terjadi kesalahan');
    }
  }
};

/**
 * ✅ NEW: Get histories
 * GET /api/history?q=
 */
export const getHistories = async (q?: string): Promise<HistoryItem[]> => {
  try {
    const res = await api.get<{ items: HistoryItem[] }>('/api/history', {
      params: q ? { q } : undefined,
    });
    return res.data?.items ?? [];
  } catch (error: any) {
    console.error('❌ getHistories error:', error);
    if (error.response) throw new Error(error.response.data?.error || `Server error: ${error.response.status}`);
    throw new Error(error.message || 'Terjadi kesalahan');
  }
};

/**
 * ✅ NEW: History detail (messages, files, state)
 * GET /api/history/:id
 */
export const getHistoryDetail = async (id: number): Promise<HistoryDetail> => {
  try {
    const res = await api.get<HistoryDetail>(`/api/history/${id}`);
    return res.data as any;
  } catch (error: any) {
    console.error('❌ getHistoryDetail error:', error);
    if (error.response) throw new Error(error.response.data?.error || `Server error: ${error.response.status}`);
    throw new Error(error.message || 'Terjadi kesalahan');
  }
};

/**
 * ✅ NEW: Documents list
 * GET /api/documents?q=
 */
export const getDocuments = async (q?: string): Promise<DocumentItem[]> => {
  try {
    const res = await api.get<{ items: DocumentItem[] }>('/api/documents', {
      params: q ? { q } : undefined,
    });
    return res.data?.items ?? [];
  } catch (error: any) {
    console.error('❌ getDocuments error:', error);
    if (error.response) throw new Error(error.response.data?.error || `Server error: ${error.response.status}`);
    throw new Error(error.message || 'Terjadi kesalahan');
  }
};

/**
 * ✅ NEW: Rename history
 */
export const renameHistory = async (id: number, title: string): Promise<void> => {
  try {
    await api.put(`/api/history/${id}`, { title });
  } catch (error: any) {
    console.error('❌ renameHistory error:', error);
    if (error.response) throw new Error(error.response.data?.error || `Server error: ${error.response.status}`);
    throw new Error(error.message || 'Terjadi kesalahan');
  }
};

/**
 * ✅ NEW: Delete history
 */
export const deleteHistory = async (id: number): Promise<void> => {
  try {
    await api.delete(`/api/history/${id}`);
  } catch (error: any) {
    console.error('❌ deleteHistory error:', error);
    if (error.response) throw new Error(error.response.data?.error || `Server error: ${error.response.status}`);
    throw new Error(error.message || 'Terjadi kesalahan');
  }
};

export const getFileUrl = (path: string): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${API_BASE_URL}/${cleanPath}`;
};

export const getDownloadUrl = (filename: string): string => {
  return `${API_BASE_URL}/download/${filename}`;
};

export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    console.log('🔍 Checking backend health...');
    const response = await axios.get(API_BASE_URL, {
      timeout: 10000,
      validateStatus: (status) => status === 200 || status === 404,
    });
    console.log('✅ Backend is online:', response.status);
    return true;
  } catch (error: any) {
    console.error('❌ Backend health check failed:', error.message);
    return false;
  }
};

export const resetSession = async (): Promise<void> => {
  try {
    const newSid = `mobile_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    await AsyncStorage.setItem('session_id', newSid);
    sessionId = newSid;
    conversationState = {};
    console.log('✅ Session reset:', newSid);
  } catch (error) {
    console.error('❌ Reset session error:', error);
  }
};

export const getSessionId = (): string | null => sessionId;
export const getConversationState = (): any => conversationState;

export const testConnection = async (): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> => {
  try {
    console.log('🧪 Testing API connection...');
    console.log('   URL:', API_BASE_URL);

    const healthCheck = await checkBackendHealth();
    if (!healthCheck) {
      return { success: false, message: 'Backend tidak dapat dijangkau', details: { url: API_BASE_URL } };
    }

    try {
      await sendMessage('test');
      return { success: true, message: 'Koneksi berhasil!', details: { url: API_BASE_URL, session: sessionId } };
    } catch (error: any) {
      return { success: false, message: 'Backend online tapi API error', details: { error: error.message } };
    }
  } catch (error: any) {
    console.error('❌ Connection test error:', error);
    return { success: false, message: 'Gagal test koneksi', details: { error: error.message } };
  }
};

export default {
  sendMessage,
  getFileUrl,
  getDownloadUrl,
  checkBackendHealth,
  resetSession,
  getSessionId,
  getConversationState,
  testConnection,
  API_BASE_URL,
  getHistories,
  getHistoryDetail,
  getDocuments,
  renameHistory,
  deleteHistory,
};
