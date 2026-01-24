import React from 'react';
import { View, Text, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../context/ThemeContext';

interface AppHeaderProps {
  title: string;
  iconName?: keyof typeof MaterialIcons.glyphMap;
  rightIconName?: keyof typeof MaterialIcons.glyphMap;
  onRightPress?: () => void;
  showBackButton?: boolean;
  onBackPress?: () => void;
  subtitle?: string;
}

export default function AppHeader({
  title,
  iconName,
  rightIconName,
  onRightPress,
  showBackButton = false,
  onBackPress,
  subtitle,
}: AppHeaderProps) {
  const { colors } = useAppTheme();

  // Calculate safe area padding for iOS notch/Dynamic Island
  const statusBarHeight =
    Platform.OS === 'ios' ? StatusBar.currentHeight || 44 : StatusBar.currentHeight || 0;
  const paddingTop = Platform.OS === 'ios' ? statusBarHeight : statusBarHeight + 8;

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingTop,
        paddingBottom: 12,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
      }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 44,
        }}>
        {/* Left Section - Back button OR icon */}
        <View
          style={{
            width: 44,
            height: 44,
            justifyContent: 'center',
            alignItems: 'flex-start',
          }}>
          {showBackButton ? (
            <TouchableOpacity
              onPress={onBackPress}
              style={{
                width: 44,
                height: 44,
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: 22,
              }}
              activeOpacity={0.6}
              accessibilityLabel="Go back"
              accessibilityRole="button">
              <MaterialIcons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ) : iconName ? (
            <View
              style={{
                width: 44,
                height: 44,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <MaterialIcons name={iconName} size={24} color={colors.text} />
            </View>
          ) : null}
        </View>

        {/* Center - Title & Subtitle */}
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            marginHorizontal: 12,
          }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: colors.text,
              letterSpacing: 0.2,
            }}
            numberOfLines={1}
            ellipsizeMode="tail">
            {title}
          </Text>
          {subtitle && (
            <Text
              style={{
                fontSize: 12,
                color: colors.textSecondary || colors.text,
                opacity: 0.7,
                marginTop: 2,
              }}
              numberOfLines={1}
              ellipsizeMode="tail">
              {subtitle}
            </Text>
          )}
        </View>

        {/* Right Section - Action Icon */}
        <View
          style={{
            width: 44,
            height: 44,
            justifyContent: 'center',
            alignItems: 'flex-end',
          }}>
          {rightIconName && onRightPress && (
            <TouchableOpacity
              onPress={onRightPress}
              style={{
                width: 44,
                height: 44,
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: 22,
              }}
              activeOpacity={0.6}
              accessibilityLabel={`${rightIconName} button`}
              accessibilityRole="button">
              <MaterialIcons name={rightIconName} size={24} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}
