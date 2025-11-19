import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useToast } from 'react-native-toast-notifications';
import { getStates, getCities, getBlocks, getVillages } from '@/src/api/auth';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const Toast = useToast();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [contact] = useState(user?.contact || '');
  const [imageUri, setImageUri] = useState(user?.avatar || null);
  const [saving, setSaving] = useState(false);

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

  const address = user?.address || {};

  // 1️⃣ Fetch states first, then prefill
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoadingStates(true);
        const res = await getStates();
        const fetchedStates = res?.data || [];
        setStatesList(fetchedStates);

        // Match user's current state (by name)
        const currentState = fetchedStates.find(
          (s) => s.state_name?.toLowerCase() === address.state_name?.toLowerCase()
        );

        if (currentState) {
          setSelectedStateId(currentState.state_id);
          await fetchCities(currentState.state_id, address); // next step
        }
      } catch (err) {
        Toast.show('Failed to load states', { type: 'danger' });
      } finally {
        setLoadingStates(false);
      }
    };

    initializeData();
  }, []);

  // 2️⃣ Fetch cities and prefill district
  const fetchCities = async (stateId, addressData = null) => {
    try {
      setLoadingCities(true);
      const res = await getCities(stateId);
      const fetchedCities = res?.data || [];
      setCitiesList(fetchedCities);

      const currentCity = fetchedCities.find(
        (c) => c.district_name?.toLowerCase() === addressData?.district_name?.toLowerCase()
      );

      if (currentCity) {
        setSelectedCityId(currentCity.district_id);
        await fetchBlocks(currentCity.district_id, addressData);
      }
    } catch (err) {
      Toast.show('Failed to load districts', { type: 'danger' });
    } finally {
      setLoadingCities(false);
    }
  };

  // 3️⃣ Fetch blocks and prefill
  const fetchBlocks = async (districtId, addressData = null) => {
    try {
      setLoadingBlocks(true);
      const res = await getBlocks(districtId);
      const fetchedBlocks = res?.data || [];
      setBlocksList(fetchedBlocks);

      const currentBlock = fetchedBlocks.find(
        (b) => b.block_name?.toLowerCase() === addressData?.block_name?.toLowerCase()
      );

      if (currentBlock) {
        setSelectedBlockId(currentBlock.block_id);
        await fetchVillages(currentBlock.block_id, addressData);
      }
    } catch (err) {
      Toast.show('Failed to load blocks', { type: 'danger' });
    } finally {
      setLoadingBlocks(false);
    }
  };

  // 4️⃣ Fetch villages and prefill
  const fetchVillages = async (blockId, addressData = null) => {
    try {
      setLoadingVillages(true);
      const res = await getVillages(blockId);
      const fetchedVillages = res?.data || [];
      setVillagesList(fetchedVillages);

      const currentVillage = fetchedVillages.find(
        (v) => v.village_name?.toLowerCase() === addressData?.village_name?.toLowerCase()
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
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Toast.show('Permission denied to access gallery', { type: 'warning' });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // TODO: send selectedVillageId etc. to backend
      Toast.show('Profile updated successfully!', { type: 'success' });
      router.back();
    } catch {
      Toast.show('Failed to update profile', { type: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-white dark:bg-[#1a1a1a]">
      {/* Header */}
      <View className="flex-row items-center justify-between bg-gray-100 px-5 pb-5 pt-16 dark:bg-[#252525]">
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back-ios" size={22} color="#2196F3" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-black dark:text-white">Edit Profile</Text>
        <View className="w-6" />
      </View>

      {/* Content */}
      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        {/* Profile Picture */}
        <View className="mb-8 items-center">
          <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
            <View className="relative">
              {imageUri ? (
                <Image source={{ uri: imageUri }} className="h-24 w-24 rounded-full" />
              ) : (
                <View className="h-24 w-24 items-center justify-center rounded-full bg-[#2196F3]">
                  <MaterialIcons name="person" size={48} color="#ffffff" />
                </View>
              )}
              <View className="absolute bottom-1 right-1 h-8 w-8 items-center justify-center rounded-full bg-[#2196F3]">
                <MaterialIcons name="camera-alt" size={18} color="#fff" />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View className="space-y-5">
          <View>
            <Text className="mb-2 text-sm font-semibold text-gray-400">First Name</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter first name"
              placeholderTextColor="#999"
              className="rounded-xl bg-[#252525] p-4 text-white"
            />
          </View>

          <View>
            <Text className="mb-2 text-sm font-semibold text-gray-400">Last Name</Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter last name"
              placeholderTextColor="#999"
              className="rounded-xl bg-[#252525] p-4 text-white"
            />
          </View>

          <View>
            <Text className="mb-2 text-sm font-semibold text-gray-400">Contact</Text>
            <TextInput
              value={contact}
              editable={false}
              className="rounded-xl bg-[#252525] p-4 text-gray-400"
            />
          </View>

          {/* State Picker */}
          <View>
            <Text className="mb-2 text-sm font-semibold text-gray-400">State</Text>
            <View className="overflow-hidden rounded-xl border border-gray-700 bg-[#1f2937]">
              {loadingStates ? (
                <ActivityIndicator className="p-3" color="#2196F3" />
              ) : (
                <Picker
                  selectedValue={selectedStateId}
                  onValueChange={(val) => setSelectedStateId(String(val))}
                  style={{ color: '#fff' }}
                  dropdownIconColor="#9CA3AF">
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
            <Text className="mb-2 text-sm font-semibold text-gray-400">District</Text>
            <View className="overflow-hidden rounded-xl border border-gray-700 bg-[#1f2937]">
              {loadingCities ? (
                <ActivityIndicator className="p-3" color="#2196F3" />
              ) : (
                <Picker
                  selectedValue={selectedCityId}
                  onValueChange={(val) => setSelectedCityId(String(val))}
                  style={{ color: '#fff' }}
                  dropdownIconColor="#9CA3AF"
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
            <Text className="mb-2 text-sm font-semibold text-gray-400">Block</Text>
            <View className="overflow-hidden rounded-xl border border-gray-700 bg-[#1f2937]">
              {loadingBlocks ? (
                <ActivityIndicator className="p-3" color="#2196F3" />
              ) : (
                <Picker
                  selectedValue={selectedBlockId}
                  onValueChange={(val) => setSelectedBlockId(String(val))}
                  style={{ color: '#fff' }}
                  dropdownIconColor="#9CA3AF"
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
            <Text className="mb-2 text-sm font-semibold text-gray-400">Village</Text>
            <View className="overflow-hidden rounded-xl border border-gray-700 bg-[#1f2937]">
              {loadingVillages ? (
                <ActivityIndicator className="p-3" color="#2196F3" />
              ) : (
                <Picker
                  selectedValue={selectedVillageId}
                  onValueChange={(val) => setSelectedVillageId(String(val))}
                  style={{ color: '#fff' }}
                  dropdownIconColor="#9CA3AF"
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
          disabled={saving}
          onPress={handleSave}
          activeOpacity={0.9}
          className="mt-8 h-12 w-full items-center justify-center rounded-xl bg-[#2196F3]">
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
