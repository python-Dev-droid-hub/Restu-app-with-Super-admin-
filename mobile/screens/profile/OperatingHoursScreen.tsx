import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DESIGN = {
  colors: {
    orange: '#FF7A59',
    green: '#2BC48A',
    blue: '#6C63FF',
    red: '#FF4D4D',
    darkText: '#1A1A2E',
    lightBg: '#F8F9FA',
    white: '#FFFFFF',
    muted: '#8E8E93',
    border: '#E5E5EA',
  },
  spacing: { pagePad: 16 },
};

interface OperatingHoursScreenProps {
  onBack: () => void;
}

export default function OperatingHoursScreen({ onBack }: OperatingHoursScreenProps) {
  const insets = useSafeAreaInsets();
  
  const hours = [
    { day: 'Monday', open: '9:00 AM', close: '10:00 PM', isToday: false },
    { day: 'Tuesday', open: '9:00 AM', close: '10:00 PM', isToday: false },
    { day: 'Wednesday', open: '9:00 AM', close: '10:00 PM', isToday: false },
    { day: 'Thursday', open: '9:00 AM', close: '10:00 PM', isToday: true },
    { day: 'Friday', open: '9:00 AM', close: '12:00 AM', isToday: false },
    { day: 'Saturday', open: '10:00 AM', close: '12:00 AM', isToday: false },
    { day: 'Sunday', open: 'CLOSED', close: '', isToday: false, closed: true },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={DESIGN.colors.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Operating Hours</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Kitchen Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Kitchen</Text>
        <Text style={styles.infoValue}>Main Branch - Gulberg</Text>
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>OPEN NOW</Text>
        </View>
      </View>

      {/* Weekly Hours */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>This Week's Hours</Text>
        {hours.map((h, idx) => (
          <View key={idx} style={[styles.hourRow, h.isToday && styles.hourRowToday]}>
            <Text style={styles.hourDay}>{h.day}</Text>
            {h.closed ? (
              <Text style={styles.hourClosed}>CLOSED</Text>
            ) : (
              <Text style={styles.hourTime}>{h.open} - {h.close}</Text>
            )}
            {h.isToday && <Text style={styles.todayBadge}>TODAY</Text>}
          </View>
        ))}
      </View>

      {/* Current Status */}
      <View style={styles.infoCard}>
        <Text style={styles.statusDetail}>Currently open</Text>
        <Text style={styles.statusDetail}>Closes at: 10:00 PM</Text>
        <Text style={styles.statusDetail}>Time remaining: 4 hours 30 mins</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DESIGN.colors.lightBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: DESIGN.colors.white,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
  },
  infoCard: {
    backgroundColor: DESIGN.colors.white,
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: DESIGN.colors.muted,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DESIGN.colors.green,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN.colors.green,
  },
  section: {
    backgroundColor: DESIGN.colors.white,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
    marginBottom: 16,
  },
  hourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  hourRowToday: {
    backgroundColor: '#FFF3E0',
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  hourDay: {
    fontSize: 15,
    fontWeight: '600',
    color: DESIGN.colors.darkText,
    width: 100,
  },
  hourTime: {
    fontSize: 14,
    color: DESIGN.colors.muted,
    flex: 1,
  },
  hourClosed: {
    fontSize: 14,
    color: DESIGN.colors.red,
    fontWeight: '600',
  },
  todayBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN.colors.orange,
    backgroundColor: '#FFE0B2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusDetail: {
    fontSize: 14,
    color: DESIGN.colors.darkText,
    marginBottom: 4,
  },
});
