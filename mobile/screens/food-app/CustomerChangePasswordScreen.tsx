import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../components/api/client';
import { colors, typography, spacing, borderRadius } from '../../theme';

export default function CustomerChangePasswordScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [userData, setUserData] = useState<any>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const raw = await AsyncStorage.getItem('userData');
      if (raw) setUserData(JSON.parse(raw));
    };
    loadUser();
  }, []);

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
    if (!canSubmit) return;
    try {
      setLoading(true);
      const response = await api.put('/users/change-password', {
        currentPassword,
        newPassword,
      });
      if (response.success) {
        Alert.alert('Success', 'Password changed successfully!');
        navigation.goBack();
      } else {
        Alert.alert('Error', response.message || 'Failed to change password');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text_dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 120 }}
        >
          <View style={styles.field}>
            <Text style={styles.label}>Current Password</Text>
            <View style={styles.passwordInput}>
              <TextInput
                style={styles.passwordField}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrent}
                placeholder="Enter current password"
                placeholderTextColor={colors.gray_400}
              />
              <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
                <Ionicons name={showCurrent ? 'eye-off' : 'eye'} size={20} color={colors.gray_500} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.passwordInput}>
              <TextInput
                style={styles.passwordField}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNew}
                placeholder="Enter new password"
                placeholderTextColor={colors.gray_400}
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                <Ionicons name={showNew ? 'eye-off' : 'eye'} size={20} color={colors.gray_500} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.requirementsBox}>
            {requirements.map((req, idx) => (
              <View key={idx} style={styles.requirementRow}>
                <Ionicons 
                  name={req.met ? 'checkmark-circle' : 'ellipse-outline'} 
                  size={16} 
                  color={req.met ? colors.success : colors.gray_400} 
                />
                <Text style={[styles.requirementText, req.met && styles.requirementMet]}>
                  {req.label}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.passwordInput}>
              <TextInput
                style={styles.passwordField}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirm}
                placeholder="Confirm new password"
                placeholderTextColor={colors.gray_400}
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                <Ionicons name={showConfirm ? 'eye-off' : 'eye'} size={20} color={colors.gray_500} />
              </TouchableOpacity>
            </View>
            {confirmPassword.length > 0 && (
              <Text style={[styles.matchText, passwordsMatch ? styles.matchSuccess : styles.matchError]}>
                {passwordsMatch ? 'Passwords match ✓' : 'Passwords do not match ✗'}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, (!canSubmit || loading) && styles.saveBtnDisabled]}
            disabled={!canSubmit || loading}
            onPress={handleChangePassword}
          >
            <Text style={styles.saveBtnText}>{loading ? 'Changing...' : 'Change Password'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
  },
  headerTitle: { fontSize: typography.sizes.h3, fontWeight: typography.weights.bold, color: colors.text_dark },
  field: { marginBottom: spacing.lg },
  label: { fontSize: typography.sizes.small, fontWeight: typography.weights.bold, color: colors.text_medium, marginBottom: spacing.sm },
  passwordInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray_300,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
  },
  passwordField: { flex: 1, paddingVertical: spacing.md, fontSize: typography.sizes.body, color: colors.text_dark },
  requirementsBox: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  requirementRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  requirementText: { fontSize: typography.sizes.small, color: colors.gray_500, marginLeft: spacing.sm },
  requirementMet: { color: colors.success },
  matchText: { fontSize: typography.sizes.small, marginTop: spacing.xs },
  matchSuccess: { color: colors.success },
  matchError: { color: colors.danger },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: colors.white, fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
});
