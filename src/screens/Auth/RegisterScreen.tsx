import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  useColorScheme,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  sendOTP,
  register,
  getStates,
  getCities,
  getBlocks,
  getVillages,
  verifyOTP,
} from '@/src/api/auth';
import { validateContact, validateOTP, validateName } from '@/src/utils/validators';
import { useToast } from 'react-native-toast-notifications';
import { getErrorMessage } from '@/src/utils/getErrorMessage';

interface State {
  state_id: string;
  state_name: string;
}

interface City {
  district_id: string;
  district_name: string;
}

interface Block {
  block_id: string;
  block_name: string;
}

interface Village {
  village_id: string;
  village_name: string;
}

export default function RegisterScreen() {
  const Toast = useToast();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Form step management
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showMpinModal, setShowMpinModal] = useState(false);

  // Step 1: Personal Info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [displayDate, setDisplayDate] = useState('');
  const [gender, setGender] = useState('');
  const [contact, setContact] = useState('');

  // OTP
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [timer, setTimer] = useState(0);

  // Step 2: Location
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('');
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [loadingVillages, setLoadingVillages] = useState(false);

  // MPIN
  const [mpin, setMpin] = useState('');
  const [confirmMpin, setConfirmMpin] = useState('');
  const [showMpin, setShowMpin] = useState(false);
  const [showConfirmMpin, setShowConfirmMpin] = useState(false);

  // Location Effects
  useEffect(() => {
    fetchStates();
  }, []);

  useEffect(() => {
    if (selectedState) {
      fetchCities(selectedState);
    } else {
      setCities([]);
      setSelectedCity('');
    }
  }, [selectedState]);

  useEffect(() => {
    if (selectedCity) {
      fetchBlocks(selectedCity);
    } else {
      setBlocks([]);
      setSelectedBlock('');
    }
  }, [selectedCity]);

  useEffect(() => {
    if (selectedBlock) {
      fetchVillages(selectedBlock);
    } else {
      setVillages([]);
      setSelectedVillage('');
    }
  }, [selectedBlock]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => (prev > 1 ? prev - 1 : 0));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer]);

useEffect(() => {
  if (otp.length === 6) {
    // Add a small delay to avoid double-triggering if user types fast
    const timeout = setTimeout(() => {
      handleVerifyOTP();
    }, 300);

    return () => clearTimeout(timeout);
  }
}, [otp]);

  // Fetch functions
  const fetchStates = async () => {
    try {
      setLoadingStates(true);
      const response = await getStates();
      setStates(response.data || []);
    } catch (error) {
      Toast.show(getErrorMessage(error), {
        type: 'warning',
        placement: 'top',
      });
    } finally {
      setLoadingStates(false);
    }
  };

  const fetchCities = async (stateId: string) => {
    try {
      setLoadingCities(true);
      const response = await getCities(stateId);
      setCities(response.data || []);
    } catch (error) {
      Toast.show(getErrorMessage(error), {
        type: 'warning',
        placement: 'top',
      });
    } finally {
      setLoadingCities(false);
    }
  };

  const fetchBlocks = async (districtId: string) => {
    try {
      setLoadingBlocks(true);
      const response = await getBlocks(districtId);
      setBlocks(response.data || []);
    } catch (err) {
      Toast.show('Failed to load blocks', { type: 'danger' });
    } finally {
      setLoadingBlocks(false);
    }
  };

  const fetchVillages = async (blockId: string) => {
    try {
      setLoadingVillages(true);
      const response = await getVillages(blockId);
      setVillages(response.data || []);
    } catch (err) {
      Toast.show('Failed to load villages', { type: 'danger' });
    } finally {
      setLoadingVillages(false);
    }
  };

  // Step validation functions
  const validateStep1 = () => {
    if (!validateName(firstName)) {
      Toast.show('Please enter a valid first name (2-25 characters, letters only)', {
        type: 'warning',
        placement: 'top',
      });
      return false;
    }
    if (!validateName(lastName)) {
      Toast.show('Please enter a valid last name (2-25 characters, letters only)', {
        type: 'warning',
        placement: 'top',
      });
      return false;
    }
    if (!dateOfBirth.trim()) {
      Toast.show('Please enter your date of birth', {
        type: 'warning',
        placement: 'top',
      });
      return false;
    }
    if (!gender) {
      Toast.show('Please select your gender', {
        type: 'warning',
        placement: 'top',
      });
      return false;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      Toast.show('Please use YYYY-MM-DD format for date of birth', {
        type: 'warning',
        placement: 'top',
      });
      return false;
    }
    const dob = new Date(`${dateOfBirth}T00:00:00Z`);
    if (isNaN(dob.getTime())) {
      Toast.show('Please enter a valid date', {
        type: 'warning',
        placement: 'top',
      });
      return false;
    }
    const now = new Date();
    if (dob > now) {
      Toast.show('Date of birth cannot be in the future', {
        type: 'warning',
        placement: 'top',
      });
      return false;
    }
    let age = now.getFullYear() - dob.getFullYear();
    const monthDiff = now.getMonth() - dob.getMonth();
    const dayDiff = now.getDate() - dob.getDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--;
    }
    if (age < 10) {
      Toast.show('You must be at least 10 years old to register', {
        type: 'warning',
        placement: 'top',
      });
      return false;
    }
    if (!validateContact(contact)) {
      Toast.show('Please enter a valid 10-digit contact number', {
        type: 'warning',
        placement: 'top',
      });
      return false;
    }
    if (!otpVerified) {
      Toast.show('Please verify your contact number', {
        type: 'warning',
        placement: 'top',
      });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!selectedState) {
      Toast.show('Please select a state', {
        type: 'warning',
        placement: 'top',
      });
      return false;
    }
    if (!selectedCity) {
      Toast.show('Please select a district', {
        type: 'warning',
        placement: 'top',
      });
      return false;
    }
    if (!selectedBlock.trim()) {
      Toast.show('Please select a block', {
        type: 'warning',
        placement: 'top',
      });
      return false;
    }
    if (!selectedVillage.trim()) {
      Toast.show('Please select a region/village', {
        type: 'warning',
        placement: 'top',
      });
      return false;
    }
    return true;
  };

  const handleSendOTP = async () => {
    if (!validateContact(contact)) {
      Toast.show('Please enter a valid 10-digit contact number', {
        type: 'warning',
        placement: 'top',
      });
      return;
    }

    if (timer > 0) {
      Toast.show(`Please wait ${timer}s before resending OTP`, {
        type: 'warning',
        placement: 'top',
      });
      return;
    }

    try {
      setLoading(true);
      await sendOTP({ contact: `+91${contact}` });
      setOtpSent(true);
      setOtpVerified(false);
      setOtp('');
      setShowOtpModal(true);
      Toast.show('OTP Sent', { type: 'success', placement: 'top' });
      setTimer(300); // 5 minutes
    } catch (error: any) {
      Toast.show(getErrorMessage(error), { type: 'warning', placement: 'top' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!validateOTP(otp)) {
      Toast.show('Please enter a valid 6-digit OTP', {
        type: 'error',
        placement: 'top',
      });
      return;
    }

    try {
      setVerifyingOtp(true);
      const response = await verifyOTP({ contact: `+91${contact}`, otp: otp });
            console.log(response);
      setOtpVerified(true);
      Toast.show('OTP Verified Successfully', {
        type: 'success',
        placement: 'top',
      });
      setShowOtpModal(false);
    } catch (error: any) {
      Toast.show(getErrorMessage(error) || 'OTP verification failed', {
        type: 'error',
        placement: 'top',
      });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleDateChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);

      if (event.type === 'set' && date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        setDateOfBirth(formattedDate);
        setSelectedDate(date);
        setDisplayDate(`${day}/${month}/${year}`);
      }
    } else {
      if (date) setSelectedDate(date);
    }
  };

  const handleDateConfirm = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    setDateOfBirth(formattedDate);
    setSelectedDate(date);
    setDisplayDate(`${day}/${month}/${year}`);
    setShowDatePicker(false);
  };

  const handleOpenMpinModal = () => {
    if (!validateStep2()) return;
    setShowMpinModal(true);
  };

  const handleRegister = async () => {
    if (!mpin.trim() || mpin.length !== 4) {
      Toast.show('MPIN must be exactly 4 digits', {
        type: 'warning',
        placement: 'top',
      });
      return;
    }
    if (!/^\d{4}$/.test(mpin)) {
      Toast.show('MPIN must contain only numbers', {
        type: 'warning',
        placement: 'top',
      });
      return;
    }
    if (mpin !== confirmMpin) {
      Toast.show('MPINs do not match', {
        type: 'error',
        placement: 'top',
      });
      return;
    }

    try {
      setLoading(true);
      await register({
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth,
        village_id: selectedVillage,
        contact: `+91${contact}`,
        gender: gender,
        mpin,
      });

      Toast.show('Registration successful! Please login', {
        type: 'success',
        placement: 'top',
      });

      setShowMpinModal(false);
      router.push('/auth/login');
    } catch (error: any) {
      Toast.show(error.response?.data?.message || 'Please try again', {
        type: 'error',
        placement: 'top',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-5 pb-5 pt-16">
          <Text className="mb-2 text-4xl font-bold text-gray-900 dark:text-white">
            Create Account
          </Text>
          <Text className="text-base text-gray-600 dark:text-gray-400">
            Join JantaWave community
          </Text>
        </View>

        {/* Progress Indicator */}
        <View className="mb-8 px-5">
          <View className="mb-3 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <View
              className="h-full rounded-full bg-blue-500"
              style={{ width: `${(currentStep / 2) * 100}%` }}
            />
          </View>
          <Text className="text-center text-sm text-gray-600 dark:text-gray-400">
            Step {currentStep} of 2
          </Text>
        </View>

        {/* Step 1: Personal Information */}
        {currentStep === 1 && (
          <View className="px-5">
            <Text className="mb-5 text-xl font-semibold text-gray-900 dark:text-white">
              Personal Information
            </Text>

            <View className="mb-5">
              <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                First Name
              </Text>
              <TextInput
                className="rounded-xl border border-gray-200 bg-gray-100 px-4 py-3.5 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Enter first name (letters only)"
                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
              />
            </View>

            <View className="mb-5">
              <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Last Name
              </Text>
              <TextInput
                className="rounded-xl border border-gray-200 bg-gray-100 px-4 py-3.5 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                value={lastName}
                onChangeText={setLastName}
                placeholder="Enter last name (letters only)"
                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
              />
            </View>

            <View className="mb-5">
              <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Gender
              </Text>
              <View className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
                <Picker
                  selectedValue={gender}
                  onValueChange={setGender}
                  style={{ color: isDark ? '#FFFFFF' : '#111827' }}
                  dropdownIconColor={isDark ? '#3B82F6' : '#2563EB'}>
                  <Picker.Item label="Select Gender" value="" />
                  <Picker.Item label="Male" value="male" />
                  <Picker.Item label="Female" value="female" />
                  <Picker.Item label="Other" value="other" />
                  <Picker.Item label="Prefer not to say" value="prefer_not_to_say" />
                </Picker>
              </View>
            </View>

            <View className="mb-5">
              <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Date of Birth
              </Text>

              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
                className="flex-row items-center gap-3 rounded-xl border border-gray-200 bg-gray-100 px-4 py-3.5 dark:border-gray-700 dark:bg-gray-800">
                <Feather name="calendar" size={18} color={isDark ? '#fff' : '#000'} />
                <Text
                  className={`${
                    displayDate
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-500 dark:text-gray-400'
                  } text-base`}>
                  {displayDate ? displayDate : 'Select Date (DD/MM/YYYY)'}
                </Text>
              </TouchableOpacity>

              {Platform.OS === 'ios' ? (
                <Modal
                  visible={showDatePicker}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setShowDatePicker(false)}>
                  <View className="flex-1 items-center justify-center bg-black/50">
                    <View className="w-11/12 max-w-md rounded-2xl bg-white p-5 dark:bg-gray-800">
                      <Text className="mb-3 text-center text-lg font-bold text-gray-800 dark:text-white">
                        Select Date of Birth
                      </Text>

                      <View className="items-center">
                        <DateTimePicker
                          mode="date"
                          display="spinner"
                          value={selectedDate}
                          maximumDate={new Date()}
                          onChange={handleDateChange}
                        />
                      </View>

                      <View className="mt-4 flex-row gap-3">
                        <TouchableOpacity
                          onPress={() => setShowDatePicker(false)}
                          className="flex-1 rounded-xl bg-gray-200 py-3 dark:bg-gray-700">
                          <Text className="text-center font-semibold text-gray-900 dark:text-white">
                            Cancel
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleDateConfirm(selectedDate)}
                          className="flex-1 rounded-xl bg-blue-500 py-3">
                          <Text className="text-center font-semibold text-white">Confirm</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  <Modal
                    visible={showOtpModal}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowOtpModal(false)}>
                    <TouchableOpacity
                      activeOpacity={1}
                      onPress={() => setShowOtpModal(false)}
                      className="flex-1 items-center justify-center bg-black/50 px-5">
                      <TouchableOpacity
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()}
                        className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-800">
                        {/* Header */}
                        <View className="mb-4 flex-row items-center justify-between">
                          <Text className="text-xl font-bold text-gray-900 dark:text-white">
                            Verify OTP
                          </Text>
                          <TouchableOpacity
                            onPress={() => setShowOtpModal(false)}
                            className="h-8 w-8 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                            <Text className="text-lg font-bold text-gray-600 dark:text-gray-300">
                              ×
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {/* Description */}
                        <Text className="mb-5 text-sm text-gray-600 dark:text-gray-400">
                          Enter the 6-digit OTP sent to +91{contact}
                        </Text>

                        {/* OTP Boxes */}
                        <View className="mb-5 flex-row justify-between">
                          {[...Array(6)].map((_, i) => (
                            <View
                              key={i}
                              className={`h-12 w-12 items-center justify-center rounded-lg border text-lg font-bold ${
                                otp[i]
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                  : 'border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-900'
                              }`}>
                              <Text className="text-gray-900 dark:text-white">{otp[i] || ''}</Text>
                            </View>
                          ))}
                          {/* Hidden input */}
                          <TextInput
                            className="absolute inset-0 opacity-0"
                            keyboardType="number-pad"
                            maxLength={6}
                            value={otp}
                            onChangeText={setOtp}
                            autoFocus
                          />
                        </View>

                        {/* Verify Button */}
                        <TouchableOpacity
                          className={`mb-4 items-center rounded-xl py-3.5 ${
                            verifyingOtp ? 'bg-gray-400 dark:bg-gray-600' : 'bg-green-500'
                          }`}
                          onPress={handleVerifyOTP}
                          disabled={verifyingOtp}>
                          {verifyingOtp ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <Text className="text-base font-semibold text-white">Verify OTP</Text>
                          )}
                        </TouchableOpacity>

                        {/* Resend Section */}
                        <View className="flex-row items-center justify-center">
                          <Text className="text-sm text-gray-600 dark:text-gray-400">
                            Didn't receive OTP?{' '}
                          </Text>
                          <TouchableOpacity onPress={handleSendOTP} disabled={timer > 0 || loading}>
                            <Text
                              className={`text-sm font-semibold ${
                                timer > 0 || loading
                                  ? 'text-gray-400 dark:text-gray-600'
                                  : 'text-blue-500'
                              }`}>
                              {timer > 0
                                ? `Resend in ${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, '0')}`
                                : 'Resend'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  </Modal>
                </Modal>
              ) : (
                showDatePicker && (
                  <DateTimePicker
                    mode="date"
                    display="default"
                    value={selectedDate}
                    maximumDate={new Date()}
                    onChange={handleDateChange}
                  />
                )
              )}
            </View>

            <View className="mb-5">
              <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Contact Number
              </Text>
              <View className="flex-row items-center gap-3">
                <TextInput
                  className="flex-1 rounded-xl border border-gray-200 bg-gray-100 px-4 py-3.5 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  value={contact}
                  onChangeText={setContact}
                  placeholder="Enter 10-digit contact"
                  placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                  keyboardType="phone-pad"
                  maxLength={10}
                  editable={!otpVerified}
                />

                <TouchableOpacity
                  className={`min-w-[100px] items-center rounded-xl px-5 py-3.5 ${
                    loading || timer > 0 || otpVerified
                      ? 'bg-gray-400 dark:bg-gray-600'
                      : 'bg-blue-500'
                  }`}
                  onPress={handleSendOTP}
                  disabled={loading || timer > 0 || otpVerified}>
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : otpVerified ? (
                    <Text className="text-sm font-semibold text-white">✓ Verified</Text>
                  ) : (
                    <Text className="text-sm font-semibold text-white">
                      {otpSent ? 'Resend' : 'Send OTP'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
              {timer > 0 && !otpVerified && (
                <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Resend OTP in {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Step 2: Location Information */}
        {currentStep === 2 && (
          <View className="px-5">
            <Text className="mb-5 text-xl font-semibold text-gray-900 dark:text-white">
              Location Details
            </Text>

            <View className="mb-5">
              <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                State
              </Text>
              <View className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
                <Picker
                  selectedValue={selectedState}
                  onValueChange={setSelectedState}
                  style={{ color: isDark ? '#FFFFFF' : '#111827' }}
                  dropdownIconColor={isDark ? '#3B82F6' : '#2563EB'}
                  enabled={!loadingStates}>
                  <Picker.Item label="Select State" value="" />
                  {states.map((state) => (
                    <Picker.Item
                      key={state.state_id}
                      label={state.state_name}
                      value={String(state.state_id)}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View className="mb-5">
              <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                District
              </Text>
              <View className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
                <Picker
                  selectedValue={selectedCity}
                  onValueChange={setSelectedCity}
                  style={{ color: isDark ? '#FFFFFF' : '#111827' }}
                  dropdownIconColor={isDark ? '#3B82F6' : '#2563EB'}
                  enabled={!loadingCities && selectedState !== ''}>
                  <Picker.Item label="Select District" value="" />
                  {cities.map((city) => (
                    <Picker.Item
                      key={city.district_id}
                      label={city.district_name}
                      value={String(city.district_id)}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View className="mb-5">
              <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Block
              </Text>
              <View className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
                <Picker
                  selectedValue={selectedBlock}
                  onValueChange={setSelectedBlock}
                  style={{ color: isDark ? '#FFFFFF' : '#111827' }}
                  dropdownIconColor={isDark ? '#3B82F6' : '#2563EB'}
                  enabled={!loadingBlocks && selectedCity !== ''}>
                  <Picker.Item label="Select Block" value="" />
                  {blocks.map((block) => (
                    <Picker.Item
                      key={block.block_id}
                      label={block.block_name}
                      value={String(block.block_id)}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View className="mb-5">
              <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Region/Village
              </Text>
              <View className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
                <Picker
                  selectedValue={selectedVillage}
                  onValueChange={setSelectedVillage}
                  style={{ color: isDark ? '#FFFFFF' : '#111827' }}
                  dropdownIconColor={isDark ? '#3B82F6' : '#2563EB'}
                  enabled={!loadingVillages && selectedBlock !== ''}>
                  <Picker.Item label="Select Region/Village" value="" />
                  {villages.map((village) => (
                    <Picker.Item
                      key={village.village_id}
                      label={village.village_name}
                      value={String(village.village_id)}
                    />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        )}

        {/* Navigation Buttons */}
        <View className="mt-8 flex-row gap-3 px-5">
          {currentStep > 1 && (
            <TouchableOpacity
              className="flex-[0.5] items-center rounded-xl bg-gray-400 py-3.5 dark:bg-gray-700"
              onPress={handlePreviousStep}>
              <Text className="text-base font-semibold text-white">← Back</Text>
            </TouchableOpacity>
          )}

          {currentStep < 2 && (
            <TouchableOpacity
              className={`${currentStep > 1 ? 'flex-1' : 'flex-1'} items-center rounded-xl bg-blue-500 py-3.5`}
              onPress={handleNextStep}
              disabled={loading}>
              <Text className="text-base font-semibold text-white">Next →</Text>
            </TouchableOpacity>
          )}

          {currentStep === 2 && (
            <TouchableOpacity
              className="flex-1 items-center rounded-xl bg-blue-500 py-4"
              onPress={handleOpenMpinModal}
              disabled={loading}>
              <Text className="text-base font-semibold text-white">Sign Up</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Login Link */}
        {currentStep === 1 && (
          <TouchableOpacity
            className="mt-5 items-center pb-5"
            onPress={() => router.push('/auth/login')}>
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              Already have an account? <Text className="font-semibold text-blue-500">Login</Text>
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* OTP Verification Modal */}
      <Modal
        visible={showOtpModal}
        transparent
        animationType="slide"
        onRequestClose={() => {} /* disable outside close */}>
        <View className="flex-1 items-center justify-center bg-black/50 px-5">
          <View className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-800">
            {/* Header */}
            <Text className="mb-4 text-center text-xl font-bold text-gray-900 dark:text-white">
              Verify OTP
            </Text>

            {/* Description */}
            <Text className="mb-6 text-center text-sm text-gray-600 dark:text-gray-400">
              Enter the 6-digit OTP sent to +91{contact}
            </Text>

            {/* OTP Boxes */}
            <View className="relative mb-6 flex-row justify-between">
              {[...Array(6)].map((_, i) => {
                const isActive = otp.length === i; // highlight current box
                const isFilled = otp[i];
                return (
                  <View
                    key={i}
                    className={`h-12 w-12 items-center justify-center rounded-lg border text-lg font-bold ${
                      isFilled
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : isActive
                          ? 'border-blue-400 bg-gray-100 dark:bg-gray-900'
                          : 'border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-900'
                    }`}>
                    <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                      {otp[i] || ''}
                    </Text>

                    {/* Blinking Cursor */}
                    {isActive && otp.length < 6 && !isFilled && (
                      <View className="absolute h-5 w-[2px] animate-pulse bg-blue-500" />
                    )}
                  </View>
                );
              })}

              {/* Hidden TextInput */}
              <TextInput
                className="absolute inset-0 opacity-0"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
                autoFocus
              />
            </View>

            {/* {/* Verify Button */} */}
            {/* <TouchableOpacity */}
            {/*   className={`mb-4 items-center rounded-xl py-3.5 ${ */}
            {/*     verifyingOtp ? 'bg-gray-400 dark:bg-gray-600' : 'bg-green-500' */}
            {/*   }`} */}
            {/*   onPress={handleVerifyOTP} */}
            {/*   disabled={verifyingOtp}> */}
            {/*   {verifyingOtp ? ( */}
            {/*     <ActivityIndicator size="small" color="#ffffff" /> */}
            {/*   ) : ( */}
            {/*     <Text className="text-base font-semibold text-white">Verify OTP</Text> */}
            {/*   )} */}
            {/* </TouchableOpacity> */}

            {/* Resend Section */}
            <View className="flex-row items-center justify-center">
              <Text className="text-sm text-gray-600 dark:text-gray-400">Didn’t receive OTP? </Text>
              <TouchableOpacity onPress={handleSendOTP} disabled={timer > 0 || loading}>
                <Text
                  className={`text-sm font-semibold ${
                    timer > 0 || loading ? 'text-gray-400 dark:text-gray-600' : 'text-blue-500'
                  }`}>
                  {timer > 0
                    ? `Resend in ${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, '0')}`
                    : 'Resend'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MPIN Creation Modal */}
      <Modal
        visible={showMpinModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMpinModal(false)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowMpinModal(false)}
          className="flex-1 items-center justify-center bg-black/50 px-5">
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-800">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-gray-900 dark:text-white">Create MPIN</Text>
              <TouchableOpacity
                onPress={() => setShowMpinModal(false)}
                className="h-8 w-8 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                <Text className="text-lg font-bold text-gray-600 dark:text-gray-300">×</Text>
              </TouchableOpacity>
            </View>

            <Text className="mb-5 text-sm text-gray-600 dark:text-gray-400">
              Create a 4-digit MPIN to secure your account
            </Text>

            <View className="mb-5">
              <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Enter MPIN
              </Text>
              <View className="relative flex-row items-center">
                <TextInput
                  className="flex-1 rounded-xl border border-gray-200 bg-gray-100 px-4 py-3.5 pr-12 text-center text-lg font-semibold tracking-widest text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  value={mpin}
                  onChangeText={setMpin}
                  placeholder="0000"
                  placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                  secureTextEntry={!showMpin}
                  keyboardType="number-pad"
                  maxLength={4}
                />
                <TouchableOpacity
                  onPress={() => setShowMpin(!showMpin)}
                  className="absolute right-3 p-2">
                  <Text className="text-base">{showMpin ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="mb-5">
              <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Confirm MPIN
              </Text>
              <View className="relative flex-row items-center">
                <TextInput
                  className="flex-1 rounded-xl border border-gray-200 bg-gray-100 px-4 py-3.5 pr-12 text-center text-lg font-semibold tracking-widest text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  value={confirmMpin}
                  onChangeText={setConfirmMpin}
                  placeholder="0000"
                  placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                  secureTextEntry={!showConfirmMpin}
                  keyboardType="number-pad"
                  maxLength={4}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmMpin(!showConfirmMpin)}
                  className="absolute right-3 p-2">
                  <Text className="text-base">{showConfirmMpin ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              className={`items-center rounded-xl py-3.5 ${
                loading ? 'bg-gray-400 dark:bg-gray-600' : 'bg-blue-500'
              }`}
              onPress={handleRegister}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-base font-semibold text-white">Complete Registration</Text>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
