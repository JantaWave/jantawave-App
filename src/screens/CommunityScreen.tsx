import React from 'react';
import { View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import AppHeader from './Components/AppHeader';
import LeaderCommunityScreen from './LeaderCommunityScreen';
import AudienceCommunityScreen from './AudienceCommunityScreen';

export default function CommunityScreen() {
  const { user, isLeaderMode, activeRole } = useAuth();
  const isStreamer = user.role === 'leader';

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark">
      {/* ✅ Header loaded only once */}
      <AppHeader title="Community" iconName="group" />

      {/* ✅ Mode-based content */}
      {isStreamer && isLeaderMode() ? <LeaderCommunityScreen /> : <AudienceCommunityScreen />}
    </View>
  );
}
