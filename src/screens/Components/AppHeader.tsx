// components/AppHeader.tsx
import React from 'react';
import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface AppHeaderProps {
  title: string;
  iconName?: keyof typeof MaterialIcons.glyphMap;
  rightIconName?: keyof typeof MaterialIcons.glyphMap;
  onRightPress?: () => void;
  showBackButton?: boolean;
  onBackPress?: () => void;
}

export default function AppHeader({
  title,
  iconName,
  rightIconName,
  onRightPress,
  showBackButton = false,
  onBackPress,
}: AppHeaderProps) {
  const isDark = useColorScheme() === 'dark';

  return (
    <View
      className={`flex-row items-center justify-between px-5 pb-5 pt-16 ${
        isDark ? 'bg-[#252525]' : 'bg-gray-100'
      }`}>
      {/* Left Section */}
      <View className="flex-row items-center gap-3">
        {showBackButton && (
          <TouchableOpacity onPress={onBackPress} className="mr-1">
            <MaterialIcons name="arrow-back-ios" size={22} color="#2196F3" />
          </TouchableOpacity>
        )}
        {iconName && <MaterialIcons name={iconName} size={24} color="#2196F3" />}
        <Text className="text-2xl font-bold text-black dark:text-white">{title}</Text>
      </View>

      {/* Right Icon (optional) */}
      {rightIconName && (
        <TouchableOpacity onPress={onRightPress} activeOpacity={0.8}>
          <MaterialIcons name={rightIconName} size={24} color="#2196F3" />
        </TouchableOpacity>
      )}
    </View>
  );
}
