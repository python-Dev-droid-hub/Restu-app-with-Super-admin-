import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SPACING } from '../../constants/spacing';

export default function StaffTab() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Staff</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="notifications-outline" size={24} color={COLORS.darkText} />
        </TouchableOpacity>
      </View>

      {/* Content - Coming Soon */}
      <View style={styles.content}>
        <Ionicons name="people-outline" size={64} color={COLORS.lightText} />
        <Text style={styles.placeholderText}>Staff Management Coming Soon</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBackground,
  },
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.horizontal,
    paddingVertical: SPACING.card,
    borderBottomWidth: 1,
    borderBottomColor: '#ECEFF1',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONTS.sizes.heading,
    fontWeight: FONTS.weights.bold,
    color: COLORS.darkText,
  },
  iconBtn: {
    padding: SPACING.tiny,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.lightBackground,
  },
  placeholderText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.lightText,
    marginTop: SPACING.card,
    textAlign: 'center',
  },
});
