import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PaymentMethod {
  id: string;
  type: 'card' | 'upi' | 'wallet';
  label: string;
  details: string;
  isDefault: boolean;
}

export default function PaymentMethodsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: '1',
      type: 'card',
      label: '**** **** **** 1234',
      details: 'Visa ending in 1234',
      isDefault: true,
    },
    {
      id: '2',
      type: 'upi',
      label: 'user@paytm',
      details: 'Paytm UPI',
      isDefault: false,
    },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ type: 'card' as 'card' | 'upi' | 'wallet', number: '', holder: '', expiry: '', cvv: '' });

  const handleAdd = () => {
    if (!form.number || !form.holder) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    
    const lastFour = form.number.slice(-4);
    const label = form.type === 'card' ? `**** **** **** ${lastFour}` : form.number;
    const details = form.type === 'card' ? `${form.holder} - Expires ${form.expiry}` : form.holder;
    
    setPaymentMethods([...paymentMethods, { 
      id: Date.now().toString(), 
      type: form.type, 
      label, 
      details, 
      isDefault: paymentMethods.length === 0 
    }]);
    
    setForm({ type: 'card', number: '', holder: '', expiry: '', cvv: '' });
    setShowModal(false);
    Alert.alert('Success', 'Payment method added');
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete?', 'Remove this payment method?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setPaymentMethods(paymentMethods.filter(c => c.id !== id)) }
    ]);
  };

  const handleDefault = (id: string) => {
    setPaymentMethods(paymentMethods.map(c => ({ ...c, isDefault: c.id === id })));
  };

  const getIcon = (type: string) => {
    return type === 'card' ? 'card' : type === 'upi' ? 'phone-portrait' : 'wallet';
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text_dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <TouchableOpacity onPress={() => { setForm({ type: 'card', number: '', holder: '', expiry: '', cvv: '' }); setShowModal(true); }}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Payment Methods List */}
      <FlatList
        data={paymentMethods}
        renderItem={({ item }) => (
          <View style={[styles.paymentCard, { borderLeftColor: item.isDefault ? colors.primary : colors.gray_300, borderLeftWidth: 4 }]}>
            <View style={styles.paymentIcon}>
              <Ionicons name={getIcon(item.type) as any} size={24} color={colors.primary} />
            </View>
            <View style={styles.paymentInfo}>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>{item.label}</Text>
                {item.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultText}>Default</Text>
                  </View>
                )}
              </View>
              <Text style={styles.paymentDetails}>{item.details}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {!item.isDefault && (
                <TouchableOpacity onPress={() => handleDefault(item.id)} style={{ padding: spacing.xs }}>
                  <Ionicons name="star-outline" size={18} color={colors.gray_500} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ padding: spacing.xs }}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.paymentList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="card-outline" size={80} color={colors.gray_300} />
            <Text style={styles.emptyTitle}>No payment methods</Text>
            <Text style={styles.emptySubtitle}>Add a card or UPI ID</Text>
          </View>
        }
      />

      {/* Add Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={colors.text_dark} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add Payment Method</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Type</Text>
                <View style={styles.typeButtons}>
                  {['card', 'upi', 'wallet'].map(t => (
                    <TouchableOpacity 
                      key={t} 
                      onPress={() => setForm({ ...form, type: t as any })} 
                      style={[styles.typeButton, form.type === t && styles.typeButtonActive]}
                    >
                      <Text style={[styles.typeButtonText, form.type === t && styles.typeButtonTextActive]}>{t.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{form.type === 'card' ? 'Card Number' : 'UPI ID / Wallet'}</Text>
                <TextInput 
                  value={form.number} 
                  onChangeText={v => setForm({ ...form, number: v })} 
                  placeholder={form.type === 'card' ? '1234 5678 9012 3456' : 'user@upi'} 
                  keyboardType={form.type === 'card' ? 'numeric' : 'default'}
                  style={styles.input} 
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Holder Name</Text>
                <TextInput 
                  value={form.holder} 
                  onChangeText={v => setForm({ ...form, holder: v })} 
                  placeholder="e.g., Ahmad Khan" 
                  style={styles.input} 
                />
              </View>

              {form.type === 'card' && (
                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Expiry</Text>
                    <TextInput 
                      value={form.expiry} 
                      onChangeText={v => setForm({ ...form, expiry: v })} 
                      placeholder="MM/YY" 
                      maxLength={5}
                      style={styles.input} 
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.label}>CVV</Text>
                    <TextInput 
                      value={form.cvv} 
                      onChangeText={v => setForm({ ...form, cvv: v })} 
                      placeholder="123" 
                      maxLength={4}
                      secureTextEntry
                      keyboardType="numeric"
                      style={styles.input} 
                    />
                  </View>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity onPress={handleAdd} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>ADD PAYMENT METHOD</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
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
  paymentList: { padding: spacing.horizontal },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.light,
  },
  paymentIcon: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  paymentInfo: { flex: 1 },
  paymentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  paymentLabel: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text_dark },
  defaultBadge: { backgroundColor: colors.success + '20', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
  defaultText: { fontSize: typography.sizes.xs, color: colors.success, fontWeight: typography.weights.bold },
  paymentDetails: { fontSize: typography.sizes.small, color: colors.text_medium },
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
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  addButtonText: {
    color: colors.white,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
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
  saveButton: { backgroundColor: colors.primary, padding: spacing.lg, margin: spacing.lg, borderRadius: borderRadius.md, alignItems: 'center' },
  saveButtonText: { color: colors.white, fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
});
