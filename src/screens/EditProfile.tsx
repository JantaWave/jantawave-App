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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { useToast } from 'react-native-toast-notifications';
import { getStates, getCities, getBlocks, getVillages } from '@/src/api/auth';
import { getPresignedUrl, deleteFromR2 } from '@/src/api';
import { updateUserProfile } from '../api/user';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const { isDark } = useAppTheme();
  const Toast = useToast();
  const insets = useSafeAreaInsets();

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [contact] = useState(user?.contact || '');
  const [imageUri, setImageUri] = useState(user?.avatar_url || null);
  const [tempImageUri, setTempImageUri] = useState(null); // Temporary uploaded image
  const [tempImageKey, setTempImageKey] = useState(null); // Key for cleanup
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Lists
  const [statesList, setStatesList] = useState([]);
  const [citiesList, setCitiesList] = useState([]);
  const [blocksList, setBlocksList] = useState([]);
  const [villagesList, setVillagesList] = useState([]);

  // Selected IDs
  const [selectedStateId, setSelectedStateId] = useState(null);
  const [selectedCityId, setSelectedCityId] = useState(null);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [selectedVillageId, setSelectedVillageId] = useState(null);

  // Loading flags
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [loadingVillages, setLoadingVillages] = useState(false);

  // Initialize Data (Run once on mount)
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoadingStates(true);
        const res = await getStates();
        const fetchedStates = res?.data || [];
        setStatesList(fetchedStates);

        // FIX 1: Try finding by ID first (more reliable), then by Name
        const currentState = fetchedStates.find(
          (s) =>
            String(s.state_id) === String(user?.state_id) || // Check ID first
            s.state_name?.toLowerCase() === user?.state_name?.toLowerCase()
        );

        if (currentState) {
          // FIX 2: Convert ID to String explicitly
          const stateIdString = String(currentState.state_id);
          setSelectedStateId(stateIdString);

          // Pass the corrected string ID to fetchCities
          await fetchCities(stateIdString, user);
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

    // Cleanup temp image on unmount if not saved
    return () => {
      if (tempImageKey && tempImageUri !== imageUri) {
        deleteFromR2(tempImageKey).catch(console.error);
      }
    };
  }, []);

  // --- API Fetch Functions ---

  const fetchCities = async (stateId, userData = null) => {
    try {
      setLoadingCities(true);
      const res = await getCities(stateId);
      const fetchedCities = res?.data || [];
      setCitiesList(fetchedCities);

      if (userData) {
        const currentCity = fetchedCities.find(
          (c) => c.district_name?.toLowerCase() === userData?.district_name?.toLowerCase()
        );
        if (currentCity) {
          setSelectedCityId(currentCity.district_id);
          await fetchBlocks(currentCity.district_id, userData);
        }
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLoadingCities(false);
    }
  };

  const fetchBlocks = async (districtId, userData = null) => {
    try {
      setLoadingBlocks(true);
      const res = await getBlocks(districtId);
      const fetchedBlocks = res?.data || [];
      setBlocksList(fetchedBlocks);

      if (userData) {
        const currentBlock = fetchedBlocks.find(
          (b) => b.block_name?.toLowerCase() === userData?.block_name?.toLowerCase()
        );
        if (currentBlock) {
          setSelectedBlockId(currentBlock.block_id);
          await fetchVillages(currentBlock.block_id, userData);
        }
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLoadingBlocks(false);
    }
  };

  const fetchVillages = async (blockId, userData = null) => {
    try {
      setLoadingVillages(true);
      const res = await getVillages(blockId);
      const fetchedVillages = res?.data || [];
      setVillagesList(fetchedVillages);

      if (userData) {
        const currentVillage = fetchedVillages.find(
          (v) => v.village_name?.toLowerCase() === userData?.village_name?.toLowerCase()
        );
        if (currentVillage) {
          setSelectedVillageId(currentVillage.village_id);
        }
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLoadingVillages(false);
    }
  };

  // --- Dropdown Handlers ---

  const handleStateChange = (val) => {
    if (val === null) return;

    setSelectedStateId(val);

    setSelectedCityId(null);
    setSelectedBlockId(null);
    setSelectedVillageId(null);

    setCitiesList([]);
    setBlocksList([]);
    setVillagesList([]);

    fetchCities(val);
  };

  const handleCityChange = (val) => {
    if (val === null) return;

    setSelectedCityId(val);

    setSelectedBlockId(null);
    setSelectedVillageId(null);

    setBlocksList([]);
    setVillagesList([]);

    fetchBlocks(val);
  };

  const handleBlockChange = (val) => {
    if (val === null) return;

    setSelectedBlockId(val);

    setSelectedVillageId(null);
    setVillagesList([]);

    fetchVillages(val);
  };

  const handleVillageChange = (val) => {
    if (val === null) return;
    setSelectedVillageId(val);
  };

  // --- Image Logic ---

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
        const MAX_SIZE = 16 * 1024 * 1024;
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

  const uploadToR2 = async (uri) => {
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

        // Store as temporary image
        setTempImageUri(finalUrl);
        setTempImageKey(fileName);
        setImageUri(finalUrl);

        Toast.show('Photo selected! Remember to save changes.', { type: 'info' });
      } else {
        throw new Error(`Upload failed with status ${uploadResponse.status}`);
      }
    } catch (error) {
      console.error('Upload Error:', error);
      Alert.alert('Error', 'Failed to upload profile photo. ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    Alert.alert('Delete Avatar', 'Are you sure you want to remove your profile photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleting(true);

            // If there's an avatar URL, extract the key and delete from bucket
            if (imageUri && user?.avatar_url) {
              const urlParts = imageUri.split('/');
              const fileKey = urlParts[urlParts.length - 1];
              if (fileKey) {
                await deleteFromR2(fileKey);
              }
            }

            setImageUri(null);
            setTempImageUri(null);
            setTempImageKey(null);
            Toast.show('Avatar removed', { type: 'success' });
          } catch (error) {
            console.error('Delete Error:', error);
            Toast.show('Failed to delete avatar', { type: 'danger' });
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Prepare update payload
      const updatePayload = {
        first_name: firstName,
        last_name: lastName,
        avatar_url: imageUri,
        village: selectedVillageId,
      };

      const response = await updateUserProfile(updatePayload);

      if (updateUser && response?.data?.user) {
        updateUser(response.data.user);
      }

      // Clear temp image tracking since it's now saved
      setTempImageUri(null);
      setTempImageKey(null);

      Toast.show('Profile updated successfully!', { type: 'success' });
      router.back();
    } catch (err) {
      console.error('Save Error:', err);
      Toast.show(err.response?.data?.message || 'Failed to update profile', { type: 'danger' });

      // If save failed and we have a temp image, clean it up
      if (tempImageKey) {
        deleteFromR2(tempImageKey).catch(console.error);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark">
      {/* Header */}
      <View
        className="flex-row items-center justify-between bg-gray-100 px-5 pb-5 dark:bg-[#1a1a1a]"
        style={{ paddingTop: Math.max(insets.top, 20) + 10 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back-ios" size={22} color="#2196F3" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-black dark:text-white">Edit Profile</Text>
        <View className="w-6" />
      </View>

      {/* Content ScrollView */}
      <ScrollView
        className="flex-1 px-5 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Profile Picture */}
        <View className="mb-8 items-center">
          <TouchableOpacity
            onPress={pickImage}
            activeOpacity={0.8}
            disabled={uploading || deleting}>
            <View className="relative">
              {imageUri ? (
                <Image source={{ uri: imageUri }} className="h-28 w-28 rounded-full" />
              ) : (
                <View className="h-28 w-28 items-center justify-center rounded-full bg-blue-500">
                  <MaterialIcons name="person" size={56} color="#ffffff" />
                </View>
              )}
              {uploading || deleting ? (
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
          {imageUri && (
            <TouchableOpacity onPress={handleDeleteAvatar} disabled={deleting} className="mt-2">
              <Text className="text-xs text-red-500">Remove Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Form Fields */}
        <View className="gap-y-5">
          {/* Name & Contact Fields */}
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
                  key={`state-${statesList.length}`}
                  selectedValue={selectedStateId}
                  onValueChange={handleStateChange}
                  style={{ color: isDark ? '#fff' : '#000' }}>
                  {selectedStateId === null && <Picker.Item label="Select State" value={null} />}

                  {statesList.map((s) => (
                    <Picker.Item key={s.state_id} label={s.state_name} value={String(s.state_id)} />
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
                  key={`district-${selectedStateId}`}
                  selectedValue={selectedCityId}
                  onValueChange={handleCityChange}
                  enabled={selectedStateId !== null}
                  style={{ color: isDark ? '#fff' : '#000' }}>
                  {selectedCityId === null && <Picker.Item label="Select District" value={null} />}

                  {citiesList.map((c) => (
                    <Picker.Item
                      key={c.district_id}
                      label={c.district_name}
                      value={String(c.district_id)}
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
                  key={`block-${selectedCityId}`}
                  selectedValue={selectedBlockId}
                  onValueChange={handleBlockChange}
                  enabled={selectedCityId !== null}
                  style={{ color: isDark ? '#fff' : '#000' }}>
                  {selectedBlockId === null && <Picker.Item label="Select Block" value={null} />}

                  {blocksList.map((b) => (
                    <Picker.Item key={b.block_id} label={b.block_name} value={String(b.block_id)} />
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
                  key={`village-${selectedBlockId}`}
                  selectedValue={selectedVillageId}
                  onValueChange={handleVillageChange}
                  enabled={selectedBlockId !== null}
                  style={{ color: isDark ? '#fff' : '#000' }}>
                  {selectedVillageId === null && (
                    <Picker.Item label="Select Village" value={null} />
                  )}

                  {villagesList.map((v) => (
                    <Picker.Item
                      key={v.village_id}
                      label={v.village_name}
                      value={String(v.village_id)}
                    />
                  ))}
                </Picker>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer Button */}
      <View
        className="border-t border-gray-100 bg-white px-5 pt-3 dark:border-gray-800 dark:bg-[#0a0a0a]"
        style={{ paddingBottom: Math.max(insets.bottom, 20) }}>
        <TouchableOpacity
          disabled={saving || uploading}
          onPress={handleSave}
          activeOpacity={0.9}
          className="h-14 w-full items-center justify-center rounded-xl bg-blue-500 shadow-sm disabled:opacity-50">
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-base font-bold text-white">Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
