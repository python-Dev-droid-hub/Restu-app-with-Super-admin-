import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');
const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;
const HEADER_MARGIN = Platform.OS === 'ios' ? 50 : 20;

export default function WelcomeScreen() {
  const navigation = useNavigation();

  const handleStartOrdering = () => {
    // @ts-ignore
    navigation.navigate('SignUp');
  };

  const handleLogin = () => {
    // @ts-ignore
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: STATUSBAR_HEIGHT }]}>
      <StatusBar barStyle="light-content" backgroundColor="#E87E35" />

      <View style={[styles.content, { paddingTop: HEADER_MARGIN }]}>
        {/* Food Image Container */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=400&fit=crop' }}
            style={styles.foodImage}
            resizeMode="cover"
          />
        </View>

        {/* Title */}
        <Text style={styles.title}>Culinary Journey</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Explore exquisite flavors from{'\n'}around world.
        </Text>

        {/* Spacer to push button down */}
        <View style={styles.spacer} />

        {/* Start Ordering Button */}
        <TouchableOpacity style={styles.button} onPress={handleStartOrdering}>
          <Text style={styles.buttonText}>Start Ordering</Text>
        </TouchableOpacity>

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Have an Account? </Text>
          <TouchableOpacity onPress={handleLogin}>
            <Text style={styles.loginLink}>LOGIN</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: height * 0.08,
    paddingBottom: 40,
  },
  imageContainer: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    overflow: 'hidden',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  foodImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  spacer: {
    flex: 1,
  },
  button: {
    backgroundColor: '#e87e35',
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#e87e35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: '#666',
  },
  loginLink: {
    fontSize: 14,
    color: '#e87e35',
    fontWeight: 'bold',
  },
});
