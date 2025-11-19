import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { sendOTP, login, getAddress } from '@/src/api/auth';
import { validateOTP, validateMPIN, validateContact } from '@/src/utils/validators';
import { useToast } from 'react-native-toast-notifications';
import { useAuth } from '@/src/context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { getErrorMessage } from '@/src/utils/getErrorMessage';

export default function LoginScreen() {
  const Toast = useToast();
  const router = useRouter();
  const { login: authLogin } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [loading, setLoading] = useState(false);
  const [contact, setContact] = useState('');
  const [loginMethod, setLoginMethod] = useState<'otp' | 'mpin'>('otp');
  const [otp, setOtp] = useState('');
  const [mpin, setMpin] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const handleSendOTP = async () => {
    if (!validateContact(contact)) {
      Toast.show('Please enter a valid 10-digit contact number.', {
        type: 'warning',
        placement: 'top',
      });
      return;
    }

    try {
      setLoading(true);
      await sendOTP({ contact });
      setOtpSent(true);
      Toast.show('OTP sent successfully!', {
        type: 'success',
        placement: 'top',
      });
    } catch (error: any) {
      Toast.show(getErrorMessage(error), {
        type: 'error',
        placement: 'top',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!validateContact(contact)) {
      Toast.show('Please enter a valid contact number.', {
        type: 'warning',
        placement: 'top',
      });
      return;
    }

    if (loginMethod === 'otp' && !validateOTP(otp)) {
      Toast.show('Please enter a valid 6-digit OTP.', {
        type: 'warning',
        placement: 'top',
      });
      return;
    }

    if (loginMethod === 'mpin' && !validateMPIN(mpin)) {
      Toast.show('Please enter a valid 4-digit MPIN.', {
        type: 'warning',
        placement: 'top',
      });
      return;
    }

    try {
      setLoading(true);
      const response = await login({
        contact: `+91${contact}`,
        ...(loginMethod === 'otp' ? { otp } : { mpin }),
      });

      const token = response?.tokens?.accessToken;
      const user = response?.user;

      if (token && user) {
        // Fetch address details if village_id exists
        let addressData = null;
        if (user.village_id) {
          try {
            const addressResponse = await getAddress(user.village_id);
            addressData = addressResponse?.data;
          } catch (error) {
            console.error('Failed to fetch address:', error);
            // Continue without address if fetch fails
          }
        }

        // Combine user data with address
        const formattedUser = {
          ...user,
          address: addressData
            ? {
                village_name: addressData.village_name,
                block_name: addressData.block_name,
                district_name: addressData.district_name,
                state_name: addressData.state_name,
              }
            : null,
        };

        await authLogin(token, formattedUser);

        Toast.show('Logged in successfully!', {
          type: 'success',
          placement: 'top',
          duration: 4000,
          animationType: 'slide-in',
        });

        router.replace('/(tabs)');
      } else {
        Toast.show('Login failed. Please try again.', {
          type: 'error',
          placement: 'top',
        });
      }
    } catch (error: any) {
      Toast.show(getErrorMessage(error), {
        type: 'error',
        placement: 'top',
        duration: 4000,
        animationType: 'slide-in',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-[#1a1a1a]"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View className="flex-1 justify-center px-5">
        {/* Header */}
        <View className="mb-10 items-center">
          <View className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-[#252525]">
            <MaterialIcons name="login" size={48} color="#2196F3" />
          </View>
          <Text className="mb-2 text-3xl font-bold text-black dark:text-white">Welcome Back</Text>
          <Text className="text-base text-gray-600 dark:text-[#cccccc]">Login to JantaWave</Text>
        </View>

        {/* Form */}
        <View className="w-full">
          {/* Contact Input */}
          <View className="mb-5">
            <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-[#cccccc]">
              Contact Number
            </Text>
            <TextInput
              className="rounded-xl border border-gray-300 bg-gray-50 px-4 py-3.5 text-base text-black dark:border-[#333333] dark:bg-[#252525] dark:text-white"
              value={contact}
              onChangeText={setContact}
              placeholder="Enter 10-digit contact"
              placeholderTextColor={isDark ? '#666666' : '#999999'}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>

          {/* Method Toggle */}
          <View className="mb-6 flex-row gap-2 rounded-xl bg-gray-100 p-1 dark:bg-[#252525]">
            <TouchableOpacity
              className={`flex-1 rounded-lg py-3 ${
                loginMethod === 'otp' ? 'bg-[#2196F3]' : 'bg-transparent'
              }`}
              onPress={() => {
                setLoginMethod('otp');
                setMpin('');
              }}>
              <Text
                className={`text-center text-sm font-medium ${
                  loginMethod === 'otp' ? 'text-white' : 'text-gray-600 dark:text-[#cccccc]'
                }`}>
                Login with OTP
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 rounded-lg py-3 ${
                loginMethod === 'mpin' ? 'bg-[#2196F3]' : 'bg-transparent'
              }`}
              onPress={() => {
                setLoginMethod('mpin');
                setOtp('');
                setOtpSent(false);
              }}>
              <Text
                className={`text-center text-sm font-medium ${
                  loginMethod === 'mpin' ? 'text-white' : 'text-gray-600 dark:text-[#cccccc]'
                }`}>
                Login with MPIN
              </Text>
            </TouchableOpacity>
          </View>

          {/* OTP Method */}
          {loginMethod === 'otp' ? (
            <>
              <TouchableOpacity
                className={`mb-5 items-center rounded-xl py-4 ${
                  otpSent ? 'bg-gray-400 dark:bg-[#444444]' : 'bg-[#2196F3]'
                }`}
                onPress={handleSendOTP}
                disabled={loading || otpSent}>
                {loading && !otpSent ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-base font-semibold text-white">
                    {otpSent ? 'OTP Sent' : 'Send OTP'}
                  </Text>
                )}
              </TouchableOpacity>

              {otpSent && (
                <View className="mb-5">
                  <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-[#cccccc]">
                    Enter OTP
                  </Text>
                  <TextInput
                    className="rounded-xl border border-gray-300 bg-gray-50 px-4 py-3.5 text-base text-black dark:border-[#333333] dark:bg-[#252525] dark:text-white"
                    value={otp}
                    onChangeText={setOtp}
                    placeholder="Enter 6-digit OTP"
                    placeholderTextColor={isDark ? '#666666' : '#999999'}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
              )}
            </>
          ) : (
            // MPIN Method
            <View className="mb-5">
              <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-[#cccccc]">
                Enter MPIN
              </Text>
              <TextInput
                className="rounded-xl border border-gray-300 bg-gray-50 px-4 py-3.5 text-base text-black dark:border-[#333333] dark:bg-[#252525] dark:text-white"
                value={mpin}
                onChangeText={setMpin}
                placeholder="Enter 4-digit MPIN"
                placeholderTextColor={isDark ? '#666666' : '#999999'}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
              />
            </View>
          )}

          {/* Login Button */}
          <TouchableOpacity
            className={`mt-5 items-center rounded-xl py-4 shadow-lg ${
              loginMethod === 'otp' && !otpSent ? 'bg-gray-400 dark:bg-[#444444]' : 'bg-[#2196F3]'
            }`}
            onPress={handleLogin}
            disabled={loading || (loginMethod === 'otp' && !otpSent)}>
            {loading && (loginMethod === 'mpin' || (loginMethod === 'otp' && otpSent)) ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="text-base font-semibold text-white">Login</Text>
            )}
          </TouchableOpacity>

          {/* Register Link */}
          <TouchableOpacity
            className="mt-5 items-center"
            onPress={() => router.push('/auth/register')}>
            <Text className="text-sm text-gray-600 dark:text-[#cccccc]">
              Don't have an account? <Text className="font-semibold text-[#2196F3]">Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
