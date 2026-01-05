import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

import { getCompanyDocuments } from '../services/api';
import type { DocumentItem } from '../services/api';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CompanyDocuments'>;
};

type DocItem = {
  key: string;
  title: string;
  filename: string;
  type: string;
  url: string;
};

export default function CompanyDocumentsScreen({ navigation }: Props) {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [openingKey, setOpeningKey] = useState<string | null>(null);
  const [items, setItems] = useState<DocItem[]>([]);
  const [thumbErrorMap, setThumbErrorMap] = useState<Record<string, boolean>>({});

  const buildPreviewUrl = (fullFileUrl: string) => {
    const joiner = fullFileUrl.includes('?') ? '&' : '?';
    return `${fullFileUrl}${joiner}thumbnail=1`;
  };

  const fetchCompanyDocs = async (query?: string) => {
    try {
      setLoading(true);

      const docs: DocumentItem[] = await getCompanyDocuments(query);

      const list: DocItem[] = (docs || []).map((d: any, idx: number) => {
        return {
          key: `${d.filename}_${idx}`,
          title: d.history_title || d.filename,
          filename: d.filename,
          type: (d.type || 'pdf').toLowerCase(),
          url: d.url, // ✅ sudah full dari getFileUrl helper di api.ts kalau kamu gunakan di backend
        };
      });

      setItems(list);
      setThumbErrorMap({}); // reset thumb errors biar reload bersih
    } catch (e) {
      console.log('fetchCompanyDocs error:', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyDocs();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchCompanyDocs(q.trim() ? q.trim() : undefined);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const filtered = useMemo(() => items, [items]);

  const openDoc = async (doc: DocItem) => {
    try {
      setOpeningKey(doc.key);

      if (doc.type === 'pdf' || doc.filename.toLowerCase().endsWith('.pdf')) {
        navigation.navigate('DocumentPreview', {
          documentUrl: doc.url,
          documentTitle: doc.title,
          pdfUrl: doc.url,
        });
        return;
      }

      navigation.navigate('DocumentPreview', {
        documentUrl: doc.url,
        documentTitle: doc.title,
      });
    } catch (e: any) {
      console.log('openDoc error:', e?.message || e);
    } finally {
      setOpeningKey(null);
    }
  };

  const renderItem = ({ item }: { item: DocItem }) => {
    const isOpening = openingKey === item.key;
    const badgeText = item.type.toUpperCase();

    const thumbError = !!thumbErrorMap[item.key];
    const previewUrl = buildPreviewUrl(item.url);

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => openDoc(item)}
      >
        <View style={styles.thumb}>
          {isOpening ? (
            <View style={styles.thumbLoading}>
              <ActivityIndicator />
              <Text style={styles.loadingText}>Membuka...</Text>
            </View>
          ) : !thumbError ? (
            <>
              <Image
                source={{ uri: previewUrl }}
                style={styles.thumbImage}
                resizeMode="cover"
                onError={() => setThumbErrorMap((prev) => ({ ...prev, [item.key]: true }))}
              />
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{badgeText}</Text>
              </View>
            </>
          ) : (
            <>
              <Ionicons name="document-text-outline" size={30} color="#111" />
              <Text style={styles.thumbHint}>{badgeText}</Text>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{badgeText}</Text>
              </View>
            </>
          )}
        </View>

        <Text style={styles.filename} numberOfLines={2}>
          {item.title}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.topHeader}>
        <Text style={styles.headerTitle}>Dokumen Perusahaan</Text>
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
          <Text style={styles.loadingText2}>Memuat dokumen...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(x) => x.key}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>Dokumen tidak ditemukan.</Text>
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
    overflow: 'hidden',
  },

  thumbImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },

  thumbHint: { fontSize: 12, color: '#666', marginTop: 6 },

  thumbLoading: { alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 12, color: '#666' },

  typeBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  typeBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },

  filename: { marginTop: 10, fontSize: 13, color: '#111' },

  loadingWrap: { paddingTop: 40, alignItems: 'center', gap: 10 },
  loadingText2: { color: '#666' },

  emptyWrap: { paddingTop: 40, alignItems: 'center' },
  emptyText: { color: '#666' },
});
