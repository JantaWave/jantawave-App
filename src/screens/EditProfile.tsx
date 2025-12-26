import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
// 1. IMPORT SAFE AREA INSETS
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { useToast } from 'react-native-toast-notifications';
import { getStates, getCities, getBlocks, getVillages } from '@/src/api/auth';
import { getPresignedUrl } from '@/src/api';
import { updateUserProfile } from '../api/user';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const { isDark } = useAppTheme();
  const Toast = useToast();

  // 2. GET INSETS
  const insets = useSafeAreaInsets();

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [contact] = useState(user?.contact || '');
  const [imageUri, setImageUri] = useState(user?.avatar_url || null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Lists and selected IDs
  const [statesList, setStatesList] = useState([]);
  const [citiesList, setCitiesList] = useState([]);
  const [blocksList, setBlocksList] = useState([]);
  const [villagesList, setVillagesList] = useState([]);

  const [selectedStateId, setSelectedStateId] = useState('');
  const [selectedCityId, setSelectedCityId] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState('');
  const [selectedVillageId, setSelectedVillageId] = useState('');

  // Loading flags
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [loadingVillages, setLoadingVillages] = useState(false);

  // 1️⃣ Fetch states first, then prefill
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoadingStates(true);
        const res = await getStates();
        const fetchedStates = res?.data || [];
        setStatesList(fetchedStates);

        // ✅ Updated: Access state_name directly from user
        const currentState = fetchedStates.find(
          (s) => s.state_name?.toLowerCase() === user?.state_name?.toLowerCase()
        );

        if (currentState) {
          setSelectedStateId(currentState.state_id);
          // ✅ Updated: Pass 'user' instead of 'address'
          await fetchCities(currentState.state_id, user);
        }
      } catch (err) {
        Toast.show('Failed to load states', { type: 'danger' });
      } finally {
        setLoadingStates(false);
      }
    };

    if (user) {
      initializeData();
    }
  }, []); // Run once on mount

  // 2️⃣ Fetch cities and prefill district
  const fetchCities = async (stateId, userData = null) => {
    try {
      setLoadingCities(true);
      const res = await getCities(stateId);
      const fetchedCities = res?.data || [];
      setCitiesList(fetchedCities);

      // ✅ Updated: Access district_name directly from passed user object
      const currentCity = fetchedCities.find(
        (c) => c.district_name?.toLowerCase() === userData?.district_name?.toLowerCase()
      );

      if (currentCity) {
        setSelectedCityId(currentCity.district_id);
        await fetchBlocks(currentCity.district_id, userData);
      }
    } catch (err) {
      Toast.show('Failed to load districts', { type: 'danger' });
    } finally {
      setLoadingCities(false);
    }
  };

  // 3️⃣ Fetch blocks and prefill
  const fetchBlocks = async (districtId, userData = null) => {
    try {
      setLoadingBlocks(true);
      const res = await getBlocks(districtId);
      const fetchedBlocks = res?.data || [];
      setBlocksList(fetchedBlocks);

      // ✅ Updated: Access block_name directly
      const currentBlock = fetchedBlocks.find(
        (b) => b.block_name?.toLowerCase() === userData?.block_name?.toLowerCase()
      );

      if (currentBlock) {
        setSelectedBlockId(currentBlock.block_id);
        await fetchVillages(currentBlock.block_id, userData);
      }
    } catch (err) {
      Toast.show('Failed to load blocks', { type: 'danger' });
    } finally {
      setLoadingBlocks(false);
    }
  };

  // 4️⃣ Fetch villages and prefill
  const fetchVillages = async (blockId, userData = null) => {
    try {
      setLoadingVillages(true);
      const res = await getVillages(blockId);
      const fetchedVillages = res?.data || [];
      setVillagesList(fetchedVillages);

      // ✅ Updated: Access village_name directly
      const currentVillage = fetchedVillages.find(
        (v) => v.village_name?.toLowerCase() === userData?.village_name?.toLowerCase()
      );

      if (currentVillage) {
        setSelectedVillageId(currentVillage.village_id);
      }
    } catch (err) {
      Toast.show('Failed to load villages', { type: 'danger' });
    } finally {
      setLoadingVillages(false);
    }
  };

  // 🔄 Manual selection triggers fetch cascade
  useEffect(() => {
    if (selectedStateId && !citiesList.length) fetchCities(selectedStateId);
  }, [selectedStateId]);

  useEffect(() => {
    if (selectedCityId && !blocksList.length) fetchBlocks(selectedCityId);
  }, [selectedCityId]);

  useEffect(() => {
    if (selectedBlockId && !villagesList.length) fetchVillages(selectedBlockId);
  }, [selectedBlockId]);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Toast.show('Permission denied to access gallery', { type: 'warning' });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const MAX_SIZE = 16 * 1024 * 1024; // 16 MB

        if (asset.fileSize && asset.fileSize > MAX_SIZE) {
          Alert.alert('File Too Large', 'Please upload an image smaller than 16 MB.');
          return;
        }

        await uploadToR2(asset.uri);
      }
    } catch (e) {
      console.error('Pick Image Error:', e);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadToR2 = async (uri: string) => {
    try {
      setUploading(true);
      const extension = uri.split('.').pop()?.toLowerCase();
      const fileName = `avatar_${user?.id}_${Date.now()}.${extension || 'jpg'}`;
      const fileType = extension === 'png' ? 'image/png' : 'image/jpeg';

      const { uploadUrl, fileUrl } = await getPresignedUrl(fileName, fileType, 'avatars');

      const response = await fetch(uri);
      const blob = await response.blob();

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': fileType },
        body: blob,
      });

      if (uploadResponse.ok) {
        const finalUrl = fileUrl.startsWith('http') ? fileUrl : `https://${fileUrl}`;
        setImageUri(finalUrl);
        Toast.show('Profile photo uploaded successfully!', { type: 'success' });
      } else {
        throw new Error(`Upload failed with status ${uploadResponse.status}`);
      }
    } catch (error: any) {
      console.error('Upload Error:', error);
      Alert.alert('Error', 'Failed to upload profile photo. ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const updatePayload = {
        first_name: firstName,
        last_name: lastName,
        avatar_url: imageUri,
        // Send village ID as 'village' to match backend expectation
        village: selectedVillageId,
      };

      // 1. Call API
      const response = await updateUserProfile(updatePayload);

      // 2. Update Context with the fresh user data from backend
      if (updateUser && response?.data?.user) {
        updateUser(response.data.user);
      }

      Toast.show('Profile updated successfully!', { type: 'success' });
      router.back();
    } catch (err: any) {
      console.error('Save Error:', err);
      Toast.show(err.response?.data?.message || 'Failed to update profile', { type: 'danger' });
    } finally {
      setSaving(false);
    }
  };
  return (
    <View className="flex-1 bg-white dark:bg-[#0a0a0a]">
      {/* 3. Dynamic Header Padding 
          We use padding top based on safe area inset + a little extra (10) for breathing room 
      */}
      <View
        className="flex-row items-center justify-between bg-gray-100 px-5 pb-5 dark:bg-[#1a1a1a]"
        style={{ paddingTop: Math.max(insets.top, 20) + 10 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back-ios" size={22} color="#2196F3" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-black dark:text-white">Edit Profile</Text>
        <View className="w-6" />
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 px-5 pt-6"
        showsVerticalScrollIndicator={false}
        // 4. Dynamic Bottom Padding for Scroll Content
        // We add insets.bottom + 20 so the save button is never hidden behind the nav bar
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 20 }}>
        {/* Profile Picture */}
        <View className="mb-8 items-center">
          <TouchableOpacity onPress={pickImage} activeOpacity={0.8} disabled={uploading}>
            <View className="relative">
              {imageUri ? (
                <Image source={{ uri: imageUri }} className="h-28 w-28 rounded-full" />
              ) : (
                <View className="h-28 w-28 items-center justify-center rounded-full bg-blue-500">
                  <MaterialIcons name="person" size={56} color="#ffffff" />
                </View>
              )}

              {uploading ? (
                <View className="absolute bottom-0 right-0 h-10 w-10 items-center justify-center rounded-full bg-blue-500">
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              ) : (
                <View className="absolute bottom-0 right-0 h-10 w-10 items-center justify-center rounded-full bg-blue-500 shadow-lg">
                  <MaterialIcons name="camera-alt" size={20} color="#fff" />
                </View>
              )}
            </View>
          </TouchableOpacity>
          <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Tap to change profile photo
          </Text>
        </View>

        {/* Form Fields */}
        <View className="gap-y-5">
          <View>
            <Text className="mb-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
              First Name
            </Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter first name"
              placeholderTextColor="#999"
              className="rounded-xl border border-gray-200 bg-white p-4 text-black dark:border-gray-700 dark:bg-[#1a1a1a] dark:text-white"
            />
          </View>

          <View>
            <Text className="mb-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
              Last Name
            </Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter last name"
              placeholderTextColor="#999"
              className="rounded-xl border border-gray-200 bg-white p-4 text-black dark:border-gray-700 dark:bg-[#1a1a1a] dark:text-white"
            />
          </View>

          <View>
            <Text className="mb-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
              Contact
            </Text>
            <TextInput
              value={contact}
              editable={false}
              className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-500 dark:border-gray-700 dark:bg-[#151515] dark:text-gray-400"
            />
          </View>

          {/* State Picker */}
          <View>
            <Text className="mb-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
              State
            </Text>
            <View className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-[#1a1a1a]">
              {loadingStates ? (
                <ActivityIndicator className="p-3" color="#2196F3" />
              ) : (
                <Picker
                  selectedValue={selectedStateId}
                  onValueChange={(val) => setSelectedStateId(String(val))}
                  style={{ color: isDark ? '#fff' : '#000' }}
                  dropdownIconColor={isDark ? '#9CA3AF' : '#6B7280'}>
                  <Picker.Item label="Select State" value="" />
                  {statesList.map((s) => (
                    <Picker.Item key={s.state_id} label={s.state_name} value={s.state_id} />
                  ))}
                </Picker>
              )}
            </View>
          </View>

          {/* District Picker */}
          <View>
            <Text className="mb-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
              District
            </Text>
            <View className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-[#1a1a1a]">
              {loadingCities ? (
                <ActivityIndicator className="p-3" color="#2196F3" />
              ) : (
                <Picker
                  selectedValue={selectedCityId}
                  onValueChange={(val) => setSelectedCityId(String(val))}
                  style={{ color: isDark ? '#fff' : '#000' }}
                  dropdownIconColor={isDark ? '#9CA3AF' : '#6B7280'}
                  enabled={!!selectedStateId}>
                  <Picker.Item label="Select District" value="" />
                  {citiesList.map((c) => (
                    <Picker.Item
                      key={c.district_id}
                      label={c.district_name}
                      value={c.district_id}
                    />
                  ))}
                </Picker>
              )}
            </View>
          </View>

          {/* Block Picker */}
          <View>
            <Text className="mb-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
              Block
            </Text>
            <View className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-[#1a1a1a]">
              {loadingBlocks ? (
                <ActivityIndicator className="p-3" color="#2196F3" />
              ) : (
                <Picker
                  selectedValue={selectedBlockId}
                  onValueChange={(val) => setSelectedBlockId(String(val))}
                  style={{ color: isDark ? '#fff' : '#000' }}
                  dropdownIconColor={isDark ? '#9CA3AF' : '#6B7280'}
                  enabled={!!selectedCityId}>
                  <Picker.Item label="Select Block" value="" />
                  {blocksList.map((b) => (
                    <Picker.Item key={b.block_id} label={b.block_name} value={b.block_id} />
                  ))}
                </Picker>
              )}
            </View>
          </View>

          {/* Village Picker */}
          <View>
            <Text className="mb-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
              Village
            </Text>
            <View className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-[#1a1a1a]">
              {loadingVillages ? (
                <ActivityIndicator className="p-3" color="#2196F3" />
              ) : (
                <Picker
                  selectedValue={selectedVillageId}
                  onValueChange={(val) => setSelectedVillageId(String(val))}
                  style={{ color: isDark ? '#fff' : '#000' }}
                  dropdownIconColor={isDark ? '#9CA3AF' : '#6B7280'}
                  enabled={!!selectedBlockId}>
                  <Picker.Item label="Select Village" value="" />
                  {villagesList.map((v) => (
                    <Picker.Item key={v.village_id} label={v.village_name} value={v.village_id} />
                  ))}
                </Picker>
              )}
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          disabled={saving || uploading}
          onPress={handleSave}
          activeOpacity={0.9}
          className="mb-8 mt-8 h-14 w-full items-center justify-center rounded-xl bg-blue-500 shadow-sm disabled:opacity-50">
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-base font-bold text-white">Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
