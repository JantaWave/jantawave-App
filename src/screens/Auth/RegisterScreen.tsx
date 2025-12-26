import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  useColorScheme,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
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
import { validateContact, validateOTP } from '@/src/utils/validators';
import { useToast } from 'react-native-toast-notifications';
import { getErrorMessage } from '@/src/utils/getErrorMessage';

// Interfaces
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

  const colors = {
    placeholder: isDark ? '#94a3b8' : '#64748b',
    textPrimary: isDark ? '#f8fafc' : '#0f172a',
    surface: isDark ? '#171717' : '#f8f9fa',
  };

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

  // OTP Logic
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [timer, setTimer] = useState(0);
  const [resendCount, setResendCount] = useState(0);

  // Step 2: Location
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('');

  // Loading states
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [loadingVillages, setLoadingVillages] = useState(false);

  // MPIN
  const [mpin, setMpin] = useState('');
  const [confirmMpin, setConfirmMpin] = useState('');

  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');

  // --- Calculations for Age Restriction (15+) ---
  const minAgeDate = new Date();
  minAgeDate.setFullYear(minAgeDate.getFullYear() - 15);

  // Location Effects
  useEffect(() => {
    fetchStates();
  }, []);
  useEffect(() => {
    if (selectedState) fetchCities(selectedState);
    else {
      setCities([]);
      setSelectedCity('');
    }
  }, [selectedState]);
  useEffect(() => {
    if (selectedCity) fetchBlocks(selectedCity);
    else {
      setBlocks([]);
      setSelectedBlock('');
    }
  }, [selectedCity]);
  useEffect(() => {
    if (selectedBlock) fetchVillages(selectedBlock);
    else {
      setVillages([]);
      setSelectedVillage('');
    }
  }, [selectedBlock]);

  // Timer Effect
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

  // Auto Verify Effect
  useEffect(() => {
    if (otp.length === 6) {
      const timeout = setTimeout(() => {
        handleVerifyOTP();
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [otp]);

  // --- Fetch Functions ---
  const fetchStates = async () => {
    try {
      setLoadingStates(true);
      const res = await getStates();
      setStates(res.data || []);
    } catch (e) {
      Toast.show(getErrorMessage(e), { type: 'warning' });
    } finally {
      setLoadingStates(false);
    }
  };
  const fetchCities = async (id: string) => {
    try {
      setLoadingCities(true);
      const res = await getCities(id);
      setCities(res.data || []);
    } catch (e) {
      Toast.show(getErrorMessage(e), { type: 'warning' });
    } finally {
      setLoadingCities(false);
    }
  };
  const fetchBlocks = async (id: string) => {
    try {
      setLoadingBlocks(true);
      const res = await getBlocks(id);
      setBlocks(res.data || []);
    } catch (e) {
      Toast.show('Failed to load blocks', { type: 'danger' });
    } finally {
      setLoadingBlocks(false);
    }
  };
  const fetchVillages = async (id: string) => {
    try {
      setLoadingVillages(true);
      const res = await getVillages(id);
      setVillages(res.data || []);
    } catch (e) {
      Toast.show('Failed to load villages', { type: 'danger' });
    } finally {
      setLoadingVillages(false);
    }
  };

  // --- UI Components ---
  const Label = ({ text }: { text: string }) => (
    <Text className="mb-2 text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
      {text} <Text className="text-danger">*</Text>
    </Text>
  );

  // --- VALIDATION LOGIC ---
  const validateNameLive = (name: string): string => {
    const trimmed = name.trim();
    if (!trimmed) return 'This field is required';
    if (trimmed.length > 25) return 'Maximum 25 characters allowed';
    const spaces = (trimmed.match(/ /g) || []).length;
    if (spaces > 1) return 'Only one space is allowed';
    if (trimmed.includes('  ')) return 'No double spaces allowed';
    const regex = /^[A-Za-z]+(?: [A-Za-z]+)?$/;
    if (!regex.test(trimmed)) return 'Only alphabetic characters allowed';
    return '';
  };

  const validatePersonalInfo = () => {
    if (firstNameError || lastNameError) {
      Toast.show('Please fix the highlighted errors', { type: 'warning' });
      return false;
    }
    if (!firstName.trim() || !lastName.trim()) {
      Toast.show('Please fill all required fields', { type: 'warning' });
      return false;
    }
    if (!gender) {
      Toast.show('Please select your gender', { type: 'warning' });
      return false;
    }
    if (!dateOfBirth.trim()) {
      Toast.show('Please select your date of birth', { type: 'warning' });
      return false;
    }
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    if (age < 15) {
      Toast.show('You must be at least 15 years old to register', { type: 'warning' });
      return false;
    }
    if (!validateContact(contact)) {
      Toast.show('Please enter a valid 10-digit contact number', { type: 'warning' });
      return false;
    }
    return true;
  };

  const validateStep1 = () => {
    if (!validatePersonalInfo()) return false;
    if (!otpVerified) {
      Toast.show('Please verify your contact number via OTP', { type: 'warning' });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!selectedState) {
      Toast.show('Please select a state', { type: 'warning' });
      return false;
    }
    if (!selectedCity) {
      Toast.show('Please select a district', { type: 'warning' });
      return false;
    }
    if (!selectedBlock) {
      Toast.show('Please select a block', { type: 'warning' });
      return false;
    }
    if (!selectedVillage) {
      Toast.show('Please select a region/village', { type: 'warning' });
      return false;
    }
    return true;
  };

  // --- HANDLERS ---
  const handleSendOTP = async (isSmsFallback = false) => {
    if (!validatePersonalInfo()) return;
    if (timer > 0) {
      Toast.show(`Please wait ${timer}s before resending`, { type: 'warning' });
      return;
    }

    try {
      setLoading(true);
      const payload = { contact: `+91${contact}`, ...(isSmsFallback && { channel: 'sms' }) };
      await sendOTP(payload);
      setOtpSent(true);
      setOtpVerified(false);
      setOtp('');
      setShowOtpModal(true);
      const channelText = isSmsFallback ? 'SMS' : 'WhatsApp';
      Toast.show(`OTP Sent via ${channelText}`, { type: 'success' });
      setTimer(300);
      setResendCount((prev) => prev + 1);
    } catch (error: any) {
      Toast.show(getErrorMessage(error), { type: 'warning' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!validateOTP(otp)) {
      Toast.show('Please enter a valid 6-digit OTP', { type: 'error' });
      return;
    }
    try {
      setVerifyingOtp(true);
      await verifyOTP({ contact: `+91${contact}`, otp: otp });
      setOtpVerified(true);
      Toast.show('Verified Successfully', { type: 'success' });
      setShowOtpModal(false);
    } catch (error: any) {
      Toast.show(getErrorMessage(error) || 'Verification failed', { type: 'error' });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleEditContact = () => {
    setShowOtpModal(false);
    setOtpSent(false);
    setTimer(0);
    setResendCount(0);
  };

  // ✅ New Handler to allow changing number after verification
  const handleResetContact = () => {
    setOtpVerified(false);
    setOtpSent(false);
    setOtp('');
    setTimer(0);
    setResendCount(0);
  };

  const handleNextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleDateConfirm = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setDateOfBirth(`${year}-${month}-${day}`);
    setSelectedDate(date);
    setDisplayDate(`${day}/${month}/${year}`);
    setShowDatePicker(false);
  };

  const handleRegister = async () => {
    if (!mpin.trim() || mpin.length !== 4)
      return Toast.show('MPIN must be 4 digits', { type: 'warning' });
    if (mpin !== confirmMpin) return Toast.show('MPINs do not match', { type: 'error' });

    try {
      setLoading(true);
      await register({
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth,
        village_id: selectedVillage,
        contact: `+91${contact}`,
        gender,
        mpin,
      });
      Toast.show('Registration successful!', { type: 'success' });
      setShowMpinModal(false);
      router.push('/auth/login');
    } catch (error: any) {
      Toast.show(error.response?.data?.message || 'Failed to register', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View className="pb-5 pt-8">
            <Text className="mb-2 text-4xl font-bold text-text-primary-light dark:text-text-primary-dark">
              Create Account
            </Text>
            <Text className="text-base text-text-secondary-light dark:text-text-secondary-dark">
              Join JantaWave community
            </Text>
          </View>

          {/* Progress Indicator */}
          <View className="mb-8">
            <View className="mb-3 h-2 overflow-hidden rounded-full bg-border-light dark:bg-border-dark">
              <View
                className="h-full rounded-full bg-primary"
                style={{ width: `${(currentStep / 2) * 100}%` }}
              />
            </View>
            <Text className="text-center text-sm text-text-secondary-light dark:text-text-secondary-dark">
              Step {currentStep} of 2
            </Text>
          </View>

          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <View>
              <Text className="mb-5 text-xl font-semibold text-text-primary-light dark:text-text-primary-dark">
                Personal Information
              </Text>

              {/* First Name */}
              <View className="mb-5">
                <Label text="First Name" />
                <TextInput
                  className={`rounded-xl border px-4 py-3.5 text-base ${
                    firstNameError ? 'border-danger' : 'border-border-light dark:border-border-dark'
                  } bg-surface-light text-text-primary-light dark:bg-surface-dark dark:text-text-primary-dark`}
                  value={firstName}
                  onChangeText={(text) => {
                    setFirstName(text);
                    setFirstNameError(validateNameLive(text));
                  }}
                  placeholder="Enter first name"
                  maxLength={25}
                  placeholderTextColor={colors.placeholder}
                />
                {firstNameError ? (
                  <Text className="mt-1 text-xs text-danger">{firstNameError}</Text>
                ) : null}
              </View>

              {/* Last Name */}
              <View className="mb-5">
                <Label text="Last Name" />
                <TextInput
                  className={`rounded-xl border px-4 py-3.5 text-base ${
                    lastNameError ? 'border-danger' : 'border-border-light dark:border-border-dark'
                  } bg-surface-light text-text-primary-light dark:bg-surface-dark dark:text-text-primary-dark`}
                  value={lastName}
                  onChangeText={(text) => {
                    setLastName(text);
                    setLastNameError(validateNameLive(text));
                  }}
                  placeholder="Enter last name"
                  maxLength={25}
                  placeholderTextColor={colors.placeholder}
                />
                {lastNameError ? (
                  <Text className="mt-1 text-xs text-danger">{lastNameError}</Text>
                ) : null}
              </View>

              {/* Gender Picker */}
              <View className="mb-5">
                <Label text="Gender" />
                <View className="overflow-hidden rounded-xl border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark">
                  <Picker
                    selectedValue={gender}
                    onValueChange={setGender}
                    style={{ color: colors.textPrimary }}
                    dropdownIconColor={colors.placeholder}>
                    <Picker.Item label="Select Gender" value="" color={colors.placeholder} />
                    <Picker.Item label="Male" value="male" color={colors.textPrimary} />
                    <Picker.Item label="Female" value="female" color={colors.textPrimary} />
                    <Picker.Item label="Other" value="other" color={colors.textPrimary} />
                  </Picker>
                </View>
              </View>

              {/* Date of Birth */}
              <View className="mb-5">
                <Label text="Date of Birth" />
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.8}
                  className="flex-row items-center gap-3 rounded-xl border border-border-light bg-surface-light px-4 py-3.5 dark:border-border-dark dark:bg-surface-dark">
                  <Feather name="calendar" size={18} color={colors.textPrimary} />
                  <Text
                    className={`${
                      displayDate
                        ? 'text-text-primary-light dark:text-text-primary-dark'
                        : 'text-text-secondary-light dark:text-text-secondary-dark'
                    } text-base`}>
                    {displayDate ? displayDate : 'Select Date (15+ Years)'}
                  </Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    maximumDate={minAgeDate}
                    onChange={(event, date) => {
                      setShowDatePicker(false);
                      if (event.type === 'set' && date) handleDateConfirm(date);
                    }}
                  />
                )}
              </View>

              {/* Contact Number */}
              <View className="mb-5">
                <Label text="Contact Number" />
                <View className="flex-row items-center gap-3">
                  <TextInput
                    className="flex-1 rounded-xl border border-border-light bg-surface-light px-4 py-3.5 text-base text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
                    value={contact}
                    onChangeText={setContact}
                    placeholder="Enter 10-digit contact"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="phone-pad"
                    maxLength={10}
                    editable={!otpVerified}
                  />

                  <TouchableOpacity
                    className={`min-w-[100px] items-center rounded-xl px-5 py-3.5 ${
                      loading || timer > 0 || otpVerified
                        ? 'bg-text-secondary-light dark:bg-text-secondary-dark'
                        : 'bg-primary'
                    }`}
                    onPress={() => handleSendOTP(false)}
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

                {/* Status Helpers: Resend Timer OR Change Number Link */}
                <View className="mt-2 flex-row items-start justify-between">
                  {/* Left: Timer */}
                  <View>
                    {timer > 0 && !otpVerified && (
                      <Text className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                        Resend OTP in {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}
                      </Text>
                    )}
                  </View>

                  {/* Right: Change Number (Visible ONLY if Verified) */}
                  {otpVerified && (
                    <TouchableOpacity onPress={handleResetContact}>
                      <View className="flex-row items-center gap-1">
                        <Feather name="edit-2" size={12} color={colors.placeholder} />
                        <Text className="text-xs font-medium text-text-secondary-light underline dark:text-text-secondary-dark">
                          Change Number
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Step 2: Location Information */}
          {currentStep === 2 && (
            <View>
              <Text className="mb-5 text-xl font-semibold text-text-primary-light dark:text-text-primary-dark">
                Location Details
              </Text>

              {/* State */}
              <View className="mb-5">
                <Label text="State" />
                <View className="overflow-hidden rounded-xl border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark">
                  <Picker
                    selectedValue={selectedState}
                    onValueChange={setSelectedState}
                    style={{ color: colors.textPrimary }}
                    dropdownIconColor={colors.placeholder}
                    enabled={!loadingStates}>
                    <Picker.Item label="Select State" value="" color={colors.placeholder} />
                    {states.map((s) => (
                      <Picker.Item
                        key={s.state_id}
                        label={s.state_name}
                        value={String(s.state_id)}
                        color={colors.textPrimary}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* City */}
              <View className="mb-5">
                <Label text="District" />
                <View className="overflow-hidden rounded-xl border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark">
                  <Picker
                    selectedValue={selectedCity}
                    onValueChange={setSelectedCity}
                    style={{ color: colors.textPrimary }}
                    dropdownIconColor={colors.placeholder}
                    enabled={!loadingCities && !!selectedState}>
                    <Picker.Item label="Select District" value="" color={colors.placeholder} />
                    {cities.map((c) => (
                      <Picker.Item
                        key={c.district_id}
                        label={c.district_name}
                        value={String(c.district_id)}
                        color={colors.textPrimary}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Block */}
              <View className="mb-5">
                <Label text="Block" />
                <View className="overflow-hidden rounded-xl border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark">
                  <Picker
                    selectedValue={selectedBlock}
                    onValueChange={setSelectedBlock}
                    style={{ color: colors.textPrimary }}
                    dropdownIconColor={colors.placeholder}
                    enabled={!loadingBlocks && !!selectedCity}>
                    <Picker.Item label="Select Block" value="" color={colors.placeholder} />
                    {blocks.map((b) => (
                      <Picker.Item
                        key={b.block_id}
                        label={b.block_name}
                        value={String(b.block_id)}
                        color={colors.textPrimary}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Village */}
              <View className="mb-5">
                <Label text="Region/Village" />
                <View className="overflow-hidden rounded-xl border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark">
                  <Picker
                    selectedValue={selectedVillage}
                    onValueChange={setSelectedVillage}
                    style={{ color: colors.textPrimary }}
                    dropdownIconColor={colors.placeholder}
                    enabled={!loadingVillages && !!selectedBlock}>
                    <Picker.Item
                      label="Select Region/Village"
                      value=""
                      color={colors.placeholder}
                    />
                    {villages.map((v) => (
                      <Picker.Item
                        key={v.village_id}
                        label={v.village_name}
                        value={String(v.village_id)}
                        color={colors.textPrimary}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>
          )}

          {/* Navigation Buttons */}
          <View className="mt-8 flex-row gap-3">
            {currentStep > 1 && (
              <TouchableOpacity
                className="flex-[0.5] items-center rounded-xl bg-text-secondary-light py-3.5 dark:bg-text-secondary-dark"
                onPress={handlePreviousStep}>
                <Text className="text-base font-semibold text-white">← Back</Text>
              </TouchableOpacity>
            )}

            {currentStep < 2 && (
              <TouchableOpacity
                className="flex-1 items-center rounded-xl bg-primary py-3.5"
                onPress={handleNextStep}
                disabled={loading}>
                <Text className="text-base font-semibold text-white">Next →</Text>
              </TouchableOpacity>
            )}

            {currentStep === 2 && (
              <TouchableOpacity
                className="flex-1 items-center rounded-xl bg-primary py-4"
                onPress={() => {
                  if (validateStep2()) setShowMpinModal(true);
                }}
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
              <Text className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                Already have an account? <Text className="font-semibold text-primary">Login</Text>
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* OTP Verification Modal */}
      <Modal visible={showOtpModal} transparent animationType="slide" onRequestClose={() => {}}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-center bg-black/50 px-5">
          <View className="w-full rounded-2xl bg-surface-light p-6 dark:bg-surface-dark">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">
                Verify OTP
              </Text>
              <TouchableOpacity onPress={handleEditContact}>
                <Text className="font-medium text-primary">Edit Number</Text>
              </TouchableOpacity>
            </View>

            <Text className="mb-6 text-center text-sm text-text-secondary-light dark:text-text-secondary-dark">
              Enter the 6-digit OTP sent to +91{contact}
            </Text>

            <View className="relative mb-6 flex-row justify-between">
              {[...Array(6)].map((_, i) => (
                <View
                  key={i}
                  className={`h-12 w-12 items-center justify-center rounded-lg border text-lg font-bold ${
                    otp[i]
                      ? 'border-primary bg-blue-50 dark:bg-blue-900/20'
                      : 'border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark'
                  }`}>
                  <Text className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">
                    {otp[i] || ''}
                  </Text>
                </View>
              ))}
              <TextInput
                className="absolute inset-0 opacity-0"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
                autoFocus
              />
            </View>

            <TouchableOpacity
              className={`mb-4 items-center rounded-xl py-3.5 ${
                verifyingOtp ? 'bg-text-secondary-light dark:bg-text-secondary-dark' : 'bg-success'
              }`}
              onPress={handleVerifyOTP}
              disabled={verifyingOtp}>
              {verifyingOtp ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="font-semibold text-white">Verify OTP</Text>
              )}
            </TouchableOpacity>

            <View className="flex-col items-center gap-2">
              <Text className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                Didn’t receive OTP?
              </Text>
              <View className="flex-row gap-4">
                <TouchableOpacity
                  onPress={() => handleSendOTP(false)}
                  disabled={timer > 0 || loading}>
                  <Text
                    className={`text-sm font-semibold ${
                      timer > 0
                        ? 'text-text-secondary-light dark:text-text-secondary-dark'
                        : 'text-primary'
                    }`}>
                    {timer > 0 ? `WhatsApp (${timer}s)` : 'Resend WhatsApp'}
                  </Text>
                </TouchableOpacity>
                {resendCount > 0 && (
                  <TouchableOpacity
                    onPress={() => handleSendOTP(true)}
                    disabled={timer > 0 || loading}>
                    <Text
                      className={`text-sm font-semibold ${
                        timer > 0
                          ? 'text-text-secondary-light dark:text-text-secondary-dark'
                          : 'text-primary'
                      }`}>
                      {timer > 0 ? `SMS (${timer}s)` : 'Send via SMS'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MPIN Modal */}
      <Modal
        visible={showMpinModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMpinModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-center bg-black/50 px-5">
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setShowMpinModal(false)}
            className="w-full">
            <TouchableOpacity
              activeOpacity={1}
              className="w-full rounded-2xl bg-surface-light p-6 dark:bg-surface-dark">
              <Text className="mb-5 text-xl font-bold text-text-primary-light dark:text-text-primary-dark">
                Set MPIN
              </Text>

              <View className="mb-4">
                <Label text="Enter MPIN" />
                <TextInput
                  className="rounded-xl border border-border-light bg-surface-light p-3 text-center text-lg tracking-widest text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
                  value={mpin}
                  onChangeText={setMpin}
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry
                />
              </View>

              <View className="mb-4">
                <Label text="Confirm MPIN" />
                <TextInput
                  className="rounded-xl border border-border-light bg-surface-light p-3 text-center text-lg tracking-widest text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
                  value={confirmMpin}
                  onChangeText={setConfirmMpin}
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                onPress={handleRegister}
                className="items-center rounded-xl bg-primary py-3">
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="font-bold text-white">Complete Registration</Text>
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
