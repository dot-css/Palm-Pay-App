import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Image
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts, Anton_400Regular } from '@expo-google-fonts/anton';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';

// Firebase imports
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

// Import Home component
import Home from './Home';

const { width, height } = Dimensions.get('window');

// Splash Screen Component
const SplashScreen = () => {
  return (
    <SafeAreaView style={styles.splashContainer}>
      <StatusBar style="light" backgroundColor="#1E319D" />
      <View style={styles.splashContent}>
        <Text style={styles.splashText}>
          Palm Pay
        </Text>
      </View>
    </SafeAreaView>
  );
};

// Home Screen Component (Dashboard)
const HomeScreen = ({ onNavigate }) => {
  return <Home onLogout={() => onNavigate('login')} />;
};

// Login Screen Component
const LoginScreen = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onNavigate('home'); // Navigate to home page
    } catch (error) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.authContainer}>
      <StatusBar style="dark" backgroundColor="#ffffff" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.authContent}>
            {/* Title */}
            <View>
              <Text style={styles.logoText}>Login</Text>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Your email address"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Your password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.buttonText}>Sign In</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => onNavigate('forgot')}
              >
                <Text style={styles.linkText}>Forgot Password?</Text>
              </TouchableOpacity>

              <View style={styles.signupPrompt}>
                <Text style={styles.promptText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => onNavigate('signup')}>
                  <Text style={styles.linkText}>Sign up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Signup Screen Component
const SignupScreen = ({ onNavigate }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    fatherName: '',
    cnic: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');

  const formatCNIC = (text) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');
    
    // Apply CNIC format: 12345-1234567-1
    if (cleaned.length <= 5) {
      return cleaned;
    } else if (cleaned.length <= 12) {
      return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
    } else {
      return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 12)}-${cleaned.slice(12, 13)}`;
    }
  };

  const checkPasswordStrength = (password) => {
    if (password.length < 6) {
      setPasswordStrength('Too short');
    } else if (password.length < 8) {
      setPasswordStrength('Weak');
    } else if (password.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)) {
      setPasswordStrength('Strong');
    } else {
      setPasswordStrength('Medium');
    }
  };

  const handleInputChange = (field, value) => {
    if (field === 'cnic') {
      value = formatCNIC(value);
    }
    if (field === 'password') {
      checkPasswordStrength(value);
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSignup = async () => {
    const { fullName, fatherName, cnic, email, password } = formData;
    
    if (!fullName || !fatherName || !cnic || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (cnic.length !== 15) {
      Alert.alert('Error', 'Please enter a valid CNIC');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Send email verification
      await sendEmailVerification(userCredential.user);
      
      // Store user data in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        fullName,
        fatherName,
        cnic,
        email,
        balance: 0,
        emailVerified: false,
        createdAt: serverTimestamp()
      });

      Alert.alert('Success', 'Account created! Please verify your email.');
      onNavigate('home'); // Navigate to home page
    } catch (error) {
      Alert.alert('Signup Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.authContainer}>
      <StatusBar style="dark" backgroundColor="#ffffff" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.authContent}>
            {/* Title */}
            <View>
              <Text style={styles.logoText}>Sign Up</Text>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Your full name"
                    placeholderTextColor="#999"
                    value={formData.fullName}
                    onChangeText={(text) => handleInputChange('fullName', text)}
                    autoCapitalize="words"
                  />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.inputLabel}>Father's Name</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Father's name"
                    placeholderTextColor="#999"
                    value={formData.fatherName}
                    onChangeText={(text) => handleInputChange('fatherName', text)}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CNIC</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 12345-1234567-1"
                  placeholderTextColor="#999"
                  value={formData.cnic}
                  onChangeText={(text) => handleInputChange('cnic', text)}
                  keyboardType="numeric"
                  maxLength={15}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Your email address"
                  placeholderTextColor="#999"
                  value={formData.email}
                  onChangeText={(text) => handleInputChange('email', text)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Choose a password"
                  placeholderTextColor="#999"
                  value={formData.password}
                  onChangeText={(text) => handleInputChange('password', text)}
                  secureTextEntry
                  autoCapitalize="none"
                />
                {passwordStrength && (
                  <Text style={[
                    styles.strengthText,
                    { color: passwordStrength === 'Strong' ? '#4CAF50' : 
                             passwordStrength === 'Medium' ? '#FF9800' : '#F44336' }
                  ]}>
                    Password strength: {passwordStrength}
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleSignup}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.buttonText}>Create Account</Text>
                )}
              </TouchableOpacity>

              <View style={styles.signupPrompt}>
                <Text style={styles.promptText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => onNavigate('login')}>
                  <Text style={styles.linkText}>Sign in</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Forgot Password Screen Component
const ForgotPasswordScreen = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        'Success', 
        'Password reset link sent to your email!',
        [{ text: 'OK', onPress: () => onNavigate('login') }]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.authContainer}>
      <StatusBar style="dark" backgroundColor="#ffffff" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.authContent}>
            {/* Title */}
            <View>
              <Text style={styles.logoText}>Forgot Password</Text>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Your registered email"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleResetPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.buttonText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>

              <View style={styles.signupPrompt}>
                <Text style={styles.promptText}>Remember your password? </Text>
                <TouchableOpacity onPress={() => onNavigate('login')}>
                  <Text style={styles.linkText}>Sign in</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => onNavigate('signup')}
              >
                <Text style={styles.linkText}>Create new account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('login');
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [fontsLoaded] = useFonts({
    Anton_400Regular,
  });

  // Monitor authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (initializing) setInitializing(false);
      
      // If user is logged in, go directly to home
      if (user) {
        setCurrentScreen('home');
      } else {
        setCurrentScreen('login');
      }
    });

    return unsubscribe; // unsubscribe on unmount
  }, [initializing]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000); // Show splash for 2 seconds

    return () => clearTimeout(timer);
  }, []);

  const handleNavigation = (screen) => {
    setCurrentScreen(screen);
  };

  // Show loading while checking auth state
  if (initializing || !fontsLoaded) {
    return (
      <SafeAreaProvider>
        <SplashScreen />
      </SafeAreaProvider>
    );
  }

  if (showSplash) {
    return (
      <SafeAreaProvider>
        <SplashScreen />
      </SafeAreaProvider>
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'login':
        return <LoginScreen onNavigate={handleNavigation} />;
      case 'signup':
        return <SignupScreen onNavigate={handleNavigation} />;
      case 'forgot':
        return <ForgotPasswordScreen onNavigate={handleNavigation} />;
      case 'home':
        return <HomeScreen onNavigate={handleNavigation} />;
      default:
        return <LoginScreen onNavigate={handleNavigation} />;
    }
  };

  return (
    <SafeAreaProvider>
      {renderScreen()}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  // Splash Screen Styles
  splashContainer: {
    flex: 1,
    backgroundColor: '#1E319D',
  },
  splashContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashLogo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  splashText: {
    fontSize: 48,
    fontFamily: 'Anton_400Regular',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 2,
  },
  
  // Auth Screens Common Styles
  authContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  authContent: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  
  // Logo and Title Styles
  logoText: {
    fontSize: 32,
    fontFamily: 'Anton_400Regular',
    color: '#1E319D',
    textAlign: 'center',
    marginBottom: 40,
    letterSpacing: 1,
  },
  
  // Form Styles
  formContainer: {
    marginTop: 20,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  formCol: {
    flex: 1,
    marginHorizontal: 5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333333',
    fontWeight: '400',
  },
  
  // Password Strength
  strengthText: {
    fontSize: 14,
    marginTop: 6,
    fontWeight: '500',
  },
  
  // Buttons
  primaryButton: {
    backgroundColor: '#1E319D',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#1E319D',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 8,
  },
  linkText: {
    color: '#1E319D',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Signup Prompt
  signupPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  promptText: {
    fontSize: 16,
    color: '#666666',
  },
});
