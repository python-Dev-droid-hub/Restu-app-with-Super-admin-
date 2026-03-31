import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../components/api/client';
import { Ionicons } from '@expo/vector-icons';
import { initializeSocket } from '../../services/realtimeService';
import Toast from 'react-native-toast-message';

const { width, height } = Dimensions.get('window');
const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;
const HEADER_MARGIN = Platform.OS === 'ios' ? 50 : 20;

export default function LoginScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/login', {
        email: email.trim(),
        password,
      });

      if (response.success && response.data) {
        await AsyncStorage.setItem('authToken', response.data.tokens.accessToken);
        await AsyncStorage.setItem('userRole', response.data.user.role);
        await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));

        // Initialize WebSocket for real-time notifications
        const userId = response.data.user._id || response.data.user.id;
        const userRole = response.data.user.role;
        
        if (userId && userRole) {
          console.log('[LoginScreen] Initializing WebSocket for user:', userId, 'role:', userRole);
          initializeSocket(userId.toString(), userRole);
          
          Toast.show({
            type: 'success',
            text1: 'Welcome back!',
            text2: 'Real-time notifications enabled',
            duration: 2000,
          });
        }

        // Navigate to appropriate dashboard based on user role
        const role = response.data.user.role;
        let dashboardName = 'CustomerDashboard';

        switch (role) {
          case 'SUPER_ADMIN':
            dashboardName = 'SuperAdminDashboard';
            break;
          case 'ADMIN':
            dashboardName = 'AdminDashboard';
            break;
          case 'BRANCH_MANAGER':
            dashboardName = 'ManagerTabs';
            break;
          case 'CHEF':
            dashboardName = 'ChefDashboard';
            break;
          case 'WAITER':
            dashboardName = 'WaiterDashboard';
            break;
          case 'RIDER':
            dashboardName = 'RiderDashboard';
            break;
          case 'CUSTOMER':
          default:
            dashboardName = 'CustomerDashboard';
            break;
        }

        // @ts-ignore
        navigation.navigate(dashboardName);
      } else {
        Alert.alert('Login Failed', response.message || 'Invalid credentials');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message ||
                          error.message ||
                          'Network error. Please try again.';
      Alert.alert('Login Error', `Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: STATUSBAR_HEIGHT }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.content, { paddingTop: HEADER_MARGIN }]}>
        {/* Food Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=400&fit=crop' }}
            style={styles.foodImage}
            resizeMode="cover"
          />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>Please login to your account</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Email Field */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password Field */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#999"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#999"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>

          {/* Forgot Password */}
          <TouchableOpacity 
            style={styles.forgotPasswordContainer}
            onPress={() => { // @ts-ignore
              navigation.navigate('ForgotPassword');
            }}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        {/* Footer - Sign Up */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => { // @ts-ignore
            navigation.navigate('SignUp');
          }}>
            <Text style={styles.signUpText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  imageContainer: {
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  foodImage: {
    width: '100%',
    height: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 16,
  },
  loginButton: {
    backgroundColor: '#e87e35',
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    shadowColor: '#e87e35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  loginButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#e87e35',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
  signUpText: {
    fontSize: 14,
    color: '#e87e35',
    fontWeight: 'bold',
  },
});
