import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// App Styling Constants
const COLORS = {
  primary: '#FF6B35',
  success: '#2ECC71',
  info: '#3498DB',
  warning: '#F39C12',
  danger: '#E74C3C',
  darkText: '#2C3E50',
  lightBg: '#F5F5F5',
  white: '#FFFFFF',
  gray: '#95A5A6',
  lightGray: '#ECEFF1',
};

const FONTS = {
  pageTitle: { fontSize: 20, fontWeight: '700' as const },
  sectionTitle: { fontSize: 16, fontWeight: '700' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
  button: { fontSize: 14, fontWeight: '700' as const },
};

const SPACING = {
  horizontal: 16,
  verticalGap: 12,
};

interface ProofOfDeliveryScreenProps {
  order?: {
    id: string;
    orderNumber: string;
    customerName: string;
    deliveryAddress: string;
  };
  onBack?: () => void;
  onContinue?: () => void;
}

export default function ProofOfDeliveryScreen({
  order,
  onBack,
  onContinue,
}: ProofOfDeliveryScreenProps) {
  const insets = useSafeAreaInsets();
  const [deliveryPhoto, setDeliveryPhoto] = useState<string | null>(null);
  const [notes, setNotes] = useState('Left at door! Thank you!');
  const [signature, setSignature] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(true);

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.darkText} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Proof of Delivery</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Info */}
        <View style={styles.orderInfo}>
          <Text style={styles.orderNumber}>
            Order #{order?.orderNumber || '1024'}
          </Text>
          <Text style={styles.customerInfo}>
            📍 {order?.deliveryAddress || '221B Baker Street'}
          </Text>
        </View>

        {/* Delivery Photo */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Delivery Photo</Text>
          <TouchableOpacity style={styles.photoContainer}>
            {deliveryPhoto ? (
              <Image source={{ uri: deliveryPhoto }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera" size={48} color={COLORS.gray} />
                <Text style={styles.photoText}>Tap to add photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Signature Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Signature / Confirmation</Text>
          <TouchableOpacity style={styles.signatureContainer}>
            {signature ? (
              <Image source={{ uri: signature }} style={styles.signature} />
            ) : (
              <View style={styles.signaturePlaceholder}>
                <Ionicons name="create" size={32} color={COLORS.gray} />
                <Text style={styles.signatureText}>Tap to sign</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Notes */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Delivery Notes</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            placeholder="Add delivery notes..."
            placeholderTextColor={COLORS.gray}
          />
        </View>

        {/* Confirmation */}
        <View style={styles.confirmationContainer}>
          <Ionicons name="checkmark-circle" size={32} color={COLORS.success} />
          <Text style={styles.confirmationText}>
            ✓ Proof of Delivery Confirmed
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.continueButton]}
            onPress={onContinue}
          >
            <Text style={styles.continueButtonText}>Continue Delivery</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.backButtonLarge]}
            onPress={onBack}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBg,
  },
  header: {
    backgroundColor: COLORS.darkText,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.horizontal,
    paddingVertical: 12,
    height: 56,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONTS.pageTitle.fontSize,
    fontWeight: FONTS.pageTitle.fontWeight,
    color: COLORS.white,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  orderInfo: {
    padding: SPACING.horizontal,
    backgroundColor: COLORS.white,
    marginBottom: SPACING.verticalGap,
  },
  orderNumber: {
    fontSize: FONTS.sectionTitle.fontSize,
    fontWeight: '700',
    color: COLORS.darkText,
    marginBottom: 4,
  },
  customerInfo: {
    fontSize: FONTS.body.fontSize,
    color: COLORS.gray,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.horizontal,
    marginHorizontal: SPACING.horizontal,
    marginBottom: SPACING.verticalGap,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: FONTS.body.fontSize,
    fontWeight: '600',
    color: COLORS.darkText,
    marginBottom: 12,
  },
  photoContainer: {
    height: 200,
    backgroundColor: COLORS.lightBg,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoText: {
    fontSize: FONTS.body.fontSize,
    color: COLORS.gray,
    marginTop: 8,
  },
  signatureContainer: {
    height: 120,
    backgroundColor: COLORS.lightBg,
    borderRadius: 12,
    overflow: 'hidden',
  },
  signature: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  signaturePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signatureText: {
    fontSize: FONTS.body.fontSize,
    color: COLORS.gray,
    marginTop: 8,
  },
  notesInput: {
    backgroundColor: COLORS.lightBg,
    borderRadius: 12,
    padding: 12,
    fontSize: FONTS.body.fontSize,
    color: COLORS.darkText,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  confirmationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: SPACING.verticalGap,
  },
  confirmationText: {
    fontSize: FONTS.sectionTitle.fontSize,
    fontWeight: '700',
    color: COLORS.success,
    marginLeft: 8,
  },
  buttonContainer: {
    paddingHorizontal: SPACING.horizontal,
    gap: 8,
  },
  button: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButton: {
    backgroundColor: COLORS.primary,
  },
  continueButtonText: {
    fontSize: FONTS.button.fontSize,
    fontWeight: FONTS.button.fontWeight,
    color: COLORS.white,
  },
  backButtonLarge: {
    backgroundColor: COLORS.lightBg,
  },
  backButtonText: {
    fontSize: FONTS.button.fontSize,
    fontWeight: FONTS.button.fontWeight,
    color: COLORS.darkText,
  },
});
