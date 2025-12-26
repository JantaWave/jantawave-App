import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext'; // Import hook
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from './Components/AppHeader';

export default function SettingsScreen() {
  const router = useRouter();
  const { themeMode, setThemeMode, colors, isDark } = useAppTheme();

  const ThemeOption = ({
    mode,
    label,
    icon,
  }: {
    mode: 'light' | 'dark' | 'system';
    label: string;
    icon: keyof typeof Feather.glyphMap;
  }) => (
    <TouchableOpacity
      onPress={() => setThemeMode(mode)}
      className={`mb-3 flex-row items-center justify-between rounded-xl border p-4 ${
        themeMode === mode
          ? 'border-primary bg-blue-50 dark:bg-blue-900/20'
          : 'border-transparent bg-white dark:bg-surface-dark'
      }`}>
      <View className="flex-row items-center gap-3">
        <Feather name={icon} size={20} color={themeMode === mode ? colors.primary : colors.text} />
        <Text
          className={`text-base font-medium ${themeMode === mode ? 'text-primary' : 'text-text-primary-light dark:text-text-primary-dark'}`}>
          {label}
        </Text>
      </View>
      {themeMode === mode && <MaterialIcons name="check-circle" size={20} color={colors.primary} />}
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark">
      <AppHeader title="Settings" showBackButton onBackPress={() => router.back()} />

      <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
        {/* Appearance Section */}
        <Text className="mb-4 text-sm font-bold uppercase tracking-wider text-text-secondary-light dark:text-text-secondary-dark">
          Appearance
        </Text>

        <View className="mb-6">
          <ThemeOption mode="light" label="Light Mode" icon="sun" />
          <ThemeOption mode="dark" label="Dark Mode" icon="moon" />
          <ThemeOption mode="system" label="System Default" icon="smartphone" />
        </View>

        {/* General Section */}
        <Text className="mb-4 text-sm font-bold uppercase tracking-wider text-text-secondary-light dark:text-text-secondary-dark">
          General
        </Text>

        <View className="overflow-hidden rounded-xl bg-white dark:bg-surface-dark">
          <View className="flex-row items-center justify-between border-b border-border-light p-4 dark:border-border-dark">
            <Text className="text-base font-medium text-text-primary-light dark:text-text-primary-dark">
              Push Notifications
            </Text>
            <Switch trackColor={{ true: colors.primary }} value={true} />
          </View>
          <TouchableOpacity className="flex-row items-center justify-between p-4">
            <Text className="text-base font-medium text-text-primary-light dark:text-text-primary-dark">
              Privacy Policy
            </Text>
            <MaterialIcons name="chevron-right" size={24} color={colors.icon} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
