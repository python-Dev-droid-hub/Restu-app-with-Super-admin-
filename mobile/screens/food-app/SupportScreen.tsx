import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

interface FAQ {
  id: string;
  q: string;
  a: string;
}

const FAQS: FAQ[] = [
  { id: '1', q: 'How to track my order?', a: 'Go to My Orders and tap any order to see live tracking and delivery status.' },
  { id: '2', q: 'How do I cancel an order?', a: 'You can cancel within 5 minutes of placing your order from the Order History screen.' },
  { id: '3', q: 'Can I change my delivery address?', a: 'Yes, you can change the address before the rider picks up your order.' },
  { id: '4', q: 'What payment methods are accepted?', a: 'We accept Credit/Debit cards, UPI, Mobile Wallets, and Cash on Delivery.' },
  { id: '5', q: 'How do I report an issue with my order?', a: 'Go to the specific order and tap "Report Issue" to contact support.' },
];

const SUPPORT_ITEMS = [
  {
    id: '1',
    title: 'Contact Support',
    subtitle: 'Get help with your orders',
    icon: 'headset-outline',
    action: 'call',
  },
  {
    id: '2',
    title: 'FAQ',
    subtitle: 'Find answers to common questions',
    icon: 'help-circle-outline',
    action: 'faq',
  },
  {
    id: '3',
    title: 'Report Issue',
    subtitle: 'Report a problem with the app',
    icon: 'bug-outline',
    action: 'report',
  },
  {
    id: '4',
    title: 'Rate App',
    subtitle: 'Leave a review on the app store',
    icon: 'star-outline',
    action: 'rate',
  },
];

export default function SupportScreen() {
  const navigation = useNavigation();
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');

  const handleSendMessage = () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Error', 'Please fill in both subject and message');
      return;
    }
    Alert.alert('Message Sent', 'We will respond to you within 24 hours.');
    setSubject('');
    setMessage('');
    setShowMessageModal(false);
  };

  const contacts = [
    { id: 1, title: 'Call Us', subtitle: '+92-300-1234567', icon: 'call', action: () => Linking.openURL('tel:+923001234567') },
    { id: 2, title: 'Email Support', subtitle: 'support@restaurant.com', icon: 'mail', action: () => Linking.openURL('mailto:support@restaurant.com') },
    { id: 3, title: 'Live Chat', subtitle: 'Available 9 AM - 9 PM', icon: 'chatbubbles', action: () => Alert.alert('Coming Soon', 'Live chat will be available soon!') },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text_dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Contact Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Get in Touch</Text>
          {contacts.map(c => (
            <TouchableOpacity key={c.id} onPress={c.action} style={styles.contactCard}>
              <View style={styles.contactIcon}>
                <Ionicons name={c.icon as any} size={24} color={colors.primary} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>{c.title}</Text>
                <Text style={styles.contactValue}>{c.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.gray_500} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Send Message Button */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.messageButton} onPress={() => setShowMessageModal(true)}>
            <Ionicons name="create" size={20} color={colors.white} />
            <Text style={styles.messageButtonText}>SEND US A MESSAGE</Text>
          </TouchableOpacity>
        </View>

        {/* FAQs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {FAQS.map(faq => (
            <View key={faq.id} style={styles.faqItem}>
              <TouchableOpacity 
                onPress={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)} 
                style={styles.faqQuestion}
              >
                <Text style={styles.faqQuestionText}>{faq.q}</Text>
                <Ionicons 
                  name={expandedFAQ === faq.id ? 'chevron-up' : 'chevron-down'} 
                  size={20} 
                  color={colors.primary} 
                />
              </TouchableOpacity>
              {expandedFAQ === faq.id && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.faqAnswerText}>{faq.a}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Business Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Hours</Text>
          <View style={styles.hoursCard}>
            <Text style={styles.hoursText}>Monday - Friday: 9:00 AM - 10:00 PM</Text>
            <Text style={styles.hoursText}>Saturday - Sunday: 10:00 AM - 11:00 PM</Text>
            <Text style={styles.hoursNote}>Support available 24/7 for urgent issues</Text>
          </View>
        </View>
      </ScrollView>

      {/* Message Modal */}
      <Modal visible={showMessageModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowMessageModal(false)}>
                <Ionicons name="close" size={24} color={colors.text_dark} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Send Message</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Subject</Text>
                <TextInput 
                  value={subject} 
                  onChangeText={setSubject} 
                  placeholder="Enter subject" 
                  style={styles.input} 
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Message</Text>
                <TextInput 
                  value={message} 
                  onChangeText={setMessage} 
                  placeholder="Describe your issue or question..." 
                  multiline 
                  numberOfLines={6}
                  style={[styles.input, { minHeight: 120 }]} 
                />
              </View>
            </ScrollView>

            <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
              <Text style={styles.sendButtonText}>SEND MESSAGE</Text>
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
  section: {
    backgroundColor: colors.white,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.h4,
    fontWeight: typography.weights.bold,
    color: colors.text_dark,
    marginBottom: spacing.md,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray_50,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  contactInfo: { flex: 1, marginLeft: spacing.md },
  contactLabel: { fontSize: typography.sizes.body, fontWeight: typography.weights.medium, color: colors.text_dark },
  contactValue: { fontSize: typography.sizes.small, color: colors.text_medium, marginTop: 2 },
  callButton: {
    backgroundColor: colors.primary,
    padding: spacing.sm,
    borderRadius: borderRadius.round,
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray_100,
  },
  supportIcon: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  supportInfo: { flex: 1 },
  supportTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.medium, color: colors.text_dark },
  supportSubtitle: { fontSize: typography.sizes.small, color: colors.text_medium, marginTop: 2 },
  hoursCard: {
    backgroundColor: colors.gray_50,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  hoursText: {
    fontSize: typography.sizes.body,
    color: colors.text_dark,
    marginBottom: spacing.xs,
  },
  hoursNote: {
    fontSize: typography.sizes.small,
    color: colors.text_medium,
    fontStyle: 'italic',
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  messageButtonText: {
    color: colors.white,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray_200,
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  faqQuestionText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
    color: colors.text_dark,
    flex: 1,
  },
  faqAnswer: {
    paddingBottom: spacing.md,
    paddingRight: spacing.lg,
  },
  faqAnswerText: {
    fontSize: typography.sizes.small,
    color: colors.text_medium,
    lineHeight: 20,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.white, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.gray_200 },
  modalTitle: { fontSize: typography.sizes.h3, fontWeight: typography.weights.bold, color: colors.text_dark },
  modalBody: { padding: spacing.lg },
  formGroup: { marginBottom: spacing.lg },
  label: { fontSize: typography.sizes.small, fontWeight: typography.weights.bold, color: colors.gray_700, marginBottom: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.gray_300, borderRadius: borderRadius.md, padding: spacing.md, fontSize: typography.sizes.body, color: colors.text_dark },
  sendButton: { backgroundColor: colors.primary, padding: spacing.lg, margin: spacing.lg, borderRadius: borderRadius.md, alignItems: 'center' },
  sendButtonText: { color: colors.white, fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
});
