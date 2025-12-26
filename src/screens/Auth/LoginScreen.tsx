import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  useColorScheme,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { sendOTP, login } from '@/src/api/auth';
import { validateOTP, validateMPIN, validateContact } from '@/src/utils/validators';
import { useToast } from 'react-native-toast-notifications';
import { useAuth } from '@/src/context/AuthContext';
import { getErrorMessage } from '@/src/utils/getErrorMessage';

export default function LoginScreen() {
  const Toast = useToast();
  const router = useRouter();
  const { login: authLogin } = useAuth();

  // Theme handling for non-Tailwind props
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const placeholderColor = isDark ? '#94a3b8' : '#64748b'; // text.secondary

  const [loading, setLoading] = useState(false);
  const [contact, setContact] = useState('');
  const [loginMethod, setLoginMethod] = useState<'otp' | 'mpin'>('otp');

  // OTP States
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(0); // Added for Resend Logic

  // MPIN State
  const [mpin, setMpin] = useState('');

  // --- Timer Effect for Resend OTP ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleSendOTP = async () => {
    if (!validateContact(contact)) {
      return Toast.show('Please enter a valid 10-digit contact number.', {
        type: 'warning',
        placement: 'top',
      });
    }

    try {
      setLoading(true);
      await sendOTP({ contact: `+91${contact}` }); // Ensure country code is consistent
      setOtpSent(true);
      setTimer(30); // Start 30s cooldown
      Toast.show('OTP sent successfully!', { type: 'success', placement: 'top' });
    } catch (error: any) {
      Toast.show(getErrorMessage(error), { type: 'error', placement: 'top' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!validateContact(contact))
      return Toast.show('Please enter a valid contact.', { type: 'warning', placement: 'top' });
    if (loginMethod === 'otp' && !validateOTP(otp))
      return Toast.show('Invalid OTP.', { type: 'warning', placement: 'top' });
    if (loginMethod === 'mpin' && !validateMPIN(mpin))
      return Toast.show('Invalid MPIN.', { type: 'warning', placement: 'top' });

    try {
      setLoading(true);
      const response = await login({
        contact: `+91${contact}`,
        ...(loginMethod === 'otp' ? { otp } : { mpin }),
      });

      const accessToken = response?.tokens?.accessToken;
      const refreshToken = response?.tokens?.refreshToken;
      const user = response?.user;

      if (accessToken && refreshToken && user) {
        const formattedUser = { ...user, address: user.address || null };

        // Pass actual values
        await authLogin(accessToken, refreshToken, formattedUser);

        Toast.show('Logged in successfully!', { type: 'success', placement: 'top' });
        router.replace('/(tabs)');
      } else {
        // 🚨 helpful error if backend is missing data
        console.error('Login Missing Data:', { accessToken, hasRefresh: !!refreshToken, user });
        Toast.show('Login failed: Missing session tokens.', { type: 'error', placement: 'top' });
      }
    } catch (error: any) {
      Toast.show(getErrorMessage(error), { type: 'error', placement: 'top' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="bg-background-light dark:bg-background-dark">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40, justifyContent: 'center' }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View className="w-full px-6">
            {/* --- HEADER --- */}
            <View className="mb-10 mt-10 items-center">
              <View className="mb-5 h-24 w-24 items-center justify-center rounded-full bg-surface-light dark:bg-surface-dark">
                <Image
                  source={require('@/assets/images/icon1.png')}
                  className="h-full w-full p-4"
                  resizeMode="contain"
                />
              </View>
              <Text className="mb-2 text-3xl font-bold text-text-primary-light dark:text-text-primary-dark">
                Welcome Back
              </Text>
              <Text className="text-base text-text-secondary-light dark:text-text-secondary-dark">
                Login to JantaWave
              </Text>
            </View>

            {/* --- FORM --- */}
            <View className="w-full">
              {/* Contact Input */}
              <View className="mb-5">
                <Text className="mb-2 text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
                  Contact Number
                </Text>
                <TextInput
                  className="rounded-xl border border-border-light bg-surface-light px-4 py-3.5 text-base text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
                  value={contact}
                  onChangeText={setContact}
                  placeholder="Enter 10-digit contact"
                  placeholderTextColor={placeholderColor}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>

              {/* Method Toggle */}
              <View className="mb-6 flex-row gap-2 rounded-xl bg-surfaceHighlight-light p-1 dark:bg-surfaceHighlight-dark">
                <TouchableOpacity
                  className={`flex-1 rounded-lg py-3 ${
                    loginMethod === 'otp' ? 'bg-primary ' : 'bg-transparent'
                  }`}
                  onPress={() => {
                    setLoginMethod('otp');
                    setMpin('');
                  }}>
                  <Text
                    className={`text-center text-sm font-medium ${
                      loginMethod === 'otp'
                        ? 'text-white'
                        : 'text-text-secondary-light dark:text-text-secondary-dark'
                    }`}>
                    OTP
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className={`flex-1 rounded-lg py-3 ${
                    loginMethod === 'mpin' ? 'bg-primary ' : 'bg-transparent'
                  }`}
                  onPress={() => {
                    setLoginMethod('mpin');
                    setOtp('');
                    setOtpSent(false);
                  }}>
                  <Text
                    className={`text-center text-sm font-medium ${
                      loginMethod === 'mpin'
                        ? 'text-white'
                        : 'text-text-secondary-light dark:text-text-secondary-dark'
                    }`}>
                    MPIN
                  </Text>
                </TouchableOpacity>
              </View>

              {/* OTP Flow */}
              {loginMethod === 'otp' ? (
                <>
                  <TouchableOpacity
                    className={`mb-5 items-center rounded-xl py-4 ${
                      timer > 0
                        ? 'border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark'
                        : 'bg-primary'
                    }`}
                    onPress={handleSendOTP}
                    disabled={loading || timer > 0}>
                    {loading && !otpSent ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text
                        className={`text-base font-semibold ${
                          timer > 0
                            ? 'text-text-secondary-light dark:text-text-secondary-dark'
                            : 'text-white'
                        }`}>
                        {otpSent
                          ? timer > 0
                            ? `Resend OTP (${timer}s)`
                            : 'Resend OTP'
                          : 'Send OTP'}
                      </Text>
                    )}
                  </TouchableOpacity>

                  {otpSent && (
                    <View className="mb-5">
                      <Text className="mb-2 text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
                        Enter OTP
                      </Text>
                      <TextInput
                        className="rounded-xl border border-border-light bg-surface-light px-4 py-3.5 text-base text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
                        value={otp}
                        onChangeText={setOtp}
                        placeholder="Enter 6-digit OTP"
                        placeholderTextColor={placeholderColor}
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                    </View>
                  )}
                </>
              ) : (
                // MPIN Flow
                <View className="mb-5">
                  <Text className="mb-2 text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
                    Enter MPIN
                  </Text>
                  <TextInput
                    className="rounded-xl border border-border-light bg-surface-light px-4 py-3.5 text-base text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
                    value={mpin}
                    onChangeText={setMpin}
                    placeholder="Enter 4-digit MPIN"
                    placeholderTextColor={placeholderColor}
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                  />
                  <TouchableOpacity
                    className="mt-2 items-end"
                    onPress={() =>
                      Toast.show('Forgot MPIN flow not implemented', { type: 'normal' })
                    }>
                    <Text className="text-xs text-primary">Forgot MPIN?</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Login Button */}
              <TouchableOpacity
                className={`mt-5 items-center rounded-xl py-4 shadow-lg ${
                  loginMethod === 'otp' && !otpSent
                    ? 'bg-border-light dark:bg-border-dark' // Disabled state
                    : 'bg-primary'
                }`}
                onPress={handleLogin}
                disabled={loading || (loginMethod === 'otp' && !otpSent)}>
                {loading && (loginMethod === 'mpin' || (loginMethod === 'otp' && otpSent)) ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text
                    className={`text-base font-bold ${
                      loginMethod === 'otp' && !otpSent
                        ? 'text-text-secondary-light dark:text-text-secondary-dark'
                        : 'text-white'
                    }`}>
                    Login
                  </Text>
                )}
              </TouchableOpacity>

              {/* Register Link */}
              <TouchableOpacity
                className="mt-8 items-center"
                onPress={() => router.push('/auth/register')}>
                <Text className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                  Don't have an account? <Text className="font-bold text-primary">Sign Up</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
