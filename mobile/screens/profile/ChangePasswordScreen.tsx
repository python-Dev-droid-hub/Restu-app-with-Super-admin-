import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
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

interface ChangePasswordScreenProps {
  onBack: () => void;
  userData: any;
  api: any;
}

export default function ChangePasswordScreen({ onBack, userData, api }: ChangePasswordScreenProps) {
  const insets = useSafeAreaInsets();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const requirements = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'Contains uppercase (A-Z)', met: /[A-Z]/.test(newPassword) },
    { label: 'Contains lowercase (a-z)', met: /[a-z]/.test(newPassword) },
    { label: 'Contains number (0-9)', met: /[0-9]/.test(newPassword) },
    { label: 'Contains special character', met: /[!@#$%^&*]/.test(newPassword) },
  ];

  const allMet = requirements.every(r => r.met);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const canSubmit = allMet && passwordsMatch && currentPassword.length > 0;

  const handleChangePassword = async () => {
    try {
      const response = await api.patch(`/users/${userData?.id}/change-password`, {
        current_password: currentPassword,
        new_password: newPassword,
      });
      if (response.success) {
        Alert.alert('Success', 'Password changed successfully!');
        onBack();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to change password');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={DESIGN.colors.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Current Password */}
      <View style={styles.field}>
        <Text style={styles.label}>Current Password</Text>
        <View style={styles.passwordInput}>
          <TextInput
            style={styles.passwordField}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry={!showCurrent}
            placeholder="Enter current password"
          />
          <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
            <Ionicons name={showCurrent ? 'eye-off' : 'eye'} size={20} color={DESIGN.colors.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* New Password */}
      <View style={styles.field}>
        <Text style={styles.label}>New Password</Text>
        <View style={styles.passwordInput}>
          <TextInput
            style={styles.passwordField}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showNew}
            placeholder="Enter new password"
          />
          <TouchableOpacity onPress={() => setShowNew(!showNew)}>
            <Ionicons name={showNew ? 'eye-off' : 'eye'} size={20} color={DESIGN.colors.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Requirements */}
      <View style={styles.requirementsBox}>
        {requirements.map((req, idx) => (
          <View key={idx} style={styles.requirementRow}>
            <Ionicons name={req.met ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={req.met ? DESIGN.colors.green : DESIGN.colors.muted} />
            <Text style={[styles.requirementText, req.met && styles.requirementMet]}>{req.label}</Text>
          </View>
        ))}
      </View>

      {/* Confirm Password */}
      <View style={styles.field}>
        <Text style={styles.label}>Confirm Password</Text>
        <View style={styles.passwordInput}>
          <TextInput
            style={styles.passwordField}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirm}
            placeholder="Confirm new password"
          />
          <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
            <Ionicons name={showConfirm ? 'eye-off' : 'eye'} size={20} color={DESIGN.colors.muted} />
          </TouchableOpacity>
        </View>
        {confirmPassword.length > 0 && (
          <Text style={[styles.matchText, passwordsMatch ? styles.matchSuccess : styles.matchError]}>
            {passwordsMatch ? 'Passwords match ✓' : 'Passwords do not match ✗'}
          </Text>
        )}
      </View>

      {/* Change Button */}
      <TouchableOpacity 
        style={[styles.saveBtn, !canSubmit && styles.saveBtnDisabled]} 
        disabled={!canSubmit}
        onPress={handleChangePassword}
      >
        <Text style={styles.saveBtnText}>Change Password</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DESIGN.colors.lightBg,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: DESIGN.colors.darkText,
    marginBottom: 8,
  },
  passwordInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DESIGN.colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: DESIGN.colors.border,
  },
  passwordField: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: DESIGN.colors.darkText,
  },
  requirementsBox: {
    backgroundColor: DESIGN.colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 13,
    color: DESIGN.colors.muted,
    marginLeft: 8,
  },
  requirementMet: {
    color: DESIGN.colors.green,
  },
  matchText: {
    fontSize: 13,
    marginTop: 8,
  },
  matchSuccess: {
    color: DESIGN.colors.green,
  },
  matchError: {
    color: DESIGN.colors.red,
  },
  saveBtn: {
    backgroundColor: DESIGN.colors.blue,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  saveBtnDisabled: {
    backgroundColor: '#CCCCCC',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
