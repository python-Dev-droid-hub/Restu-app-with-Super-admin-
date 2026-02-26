import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
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

interface CookingScheduleScreenProps {
  onBack: () => void;
  onShift: boolean;
}

export default function CookingScheduleScreen({ onBack, onShift }: CookingScheduleScreenProps) {
  const insets = useSafeAreaInsets();
  const [schedule, setSchedule] = useState([
    { day: 'Monday', start: '9:00 AM', end: '5:00 PM', isOff: false, isToday: false },
    { day: 'Tuesday', start: '9:00 AM', end: '5:00 PM', isOff: false, isToday: false },
    { day: 'Wednesday', start: '', end: '', isOff: true, isToday: false },
    { day: 'Thursday', start: '9:00 AM', end: '5:00 PM', isOff: false, isToday: true },
    { day: 'Friday', start: '10:00 AM', end: '6:00 PM', isOff: false, isToday: false },
    { day: 'Saturday', start: '', end: '', isOff: true, isToday: false },
    { day: 'Sunday', start: '', end: '', isOff: true, isToday: false },
  ]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={DESIGN.colors.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cooking Schedule</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Today's Shift */}
      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Today's Shift</Text>
        <Text style={styles.infoValue}>9:00 AM - 5:00 PM</Text>
        <View style={[styles.statusBadge, { backgroundColor: onShift ? '#E8F5E9' : '#F5F5F5' }]}>
          <View style={[styles.statusDot, { backgroundColor: onShift ? DESIGN.colors.green : DESIGN.colors.muted }]} />
          <Text style={[styles.statusText, { color: onShift ? DESIGN.colors.green : DESIGN.colors.muted }]}>
            {onShift ? 'ACTIVE' : 'INACTIVE'}
          </Text>
        </View>
      </View>

      {/* Weekly Schedule */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weekly Schedule</Text>
        {schedule.map((s, idx) => (
          <View key={idx} style={[styles.scheduleRow, s.isToday && styles.scheduleRowToday]}>
            <Text style={styles.scheduleDay}>{s.day}</Text>
            {s.isOff ? (
              <Text style={styles.scheduleOff}>OFF</Text>
            ) : (
              <Text style={styles.scheduleTime}>{s.start} - {s.end}</Text>
            )}
            {s.isToday && <Text style={styles.todayBadge}>TODAY</Text>}
          </View>
        ))}
      </View>

      {/* Hours Summary */}
      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Hours Summary</Text>
        <Text style={styles.infoValue}>40 hours this week</Text>
        <Text style={styles.hint}>Average: 8 hours/day • Days off: 2</Text>
      </View>

      {/* Request Day Off */}
      <TouchableOpacity style={styles.actionBtn}>
        <Text style={styles.actionBtnText}>Request Day Off</Text>
      </TouchableOpacity>
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
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
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  scheduleRowToday: {
    backgroundColor: '#FFF3E0',
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  scheduleDay: {
    fontSize: 15,
    fontWeight: '600',
    color: DESIGN.colors.darkText,
    width: 100,
  },
  scheduleTime: {
    fontSize: 14,
    color: DESIGN.colors.muted,
    flex: 1,
  },
  scheduleOff: {
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
  hint: {
    fontSize: 12,
    color: DESIGN.colors.muted,
    marginTop: 4,
  },
  actionBtn: {
    backgroundColor: DESIGN.colors.blue,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
