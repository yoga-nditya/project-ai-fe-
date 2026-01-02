import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  StatusBar,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import RenderHTML from 'react-native-render-html';
import { RootStackParamList } from '../App';

import { getHistories, renameHistory, deleteHistory, HistoryItem } from '../services/api';

type HistoryScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'History'>;
};

type ChatHistory = {
  id: string;
  title: string; // bisa HTML / escaped HTML
  taskType: string;
};

// ✅ Decode entity HTML + unicode escape, bisa double-escaped
function decodeHtml(input: string): string {
  if (!input) return '';
  let s = String(input);

  const decodeOnce = (x: string) =>
    x
      // unicode escape JSON
      .replace(/\\u003C/gi, '<')
      .replace(/\\u003E/gi, '>')
      .replace(/\\u002F/gi, '/')
      .replace(/\\n/g, '\n')
      // entity HTML umum
      .replace(/&nbsp;/gi, ' ')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&#x27;/gi, "'")
      .replace(/&apos;/gi, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&amp;/gi, '&');

  // loop beberapa kali untuk kasus &amp;lt;... (double-escaped)
  for (let i = 0; i < 6; i++) {
    const before = s;
    s = decodeOnce(s);
    if (s === before) break;
  }
  return s;
}

// ✅ Bersihkan untuk input rename (user jangan lihat tag)
function stripAllTags(input: string): string {
  const s = decodeHtml(input || '');
  return s.replace(/<[^>]*>/g, '').replace(/\s{2,}/g, ' ').trim();
}

// ✅ Siapkan HTML untuk RenderHTML
function toRenderableHtml(input: string): string {
  const decoded = decodeHtml(input || '');

  // bungkus agar valid
  // NOTE: kita biarkan <b>/<i>/<br> dll tetap ada
  return `<div>${decoded}</div>`;
}

export default function HistoryScreen({ navigation }: HistoryScreenProps) {
  const { width } = useWindowDimensions();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [serverHistories, setServerHistories] = useState<HistoryItem[]>([]);

  const fetchHistories = async (q?: string, isRefresh?: boolean) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const rows = await getHistories(q);
      setServerHistories(rows);
    } catch (e) {
      console.log('fetchHistories error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistories();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchHistories(searchQuery.trim() ? searchQuery.trim() : undefined);
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const chatHistories: ChatHistory[] = useMemo(() => {
    return serverHistories.map((h) => ({
      id: String(h.id),
      title: h.title || '',
      taskType: h.task_type,
    }));
  }, [serverHistories]);

  const handleChatPress = (chat: ChatHistory) => {
    setSelectedChatId(null);
    navigation.navigate('Chat', { taskType: chat.taskType, historyId: Number(chat.id) });
  };

  const handleMenuPress = (chatId: string, title: string) => {
    if (selectedChatId === chatId) {
      setSelectedChatId(null);
    } else {
      setSelectedChatId(chatId);
      setEditTitle(stripAllTags(title)); // ✅ modal edit selalu plain text
    }
  };

  const handleEditPress = () => setShowEditModal(true);
  const handleDeletePress = () => setShowDeleteModal(true);

  const handleEditSave = async () => {
    const safe = stripAllTags(editTitle);
    if (safe && selectedChatId) {
      try {
        await renameHistory(Number(selectedChatId), safe); // ✅ kirim plain text
        await fetchHistories(searchQuery.trim() ? searchQuery.trim() : undefined, true);
      } catch (e) {
        console.log('rename error:', e);
      }
    }
    setShowEditModal(false);
    setSelectedChatId(null);
    setEditTitle('');
  };

  const handleEditCancel = () => {
    setShowEditModal(false);
    setEditTitle('');
  };

  const handleDeleteConfirm = async () => {
    if (selectedChatId) {
      try {
        await deleteHistory(Number(selectedChatId));
        await fetchHistories(searchQuery.trim() ? searchQuery.trim() : undefined, true);
      } catch (e) {
        console.log('delete error:', e);
      }
    }
    setShowDeleteModal(false);
    setSelectedChatId(null);
  };

  const handleDeleteCancel = () => setShowDeleteModal(false);
  const handleCancelMenu = () => setSelectedChatId(null);

  const renderChatItem = ({ item }: { item: ChatHistory }) => (
    <View style={styles.chatItemContainer}>
      <Pressable
        style={({ pressed }) => [styles.chatItem, pressed && styles.chatItemPressed]}
        onPress={() => handleChatPress(item)}
      >
        <RenderHTML
          contentWidth={width - 32 - 50}
          source={{ html: toRenderableHtml(item.title) }}
          baseStyle={styles.chatTitle}
          tagsStyles={{
            b: { fontWeight: '700' },
            strong: { fontWeight: '700' },
            i: { fontStyle: 'italic' },
            em: { fontStyle: 'italic' },
            br: { marginBottom: 0 },
            div: { margin: 0, padding: 0 },
            span: { margin: 0, padding: 0 },
          }}
          allowedDomTags={['div', 'span', 'b', 'strong', 'i', 'em', 'br']}
          defaultTextProps={{ numberOfLines: 1 }}
        />
      </Pressable>

      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => handleMenuPress(item.id, item.title)}
        activeOpacity={0.7}
      >
        <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.wrapper}>
          <View style={styles.header}>
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={18} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-forward" size={22} color="#000" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.quickActionsContainer}>
              <Pressable
                style={({ pressed }) => [styles.quickActionItem, pressed && styles.quickActionPressed]}
                onPress={() => navigation.navigate('Home')} // ✅ DIUBAH: Buat Chat Baru -> Home
              >
                <Ionicons name="chatbubble" size={20} color="#000" />
                <Text style={styles.quickActionText}>Buat Chat Baru</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.quickActionItem, pressed && styles.quickActionPressed]}
                onPress={() => navigation.navigate('Documents')}
              >
                <Ionicons name="document" size={20} color="#000" />
                <Text style={styles.quickActionText}>File Dokumen</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.quickActionItem, pressed && styles.quickActionPressed]}
                onPress={() => console.log('Template')}
              >
                <Ionicons name="copy" size={20} color="#000" />
                <Text style={styles.quickActionText}>Template</Text>
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>Riwayat Chat</Text>

            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>Memuat history...</Text>
              </View>
            ) : (
              <FlatList
                data={chatHistories}
                renderItem={renderChatItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                refreshing={refreshing}
                onRefresh={() => fetchHistories(searchQuery.trim() ? searchQuery.trim() : undefined, true)}
                ListEmptyComponent={
                  <View style={styles.emptyWrap}>
                    <Text style={styles.emptyText}>Belum ada riwayat.</Text>
                  </View>
                }
              />
            )}
          </View>

          {selectedChatId && (
            <>
              <Pressable style={styles.menuBackdrop} onPress={handleCancelMenu} />
              <View style={styles.popupMenuContainer}>
                <View style={styles.popupMenu}>
                  <TouchableOpacity style={styles.menuItem} onPress={handleEditPress} activeOpacity={0.7}>
                    <Ionicons name="create-outline" size={22} color="#000" />
                    <Text style={styles.menuItemText}>Ganti Nama</Text>
                  </TouchableOpacity>

                  <View style={styles.menuDivider} />

                  <TouchableOpacity style={styles.menuItem} onPress={handleDeletePress} activeOpacity={0.7}>
                    <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                    <Text style={[styles.menuItemText, { color: '#FF3B30' }]}>Hapus</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* Edit Modal */}
      <Modal visible={showEditModal} transparent animationType="fade" onRequestClose={handleEditCancel}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalKeyboardView}>
          <Pressable style={styles.modalOverlay} onPress={handleEditCancel}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Ubah Nama Chat</Text>
                <TouchableOpacity onPress={handleEditCancel} style={styles.closeButton} activeOpacity={0.7}>
                  <Ionicons name="close" size={22} color="#000" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.modalInput}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Nama chat"
                  placeholderTextColor="#999"
                  autoFocus
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={handleEditCancel} activeOpacity={0.7}>
                  <Text style={styles.cancelButtonText}>Batal</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.confirmButton} onPress={handleEditSave} activeOpacity={0.7}>
                  <Text style={styles.confirmButtonText}>Ya</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={handleDeleteCancel}>
        <Pressable style={styles.modalOverlay} onPress={handleDeleteCancel}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <TouchableOpacity onPress={handleDeleteCancel} style={styles.closeButtonTop} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#000" />
            </TouchableOpacity>

            <View style={styles.deleteIconContainer}>
              <Ionicons name="trash" size={32} color="#FF3B30" />
            </View>

            <Text style={styles.deleteTitle}>Hapus Chat</Text>
            <Text style={styles.deleteMessage}>
              Percakapan ini akan dihapus secara permanen{'\n'}dan tidak dapat dikembalikan.
            </Text>

            <TouchableOpacity style={styles.deleteConfirmButton} onPress={handleDeleteConfirm} activeOpacity={0.7}>
              <Text style={styles.deleteConfirmText}>Hapus</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8E8E8' },
  wrapper: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#E8E8E8',
    gap: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#000' },
  backButton: { width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, backgroundColor: '#E8E8E8' },
  quickActionsContainer: { marginHorizontal: 16, marginTop: 8, marginBottom: 8 },
  quickActionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 0, gap: 12 },
  quickActionPressed: { opacity: 0.6 },
  quickActionText: { fontSize: 15, color: '#000', fontWeight: '400' },
  sectionTitle: { fontSize: 13, color: '#999', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, fontWeight: '400' },
  listContent: { paddingBottom: 20 },
  chatItemContainer: { marginHorizontal: 16, marginBottom: 1, position: 'relative' },
  chatItem: { backgroundColor: '#E8E8E8', paddingVertical: 16, paddingHorizontal: 16, paddingRight: 50 },
  chatItemPressed: { backgroundColor: '#D8D8D8' },
  chatTitle: { fontSize: 15, color: '#000', fontWeight: '400' },
  menuButton: { position: 'absolute', right: 16, top: 0, bottom: 0, width: 40, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  menuBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'transparent', zIndex: 9998 },
  popupMenuContainer: { position: 'absolute', top: 200, right: 26, zIndex: 9999 },
  popupMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
    minWidth: 160,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  menuDivider: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 12 },
  menuItemText: { fontSize: 16, color: '#000', fontWeight: '500' },
  modalKeyboardView: { flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '85%', maxWidth: 340 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 17, fontWeight: '600', color: '#000' },
  closeButton: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  closeButtonTop: { position: 'absolute', top: 16, right: 16, width: 28, height: 28, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  inputWrapper: { marginBottom: 24 },
  modalInput: { backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#000' },
  modalButtons: { flexDirection: 'row', gap: 12 },
  cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#F5F5F5' },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#666' },
  confirmButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#000' },
  confirmButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  deleteIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFE5E5', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginTop: 8, marginBottom: 20 },
  deleteTitle: { fontSize: 20, fontWeight: '600', color: '#000', textAlign: 'center', marginBottom: 12 },
  deleteMessage: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  deleteConfirmButton: { backgroundColor: '#fff', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#FF3B30' },
  deleteConfirmText: { fontSize: 16, fontWeight: '600', color: '#FF3B30' },
  loadingWrap: { paddingTop: 40, alignItems: 'center', gap: 10 },
  loadingText: { color: '#666' },
  emptyWrap: { paddingTop: 30, alignItems: 'center' },
  emptyText: { color: '#666' },
});
