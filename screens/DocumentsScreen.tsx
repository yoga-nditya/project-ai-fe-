import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { getDocuments, DocumentItem, getFileUrl } from '../services/api';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Documents'>;
};

type DocCard = {
  key: string;
  title: string;
  filename: string;
  type: string;
  url: string;
  history_id: number;
};

export default function DocumentsScreen({ navigation }: Props) {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<DocumentItem[]>([]);

  const fetchDocs = async (query?: string) => {
    try {
      setLoading(true);
      const res = await getDocuments(query);
      setItems(res);
    } catch (e) {
      console.log('fetchDocs error:', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchDocs(q.trim() ? q.trim() : undefined);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const cards: DocCard[] = useMemo(() => {
    return (items || []).map((d, idx) => ({
      key: `${d.history_id}_${d.filename}_${idx}`,
      title: d.filename,
      filename: d.filename,
      type: d.type,
      url: d.url,
      history_id: d.history_id,
    }));
  }, [items]);

  const openDoc = (doc: DocCard) => {
    const fullUrl = doc.url.startsWith('file://') ? doc.url : getFileUrl(doc.url);

    // jika pdf -> set pdfUrl juga
    if (doc.type === 'pdf') {
      navigation.navigate('DocumentPreview', {
        documentUrl: fullUrl,
        documentTitle: doc.filename,
        pdfUrl: fullUrl,
      });
      return;
    }

    // docx
    navigation.navigate('DocumentPreview', {
      documentUrl: fullUrl,
      documentTitle: doc.filename,
    });
  };

  const renderItem = ({ item }: { item: DocCard }) => {
    return (
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={() => openDoc(item)}>
        <View style={styles.thumb}>
          <Ionicons name="document-text-outline" size={30} color="#111" />
          <Text style={styles.thumbHint}>{item.type.toUpperCase()}</Text>
        </View>

        <Text style={styles.filename} numberOfLines={2}>
          {item.filename}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header mirip gambar */}
      <View style={styles.topHeader}>
        <Text style={styles.headerTitle}>File Dokumen</Text>
        <Pressable style={styles.headerRight} onPress={() => navigation.goBack()}>
          <Ionicons name="menu" size={20} color="#000" />
        </Pressable>
      </View>

      <View style={styles.searchBarWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#999" />
          <TextInput
            placeholder="Cari..."
            placeholderTextColor="#999"
            style={styles.searchInput}
            value={q}
            onChangeText={setQ}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Memuat dokumen...</Text>
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(x) => x.key}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>Belum ada dokumen.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8E8E8' },

  topHeader: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#111' },
  headerRight: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F3F3',
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchBarWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#000' },

  grid: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  row: { gap: 12 },
  card: {
    flex: 1,
    backgroundColor: '#F3F3F3',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  cardPressed: { opacity: 0.7 },

  thumb: {
    height: 90,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  thumbHint: { fontSize: 12, color: '#666' },

  filename: { marginTop: 10, fontSize: 13, color: '#111' },

  loadingWrap: { paddingTop: 40, alignItems: 'center', gap: 10 },
  loadingText: { color: '#666' },

  emptyWrap: { paddingTop: 40, alignItems: 'center' },
  emptyText: { color: '#666' },
});
