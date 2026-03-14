import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

interface Address {
  id: string;
  label: string;
  address: string;
  city: string;
  zipCode: string;
  isDefault: boolean;
  type: 'home' | 'work' | 'other';
}

export default function AddressesScreen() {
  const navigation = useNavigation();

  const [addresses, setAddresses] = useState<Address[]>([
    {
      id: '1',
      label: 'Home',
      address: 'House 123, Street 45, North Nazimabad',
      city: 'Karachi',
      zipCode: '75600',
      isDefault: true,
      type: 'home'
    },
    {
      id: '2',
      label: 'Office',
      address: 'Office 456, Business Park, DHA',
      city: 'Karachi',
      zipCode: '75500',
      isDefault: false,
      type: 'work'
    }
  ]);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ label: '', address: '', city: '', zipCode: '', type: 'home' as 'home' | 'work' | 'other' });

  const handleSave = () => {
    if (!form.label || !form.address || !form.city || !form.zipCode) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (editingId) {
      setAddresses(addresses.map(a => a.id === editingId ? { ...a, ...form } : a));
    } else {
      setAddresses([...addresses, { id: Date.now().toString(), ...form, isDefault: addresses.length === 0 }]);
    }

    setForm({ label: '', address: '', city: '', zipCode: '', type: 'home' });
    setEditingId(null);
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (addresses.length === 1) {
      Alert.alert('Error', 'You must keep at least one address');
      return;
    }
    Alert.alert('Delete Address?', 'Are you sure you want to remove this address?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setAddresses(addresses.filter(a => a.id !== id)) }
    ]);
  };

  const handleDefault = (id: string) => {
    setAddresses(addresses.map(a => ({ ...a, isDefault: a.id === id })));
  };

  const getIcon = (type: string) => {
    return type === 'home' ? 'home' : type === 'work' ? 'briefcase' : 'location';
  };

  const openModal = (address?: Address) => {
    if (address) {
      setEditingId(address.id);
      setForm({ label: address.label, address: address.address, city: address.city, zipCode: address.zipCode, type: address.type });
    } else {
      setEditingId(null);
      setForm({ label: '', address: '', city: '', zipCode: '', type: 'home' });
    }
    setShowModal(true);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text_dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Addresses</Text>
        <TouchableOpacity onPress={() => openModal()}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={addresses}
        renderItem={({ item }) => (
          <View style={[styles.addressCard, { borderLeftColor: item.isDefault ? colors.primary : colors.gray_300 }]}>
            <View style={styles.addressHeader}>
              <View style={styles.iconContainer}>
                <Ionicons name={getIcon(item.type) as any} size={20} color={colors.primary} />
              </View>
              <View style={styles.addressInfo}>
                <View style={styles.labelRow}>
                  <Text style={styles.addressLabel}>{item.label}</Text>
                  {item.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultText}>Default</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            <Text style={styles.addressText}>{item.address}</Text>
            <Text style={styles.cityText}>{item.city} - {item.zipCode}</Text>
            
            <View style={styles.actionButtons}>
              {!item.isDefault && (
                <TouchableOpacity onPress={() => handleDefault(item.id)} style={styles.defaultButton}>
                  <Text style={styles.defaultButtonText}>SET DEFAULT</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => openModal(item)} style={styles.editButton}>
                <Text style={styles.editButtonText}>EDIT</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
                <Text style={styles.deleteButtonText}>DELETE</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={80} color={colors.gray_300} />
            <Text style={styles.emptyTitle}>No addresses saved</Text>
            <Text style={styles.emptySubtitle}>Add your delivery addresses</Text>
          </View>
        }
      />

      {/* Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={colors.text_dark} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Address' : 'Add Address'}</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Address Type</Text>
                <View style={styles.typeButtons}>
                  {['Home', 'Work', 'Other'].map(t => (
                    <TouchableOpacity 
                      key={t} 
                      onPress={() => setForm({ ...form, label: t, type: t.toLowerCase() as any })} 
                      style={[styles.typeButton, form.label === t && styles.typeButtonActive]}
                    >
                      <Text style={[styles.typeButtonText, form.label === t && styles.typeButtonTextActive]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Full Address</Text>
                <TextInput 
                  value={form.address} 
                  onChangeText={v => setForm({ ...form, address: v })} 
                  placeholder="Enter full address" 
                  multiline 
                  numberOfLines={3} 
                  style={styles.textArea} 
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>City</Text>
                <TextInput 
                  value={form.city} 
                  onChangeText={v => setForm({ ...form, city: v })} 
                  placeholder="e.g., Karachi" 
                  style={styles.input} 
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Zip Code</Text>
                <TextInput 
                  value={form.zipCode} 
                  onChangeText={v => setForm({ ...form, zipCode: v })} 
                  placeholder="e.g., 75600" 
                  keyboardType="numeric"
                  style={styles.input} 
                />
              </View>
            </ScrollView>

            <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>SAVE ADDRESS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
  },
  headerTitle: { fontSize: typography.sizes.h3, fontWeight: typography.weights.bold, color: colors.text_dark },
  addressesList: { padding: spacing.horizontal },
  addressCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.light,
  },
  addressHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  addressIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  addressInfo: { flex: 1 },
  addressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  addressLabel: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text_dark },
  defaultBadge: { backgroundColor: colors.success + '20', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
  defaultText: { fontSize: typography.sizes.xs, color: colors.success, fontWeight: typography.weights.bold },
  addressText: { fontSize: typography.sizes.body, color: colors.text_dark, marginBottom: spacing.xs },
  phoneText: { fontSize: typography.sizes.small, color: colors.text_medium },
  editButton: { padding: spacing.xs },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyTitle: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.bold,
    color: colors.text_dark,
    marginTop: spacing.lg,
  },
  emptySubtitle: {
    fontSize: typography.sizes.body,
    color: colors.text_medium,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  listContent: { padding: spacing.horizontal, paddingBottom: 100 },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cityText: { fontSize: typography.sizes.small, color: colors.text_medium },
  actionButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  defaultButton: { flex: 1, padding: spacing.sm, backgroundColor: colors.gray_100, borderRadius: borderRadius.sm, alignItems: 'center' },
  defaultButtonText: { fontSize: typography.sizes.small, fontWeight: typography.weights.bold, color: colors.gray_700 },
  editButton: { flex: 1, padding: spacing.sm, backgroundColor: colors.primary, borderRadius: borderRadius.sm, alignItems: 'center' },
  editButtonText: { fontSize: typography.sizes.small, fontWeight: typography.weights.bold, color: colors.white },
  deleteButton: { flex: 1, padding: spacing.sm, backgroundColor: colors.danger + '20', borderRadius: borderRadius.sm, alignItems: 'center' },
  deleteButtonText: { fontSize: typography.sizes.small, fontWeight: typography.weights.bold, color: colors.danger },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.white, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.gray_200 },
  modalTitle: { fontSize: typography.sizes.h3, fontWeight: typography.weights.bold, color: colors.text_dark },
  modalBody: { padding: spacing.lg },
  formGroup: { marginBottom: spacing.lg },
  label: { fontSize: typography.sizes.small, fontWeight: typography.weights.bold, color: colors.gray_700, marginBottom: spacing.sm },
  typeButtons: { flexDirection: 'row', gap: spacing.sm },
  typeButton: { flex: 1, padding: spacing.md, backgroundColor: colors.gray_100, borderRadius: borderRadius.md, alignItems: 'center' },
  typeButtonActive: { backgroundColor: colors.primary },
  typeButtonText: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.gray_700 },
  typeButtonTextActive: { color: colors.white },
  input: { borderWidth: 1, borderColor: colors.gray_300, borderRadius: borderRadius.md, padding: spacing.md, fontSize: typography.sizes.body, color: colors.text_dark },
  textArea: { borderWidth: 1, borderColor: colors.gray_300, borderRadius: borderRadius.md, padding: spacing.md, fontSize: typography.sizes.body, color: colors.text_dark, minHeight: 80, textAlignVertical: 'top' },
  saveButton: { backgroundColor: colors.primary, padding: spacing.lg, margin: spacing.lg, borderRadius: borderRadius.md, alignItems: 'center' },
  saveButtonText: { color: colors.white, fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
});
