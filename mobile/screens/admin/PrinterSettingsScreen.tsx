import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../components/api/client';

type Printer = {
  _id: string;
  name: string;
  host: string;
  port: number;
  isActive: boolean;
  isDefault: boolean;
};

export default function PrinterSettingsScreen({ route, navigation }: any) {
  const branchId = route?.params?.branchId;
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('Counter Printer');
  const [host, setHost] = useState('192.168.1.100');
  const [port, setPort] = useState('9100');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ printers: Printer[] }>(
        `/printers${branchId ? `?branchId=${branchId}` : ''}`
      );
      if (res.success) setPrinters((res.data as any)?.printers || []);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addPrinter = async () => {
    if (!branchId) {
      Alert.alert('Branch required', 'Open this screen from a branch context.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/printers', {
        branchId,
        name,
        host,
        port: Number(port) || 9100,
        isDefault: printers.length === 0,
      });
      if (res.success) {
        setName('Counter Printer');
        await load();
        Alert.alert('Saved', 'Printer added.');
      } else {
        Alert.alert('Error', res.message || 'Failed to save');
      }
    } finally {
      setSaving(false);
    }
  };

  const testPrint = async (id: string) => {
    try {
      const res = await api.post(`/printers/${id}/test`, {});
      if (res.success) Alert.alert('Success', 'Test print sent.');
      else Alert.alert('Error', res.message || 'Test failed');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Test failed');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
        <Ionicons name="arrow-back" size={22} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Thermal Printers</Text>
      <Text style={styles.sub}>Network ESC/POS printers (port 9100). Bills auto-print on generate.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />
        <Text style={styles.label}>IP address</Text>
        <TextInput style={styles.input} value={host} onChangeText={setHost} autoCapitalize="none" />
        <Text style={styles.label}>Port</Text>
        <TextInput style={styles.input} value={port} onChangeText={setPort} keyboardType="numeric" />
        <TouchableOpacity style={styles.btn} onPress={addPrinter} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Add printer</Text>}
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        printers.map((p) => (
          <View key={p._id} style={styles.printerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.printerName}>{p.name}</Text>
              <Text style={styles.printerMeta}>{p.host}:{p.port}</Text>
            </View>
            <TouchableOpacity onPress={() => testPrint(p._id)} style={styles.testBtn}>
              <Text style={styles.testText}>Test</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  back: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backText: { marginLeft: 6, fontSize: 16 },
  title: { fontSize: 22, fontWeight: '700' },
  sub: { color: '#8E8E93', marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 },
  label: { fontSize: 12, color: '#8E8E93', marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 8, padding: 10, marginTop: 4 },
  btn: { backgroundColor: '#FF7A59', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 16 },
  btnText: { color: '#fff', fontWeight: '700' },
  printerRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    alignItems: 'center',
  },
  printerName: { fontWeight: '700' },
  printerMeta: { color: '#8E8E93', fontSize: 12 },
  testBtn: { backgroundColor: '#2BC48A', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  testText: { color: '#fff', fontWeight: '600' },
});
