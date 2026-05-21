import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBranch } from '../../context/BranchContext';

export default function GlobalBranchBar() {
  const { selectedBranchName, canSelectBranch } = useBranch();

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Ionicons name="business-outline" size={18} color="#E87E35" />
        <Text style={styles.label}>{selectedBranchName}</Text>
        {canSelectBranch && (
          <Text style={styles.hint}>Change on Dashboard</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    backgroundColor: '#FFF3E0',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: '#E87E35',
    fontWeight: '600',
  },
  hint: {
    fontSize: 11,
    color: '#999',
    marginLeft: 'auto',
  },
});
