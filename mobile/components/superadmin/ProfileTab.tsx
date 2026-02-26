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

export default function ProfileTab() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Content - Coming Soon */}
      <View style={styles.content}>
        <Ionicons name="person-outline" size={64} color={COLORS.lightText} />
        <Text style={styles.placeholderText}>Profile Coming Soon</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBackground,
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
