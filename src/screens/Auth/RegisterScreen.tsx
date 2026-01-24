import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  useColorScheme,
  Platform,
  SafeAreaView,
  StatusBar,
  Keyboard,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
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

// --- REUSABLE CUSTOM PICKER COMPONENT ---
const CustomPicker = ({
  value,
  items,
  labelKey = 'label',
  valueKey = 'value',
  placeholder,
  onValueChange,
  enabled = true,
  isLoading = false,
  colors,
}: {
  value: string;
  items: any[];
  labelKey?: string;
  valueKey?: string;
  placeholder: string;
  onValueChange: (val: string) => void;
  enabled?: boolean;
  isLoading?: boolean;
  colors: any;
}) => {
  const selectedItem = items.find((item) => String(item[valueKey]) === String(value));

  return (
    <View
      onTouchStart={() => Keyboard.dismiss()}
      className="relative h-[54px] justify-center rounded-xl border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark">
      <View className="absolute inset-0 justify-center px-4">
        <Text
          numberOfLines={1}
          style={{
            color:
              !enabled || isLoading
                ? colors.placeholder
                : selectedItem
                  ? colors.textPrimary
                  : colors.placeholder,
          }}
          className="text-base">
          {isLoading ? 'Loading...' : selectedItem ? selectedItem[labelKey] : placeholder}
        </Text>
      </View>

      <View className="absolute right-4 top-0 h-full justify-center">
        <Feather name="chevron-down" size={20} color={colors.placeholder} />
      </View>

      <Picker
        selectedValue={value}
        onValueChange={(itemValue) => onValueChange(String(itemValue))}
        enabled={enabled && !isLoading}
        onFocus={() => Keyboard.dismiss()}
        mode="dropdown"
        dropdownIconColor="transparent"
        style={{
          opacity: 0,
          position: 'absolute',
          width: '100%',
          height: '100%',
        }}>
        {items.map((item, index) => (
          <Picker.Item
            key={index}
            label={item[labelKey]}
            value={String(item[valueKey])}
            color={colors.textPrimary}
          />
        ))}
      </Picker>
    </View>
  );
};

export default function RegisterScreen() {
  const Toast = useToast();
  const router = useRouter();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const colors = {
    placeholder: isDark ? '#94a3b8' : '#64748b',
    textPrimary: isDark ? '#f8fafc' : '#0f172a',
    surface: isDark ? '#171717' : '#f8f9fa',
    primary: '#007AFF',
  };

  // --- KEYBOARD VISIBILITY STATE ---
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

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
  const [acceptWhatsapp, setAcceptWhatsapp] = useState(false);

  // OTP Logic
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [timer, setTimer] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const otpInputRef = useRef(null);
  const mpinInputRef = useRef(null);
  const confirmMpinInputRef = useRef(null);

  // Track last verified contact
  const [lastVerifiedContact, setLastVerifiedContact] = useState('');

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

  // Static Data for Gender
  const genderOptions = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' },
  ];

  const minAgeDate = new Date();
  minAgeDate.setFullYear(minAgeDate.getFullYear() - 15);

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
      Toast.show(getErrorMessage(e), { type: 'warning' });
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
      Toast.show(getErrorMessage(e), { type: 'warning' });
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
    if (!acceptWhatsapp) {
      Toast.show('Please accept WhatsApp notifications to proceed', { type: 'warning' });
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

  const handleVerifyOTP = useCallback(async () => {
    if (!validateOTP(otp)) {
      Toast.show('Please enter a valid 6-digit OTP', { type: 'error' });
      return;
    }
    try {
      setVerifyingOtp(true);
      await verifyOTP({ contact: `+91${contact}`, otp: otp });
      setOtpVerified(true);
      setLastVerifiedContact(contact);
      Toast.show('Verified Successfully', { type: 'success' });
      setShowOtpModal(false);
    } catch (error: any) {
      Toast.show(getErrorMessage(error) || 'Verification failed', { type: 'error' });
    } finally {
      setVerifyingOtp(false);
    }
  }, [otp, contact, Toast]);

  // Auto Verify Effect
  useEffect(() => {
    if (otp.length === 6) {
      const timeout = setTimeout(() => {
        handleVerifyOTP();
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [otp, handleVerifyOTP]);

  const handleEditContact = () => {
    setShowOtpModal(false);
    setOtp('');
    setTimer(0);
    setOtpSent(false);
  };

  const handleResetContact = () => {
    setContact('');
    setOtp('');
    setOtpVerified(false);
    setOtpSent(false);
    setTimer(0);
    setResendCount(0);
  };

  useEffect(() => {
    if (contact.length === 10) {
      if (contact === lastVerifiedContact) {
        setOtpVerified(true);
        Toast.show('Contact already verified', { type: 'success' });
      } else if (otpVerified) {
        setOtpVerified(false);
        setOtpSent(false);
        setOtp('');
        setTimer(0);
      }
    } else {
      if (otpVerified && contact !== lastVerifiedContact) {
        setOtpVerified(false);
        setOtpSent(false);
        setOtp('');
        setTimer(0);
      }
    }
  }, [contact, lastVerifiedContact, otpVerified, Toast]);

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
    <SafeAreaView
      className="flex-1 bg-background-light dark:bg-background-dark"
      style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
      <KeyboardAwareScrollView
        scrollEnabled={isKeyboardVisible}
        extraScrollHeight={20} // Reduced space between keyboard and component
        enableOnAndroid={true}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 50 }}
        className="flex-1 px-5">
        <View>
          {/* Header */}
          <View className="mt-2 pb-5">
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
                <CustomPicker
                  value={gender}
                  items={genderOptions}
                  labelKey="label"
                  valueKey="value"
                  placeholder="Select Gender"
                  onValueChange={setGender}
                  colors={colors}
                />
              </View>

              {/* Date of Birth */}
              <View className="mb-5">
                <Label text="Date of Birth" />
                <TouchableOpacity
                  onPress={() => {
                    Keyboard.dismiss();
                    setShowDatePicker(true);
                  }}
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

              {/* Contact Number & WhatsApp Consent */}
              <View className="mb-5">
                <Label text="Contact Number" />
                <View className="flex-row items-center gap-3">
                  <TextInput
                    className="flex-1 rounded-xl border border-border-light bg-surface-light px-4 py-3.5 text-base text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
                    value={contact}
                    onChangeText={(text) => {
                      const numeric = text.replace(/[^0-9]/g, '');
                      setContact(numeric);
                    }}
                    placeholder="Enter 10-digit contact"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="phone-pad"
                    maxLength={10}
                    editable={!otpVerified || contact !== lastVerifiedContact}
                  />

                  {/* Send OTP Button */}
                  <TouchableOpacity
                    className={`min-w-[100px] items-center rounded-xl px-5 py-3.5 ${
                      loading ||
                      timer > 0 ||
                      otpVerified ||
                      !acceptWhatsapp ||
                      contact.length !== 10
                        ? 'bg-text-secondary-light dark:bg-text-secondary-dark'
                        : 'bg-primary'
                    }`}
                    onPress={() => handleSendOTP(false)}
                    disabled={
                      loading ||
                      timer > 0 ||
                      otpVerified ||
                      !acceptWhatsapp ||
                      contact.length !== 10
                    }>
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

                {/* WhatsApp Checkbox */}
                {!otpVerified && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setAcceptWhatsapp(!acceptWhatsapp)}
                    className="mt-3 flex-row items-start gap-2 pr-2">
                    <Feather
                      name={acceptWhatsapp ? 'check-square' : 'square'}
                      size={20}
                      color={acceptWhatsapp ? colors.primary : colors.placeholder}
                      style={{ marginTop: 2 }}
                    />
                    <Text className="flex-1 text-sm text-text-secondary-light dark:text-text-secondary-dark">
                      I agree to receive important updates & notifications from e-Janta on WhatsApp.
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Status Helpers */}
                <View className="mt-2 flex-row items-start justify-between">
                  <View>
                    {timer > 0 && !otpVerified && (
                      <Text className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                        Resend OTP in {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}
                      </Text>
                    )}
                  </View>

                  {otpVerified && contact !== lastVerifiedContact && (
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
                <CustomPicker
                  value={selectedState}
                  items={states}
                  labelKey="state_name"
                  valueKey="state_id"
                  placeholder="Select State"
                  onValueChange={setSelectedState}
                  isLoading={loadingStates}
                  enabled={!loadingStates}
                  colors={colors}
                />
              </View>

              {/* City */}
              <View className="mb-5">
                <Label text="District" />
                <CustomPicker
                  value={selectedCity}
                  items={cities}
                  labelKey="district_name"
                  valueKey="district_id"
                  placeholder="Select District"
                  onValueChange={setSelectedCity}
                  isLoading={loadingCities}
                  enabled={!loadingCities && !!selectedState}
                  colors={colors}
                />
              </View>

              {/* Block */}
              <View className="mb-5">
                <Label text="Block" />
                <CustomPicker
                  value={selectedBlock}
                  items={blocks}
                  labelKey="block_name"
                  valueKey="block_id"
                  placeholder="Select Block"
                  onValueChange={setSelectedBlock}
                  isLoading={loadingBlocks}
                  enabled={!loadingBlocks && !!selectedCity}
                  colors={colors}
                />
              </View>

              {/* Village */}
              <View className="mb-5">
                <Label text="Region/Village" />
                <CustomPicker
                  value={selectedVillage}
                  items={villages}
                  labelKey="village_name"
                  valueKey="village_id"
                  placeholder="Select Region/Village"
                  onValueChange={setSelectedVillage}
                  isLoading={loadingVillages}
                  enabled={!loadingVillages && !!selectedBlock}
                  colors={colors}
                />
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
        </View>
      </KeyboardAwareScrollView>
      {/* OTP Verification Modal */}
      <Modal visible={showOtpModal} transparent animationType="slide" onRequestClose={() => {}}>
        <View className="flex-1 justify-center bg-black/50 px-5">
          <KeyboardAwareScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
            scrollEnabled={isKeyboardVisible}
            enableOnAndroid={true}
            extraScrollHeight={20}
            keyboardShouldPersistTaps="handled">
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
                    className={`h-12 w-12 items-center justify-center rounded-lg border ${
                      otp[i]
                        ? 'border-primary bg-blue-50 dark:bg-blue-900/20'
                        : i === otp.length
                          ? 'border-primary bg-blue-50/50 dark:bg-blue-900/10'
                          : 'border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark'
                    }`}>
                    <Text className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">
                      {otp[i] || (i === otp.length && isKeyboardVisible ? '|' : '')}
                    </Text>
                  </View>
                ))}
                <TextInput
                  ref={otpInputRef}
                  className="absolute inset-0 opacity-0"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={(text) => {
                    const numeric = text.replace(/[^0-9]/g, '');
                    setOtp(numeric);
                    if (numeric.length === 6) {
                      Keyboard.dismiss();
                    }
                  }}
                  autoFocus
                  returnKeyType="done"
                />
              </View>

              <TouchableOpacity
                className={`mb-4 items-center rounded-xl py-3.5 ${
                  otp.length !== 6 || verifyingOtp
                    ? 'bg-text-secondary-light/50 dark:bg-text-secondary-dark/50'
                    : 'bg-success'
                }`}
                onPress={handleVerifyOTP}
                disabled={otp.length !== 6 || verifyingOtp}>
                {verifyingOtp ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="font-semibold text-white">Verify OTP</Text>
                )}
              </TouchableOpacity>

              <View className="flex-col items-center gap-2">
                <Text className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                  Didn't receive OTP?
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
          </KeyboardAwareScrollView>
        </View>
      </Modal>
      {/* MPIN Modal */}
      <Modal visible={showMpinModal} transparent animationType="slide" onRequestClose={() => {}}>
        <View className="flex-1 justify-center bg-black/50 px-5">
          <KeyboardAwareScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
            scrollEnabled={isKeyboardVisible}
            enableOnAndroid={true}
            extraScrollHeight={20}
            keyboardShouldPersistTaps="handled">
            <View className="w-full rounded-2xl bg-surface-light p-6 dark:bg-surface-dark">
              <Text className="mb-5 text-xl font-bold text-text-primary-light dark:text-text-primary-dark">
                Set MPIN
              </Text>

              <View className="mb-4">
                <Label text="Enter MPIN" />
                <View className="relative mb-6 flex-row justify-between">
                  {[...Array(4)].map((_, i) => (
                    <View
                      key={i}
                      className={`h-12 w-12 items-center justify-center rounded-lg border ${
                        mpin[i]
                          ? 'border-primary bg-blue-50 dark:bg-blue-900/20'
                          : i === mpin.length
                            ? 'border-primary bg-blue-50/50 dark:bg-blue-900/10'
                            : 'border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark'
                      }`}>
                      <Text className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">
                        {mpin[i] ? '•' : i === mpin.length && isKeyboardVisible ? '|' : ''}
                      </Text>
                    </View>
                  ))}
                  <TextInput
                    ref={mpinInputRef}
                    className="absolute inset-0 opacity-0"
                    keyboardType="number-pad"
                    maxLength={4}
                    value={mpin}
                    onChangeText={(text) => {
                      const numeric = text.replace(/[^0-9]/g, '');
                      setMpin(numeric);
                      if (numeric.length === 4) {
                        setTimeout(() => {
                          confirmMpinInputRef.current?.focus();
                        }, 100);
                      }
                    }}
                    autoFocus
                    returnKeyType="next"
                    onSubmitEditing={() => confirmMpinInputRef.current?.focus()}
                  />
                </View>
              </View>

              <View className="mb-4">
                <Label text="Confirm MPIN" />

                {/* Wrap this section to ensure tapping anywhere focuses the input */}
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => {
                    if (mpin.length === 4) confirmMpinInputRef.current?.focus();
                  }}
                  className="relative mb-6 flex-row justify-between">
                  {[...Array(4)].map((_, i) => (
                    <View
                      key={i}
                      className={`h-12 w-12 items-center justify-center rounded-lg border ${
                        confirmMpin[i]
                          ? 'border-primary bg-blue-50 dark:bg-blue-900/20'
                          : i === confirmMpin.length && mpin.length === 4
                            ? 'border-primary bg-blue-50/50 dark:bg-blue-900/10' // Active box style
                            : 'border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark'
                      }`}>
                      <Text className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">
                        {confirmMpin[i]
                          ? '•'
                          : i === confirmMpin.length && mpin.length === 4 && isKeyboardVisible
                            ? '|'
                            : ''}
                      </Text>
                    </View>
                  ))}

                  <TextInput
                    ref={confirmMpinInputRef}
                    className="absolute inset-0 h-full w-full opacity-0" // Added h-full w-full to ensure it covers area
                    keyboardType="number-pad"
                    maxLength={4}
                    value={confirmMpin}
                    onChangeText={(text) => {
                      const numeric = text.replace(/[^0-9]/g, '');
                      setConfirmMpin(numeric);
                      if (numeric.length === 4 && mpin.length === 4) {
                        Keyboard.dismiss();
                      }
                    }}
                    editable={mpin.length === 4}
                    returnKeyType="done"
                    onSubmitEditing={handleRegister}
                  />
                </TouchableOpacity>

                {confirmMpin.length === 4 && mpin !== confirmMpin && (
                  <Text className="mt-2 text-center text-sm text-red-500">
                    MPINs do not match. Please try again.
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={handleRegister}
                className={`items-center rounded-xl py-3 ${
                  mpin.length === 4 && confirmMpin.length === 4 && mpin === confirmMpin && !loading
                    ? 'bg-primary'
                    : 'bg-text-secondary-light/50 dark:bg-text-secondary-dark/50'
                }`}
                disabled={
                  mpin.length !== 4 || confirmMpin.length !== 4 || mpin !== confirmMpin || loading
                }>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="font-bold text-white">Complete Registration</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAwareScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
