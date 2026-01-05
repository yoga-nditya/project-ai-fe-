import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ EXPORT supaya bisa dipakai di screen lain (CompanyDocumentsScreen, ChatScreen, dll)
export const API_BASE_URL = 'https://voizebit-ai.onrender.com'; // Production
// export const API_BASE_URL = 'http://10.141.42.128:5000'; // Local

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

/** ✅ OPTIONAL: MoU data kalau nanti mau dibuat PDF di mobile */
export interface MouItem {
  jenis_limbah: string;
  kode_limbah: string;
}
export interface MouData {
  nomor_depan: string; // "000"
  nomor_surat?: string; // "000/PKPLNB3/..."
  pihak_pertama: string;
  pihak_kedua: string;
  pihak_ketiga: string;
  items_limbah: MouItem[];
}

export interface APIResponse {
  text: string;
  files?: Array<{
    type: string;
    filename: string;
    url: string;
  }>;
  quotationData?: QuotationData;

  // ✅ OPTIONAL: kalau nanti dibutuhkan
  mouData?: MouData;

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
  type: string;
  filename: string;
  url: string;
}

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 90000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

let sessionId: string | null = null;

// ✅ dipakai untuk state extraction (quotation) dan nanti bisa untuk MoU
let conversationState: any = {};

// ✅ track flow aktif supaya state tidak nyampur quotation vs MoU vs Invoice
let activeFlow: 'quotation' | 'mou' | 'invoice' | 'other' = 'other';

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
      // @ts-ignore
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

// ==========================
// ✅ HELPERS: flow detector & state reset
// ==========================
const detectFlowFromMessage = (msg: string): 'quotation' | 'mou' | 'invoice' | 'other' => {
  const lower = (msg || '').toLowerCase();

  // MoU
  if (lower.includes('mou') || lower.includes('mo u') || lower.includes('m o u')) return 'mou';

  // Invoice
  if (
    lower.includes('invoice') ||
    lower.includes('invois') ||
    lower.includes('invoys') ||
    lower.includes('invoyce') ||
    lower.includes('faktur') ||
    lower.includes('tagihan')
  ) {
    return 'invoice';
  }

  // Quotation / Penawaran
  if (lower.includes('quotation') || lower.includes('kuotasi') || lower.includes('penawaran')) return 'quotation';

  return 'other';
};

const resetConversationState = () => {
  conversationState = {};
};

const resetStateIfNewFlow = (message: string) => {
  const flow = detectFlowFromMessage(message);

  // kalau user mulai flow baru -> reset state
  if (flow !== 'other' && flow !== activeFlow) {
    activeFlow = flow;
    resetConversationState();
  }

  // kalau user message netral tapi activeFlow belum ada, set saat terdeteksi
  if (activeFlow === 'other' && flow !== 'other') {
    activeFlow = flow;
  }
};

// ========== QUOTATION DATA EXTRACTION ==========
const extractQuotationData = (responseText: string): QuotationData | undefined => {
  if (
    !responseText.includes('Quotation berhasil dibuat') &&
    !responseText.includes('🎉') &&
    !conversationState.nama_perusahaan
  ) {
    return undefined;
  }

  if (conversationState.nama_perusahaan && conversationState.items_limbah && conversationState.items_limbah.length > 0) {
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

// ✅ OPTIONAL: extract MoU (biar siap kalau dibutuhkan)
const extractMouData = (responseText: string): MouData | undefined => {
  const ok = responseText.includes('MoU berhasil dibuat') || responseText.includes('Nomor MoU:');
  if (!ok && !conversationState.pihak_pertama) return undefined;

  if (conversationState.pihak_pertama && conversationState.items_limbah && conversationState.items_limbah.length > 0) {
    const mouData: MouData = {
      nomor_depan: conversationState.mou_nomor_depan || conversationState.nomor_depan || '000',
      nomor_surat: conversationState.nomor_surat,
      pihak_pertama: conversationState.pihak_pertama,
      pihak_kedua: conversationState.pihak_kedua || 'PT Sarana Trans Bersama Jaya',
      pihak_ketiga: conversationState.pihak_ketiga || '',
      items_limbah: conversationState.items_limbah || [],
    };
    console.log('✅ MoU data extracted:', mouData);
    return mouData;
  }

  return undefined;
};

const updateConversationState = (responseText: string): void => {
  const text = responseText.toLowerCase();

  // =========================
  // QUOTATION parsing (as-is)
  // =========================
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

  // =========================
  // ✅ MOU parsing (baru)
  // =========================
  const mouNoDepanMatch = responseText.match(/No Depan:.*?<b>(\d+)<\/b>/i);
  if (mouNoDepanMatch) conversationState.mou_nomor_depan = mouNoDepanMatch[1];

  const nomorMouMatch = responseText.match(/Nomor MoU:.*?<b>(.*?)<\/b>/i);
  if (nomorMouMatch) conversationState.nomor_surat = nomorMouMatch[1].trim();

  const pihak1Match = responseText.match(/PIHAK PERTAMA:.*?<b>(.*?)<\/b>/i);
  if (pihak1Match) conversationState.pihak_pertama = pihak1Match[1].trim();

  const pihak2Match = responseText.match(/PIHAK KEDUA:.*?<b>(.*?)<\/b>/i);
  if (pihak2Match) conversationState.pihak_kedua = pihak2Match[1].trim();

  const pihak3Match = responseText.match(/PIHAK KETIGA:.*?<b>(.*?)<\/b>/i);
  if (pihak3Match) conversationState.pihak_ketiga = pihak3Match[1].trim();

  // MoU items
  const mouItemJenis = responseText.match(/•\s*Jenis:\s*<b>(.*?)<\/b>/i);
  const mouItemKode = responseText.match(/•\s*Kode:\s*<b>(.*?)<\/b>/i);

  if (mouItemJenis && mouItemKode) {
    if (!conversationState.items_limbah) conversationState.items_limbah = [];
    conversationState.items_limbah.push({
      jenis_limbah: mouItemJenis[1].trim(),
      kode_limbah: mouItemKode[1].trim(),
    });
  }

  console.log('📊 Conversation state updated:', conversationState);
};

// ========== API FUNCTIONS ==========

/**
 * ✅ Send message to chatbot
 * ✅ FIX: kirim taskType ke backend supaya routing tidak nyasar (invoice/mou/quotation)
 */
export const sendMessage = async (message: string, historyId?: number, taskType?: string): Promise<APIResponse> => {
  try {
    resetStateIfNewFlow(message);

    const payload: any = { message: message.trim() };
    if (historyId) payload.history_id = historyId;

    // ✅ kirim taskType
    if (taskType) payload.taskType = taskType;

    const response = await api.post('/api/chat', payload);
    const data = response.data;

    if (data.text) {
      updateConversationState(data.text);
    }

    const quotationData = extractQuotationData(data.text);
    const mouData = extractMouData(data.text);

    if (quotationData && data.text.includes('Quotation berhasil dibuat')) {
      const finalData = { ...quotationData };
      resetConversationState();
      activeFlow = 'other';
      return { ...data, quotationData: finalData, mouData };
    }

    if (data.text && data.text.includes('MoU berhasil dibuat')) {
      const finalMou = mouData ? { ...mouData } : undefined;
      resetConversationState();
      activeFlow = 'other';
      return { ...data, quotationData, mouData: finalMou };
    }

    return { ...data, quotationData, mouData };
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
 * ✅ NEW: Company Documents (pakai service seperti ChatScreen)
 * Alias dari /api/documents
 *
 * Kalau backend kamu pakai endpoint /api/company-documents,
 * cukup ganti path = '/api/company-documents'
 */
export const getCompanyDocuments = async (q?: string): Promise<DocumentItem[]> => {
  try {
    const path = '/api/documents';
    const res = await api.get<{ items: DocumentItem[] }>(path, {
      params: q ? { q } : undefined,
    });
    return res.data?.items ?? [];
  } catch (error: any) {
    console.error('❌ getCompanyDocuments error:', error);
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
  if (path.startsWith('file://')) return path;
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
    resetConversationState();
    activeFlow = 'other';
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
  getCompanyDocuments, // ✅ NEW

  renameHistory,
  deleteHistory,
};
