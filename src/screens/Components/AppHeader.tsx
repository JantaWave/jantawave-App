import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../context/ThemeContext';

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
  const { colors } = useAppTheme();

  return (
    <View className="flex-row items-center justify-between border-b border-border-light bg-surface-light px-5 pb-5 pt-16 dark:border-border-dark dark:bg-surface-dark">
      {/* Left Section */}
      <View className="flex-row items-center gap-3">
        {showBackButton && (
          <TouchableOpacity onPress={onBackPress} className="mr-1">
            <MaterialIcons name="arrow-back-ios" size={22} color={colors.primary} />
          </TouchableOpacity>
        )}
        {iconName && <MaterialIcons name={iconName} size={24} color={colors.primary} />}
        <Text className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
          {title}
        </Text>
      </View>

      {/* Right Icon */}
      {rightIconName && (
        <TouchableOpacity
          onPress={onRightPress}
          activeOpacity={0.8}
          className="rounded-full bg-surfaceHighlight-light p-2 dark:bg-surfaceHighlight-dark">
          <MaterialIcons name={rightIconName} size={22} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}
