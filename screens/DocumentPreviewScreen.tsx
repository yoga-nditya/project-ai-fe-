import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../App';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type DocumentPreviewScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'DocumentPreview'>;
  route: RouteProp<RootStackParamList, 'DocumentPreview'>;
};

export default function DocumentPreviewScreen({
  navigation,
  route,
}: DocumentPreviewScreenProps) {
  const { documentUrl, documentTitle, pdfUrl } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [canShare, setCanShare] = useState(false);
  
  // Store downloaded file URI
  const downloadedFileRef = useRef<{ docx?: string; pdf?: string }>({});

  const previewUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(documentUrl)}&embedded=true`;

  // Check if sharing is available
  React.useEffect(() => {
    Sharing.isAvailableAsync().then(setCanShare);
  }, []);

  const handleClose = () => {
    navigation.goBack();
  };

  // ✅ Download dengan pilihan format
  const handleDownloadChoice = (format: 'docx' | 'pdf') => {
    setShowDownloadMenu(false);
    
    if (format === 'pdf') {
      if (!pdfUrl) {
        Alert.alert('Info', 'PDF tidak tersedia');
        return;
      }
      const pdfFilename = documentTitle.replace('.docx', '.pdf').endsWith('.pdf') 
        ? documentTitle.replace('.docx', '.pdf')
        : documentTitle.replace('.docx', '') + '.pdf';
      downloadDocument(pdfUrl, pdfFilename, 'pdf');
    } else {
      const docxFilename = documentTitle.endsWith('.docx') 
        ? documentTitle 
        : documentTitle + '.docx';
      downloadDocument(documentUrl, docxFilename, 'docx');
    }
  };

  // ✅ Fungsi Download - HANYA SIMPAN FILE, TANPA SHARE
  const downloadDocument = async (url: string, filename: string, type: 'docx' | 'pdf') => {
    try {
      setDownloading(true);
      
      const fullUrl = url.startsWith('http') ? url : `${documentUrl.split('/static')[0]}${url}`;
      
      console.log('Downloading from:', fullUrl);
      console.log('Filename:', filename);
      
      const fileUri = FileSystem.documentDirectory + filename;
      
      // ✅ Download file SAJA - TIDAK BUKA SHARE
      const { uri } = await FileSystem.downloadAsync(fullUrl, fileUri);
      
      console.log('Download complete:', uri);
      
      // Simpan URI untuk sharing nanti
      downloadedFileRef.current[type] = uri;
      
      // ✅ HANYA ALERT - TIDAK SHARE
      Alert.alert(
        'Download Berhasil! ✅', 
        `File ${filename} tersimpan.\n\nGunakan tombol Share (🔗) untuk membagikan atau menyimpan ke perangkat.`,
        [{ text: 'OK' }]
      );
      
    } catch (error: any) {
      console.error('Download error:', error);
      Alert.alert('Error', `Gagal download: ${error.message}`);
    } finally {
      setDownloading(false);
    }
  };

  // ✅ Fungsi Share - BUKA SHARE SHEET
  const handleShare = async () => {
    try {
      setSharing(true);
      
      // Cek apakah sudah ada file yang di-download
      const hasDownloadedFile = downloadedFileRef.current.docx || downloadedFileRef.current.pdf;
      
      if (!hasDownloadedFile) {
        // Kalau belum download, download dulu
        Alert.alert(
          'Download Diperlukan',
          'File belum didownload. Silakan download terlebih dahulu.',
          [
            { text: 'Batal', style: 'cancel' },
            { 
              text: 'Download', 
              onPress: () => setShowDownloadMenu(true)
            }
          ]
        );
        setSharing(false);
        return;
      }

      // Pilih file yang mau di-share (prioritas: pdf > docx)
      const fileToShare = downloadedFileRef.current.pdf || downloadedFileRef.current.docx;
      const filename = fileToShare?.split('/').pop() || 'document';
      
      if (fileToShare) {
        // ✅ SHARE - Buka share sheet
        await Sharing.shareAsync(fileToShare, {
          mimeType: fileToShare.endsWith('.pdf') 
            ? 'application/pdf' 
            : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          dialogTitle: `Bagikan atau Simpan ${filename}`,
        });
      }
      
    } catch (error: any) {
      console.error('Share error:', error);
      
      // Jangan tampilkan error jika user cancel share
      if (!error.message?.includes('cancelled') && !error.message?.includes('canceled')) {
        Alert.alert('Error', `Gagal share: ${error.message}`);
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Preview Dokumen</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Preview Container */}
          <View style={styles.previewContainer}>
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#111827" />
                <Text style={styles.loadingText}>Memuat preview...</Text>
              </View>
            )}
            
            <WebView
              source={{ uri: previewUrl }}
              style={styles.webview}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              onError={(e) => {
                setLoading(false);
                console.error('WebView error:', e.nativeEvent);
                Alert.alert('Error', 'Gagal memuat preview. Silakan download file.');
              }}
              startInLoadingState={true}
              scalesPageToFit={true}
              javaScriptEnabled={true}
              domStorageEnabled={true}
            />
          </View>

          {/* ✅ Action Buttons - Download & Share */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.downloadButton, canShare && styles.downloadButtonWithShare]}
              onPress={() => setShowDownloadMenu(true)}
              disabled={downloading}
            >
              {downloading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.downloadButtonText}>📥 Download</Text>
              )}
            </TouchableOpacity>

            {/* ✅ Tombol Share */}
            {canShare && (
              <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShare}
                disabled={sharing || downloading}
              >
                {sharing ? (
                  <ActivityIndicator size="small" color="#111827" />
                ) : (
                  <Text style={styles.shareButtonText}>🔗</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Download Menu Modal */}
        {showDownloadMenu && (
          <View style={styles.menuOverlay}>
            <View style={styles.menuContainer}>
              <Text style={styles.menuTitle}>Pilih Format</Text>
              
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleDownloadChoice('docx')}
              >
                <Text style={styles.menuIcon}>📄</Text>
                <Text style={styles.menuItemText}>Download DOCX</Text>
              </TouchableOpacity>

              {pdfUrl && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleDownloadChoice('pdf')}
                >
                  <Text style={styles.menuIcon}>📕</Text>
                  <Text style={styles.menuItemText}>Download PDF</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.menuCancelButton}
                onPress={() => setShowDownloadMenu(false)}
              >
                <Text style={styles.menuCancelText}>Batal</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 40,
  },
  modalContainer: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_HEIGHT - 80,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    position: 'relative',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 18,
    color: '#6B7280',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  downloadButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadButtonWithShare: {
    flex: 1,
  },
  downloadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  shareButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  shareButtonText: {
    fontSize: 24,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  menuContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingHorizontal: 20,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 12,
  },
  menuIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  menuCancelButton: {
    marginTop: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  menuCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
});