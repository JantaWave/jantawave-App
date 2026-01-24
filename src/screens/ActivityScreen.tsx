import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import AudienceActivityScreen from './AudienceActivityScreen';
import LeaderActivityScreen from './LeaderActivityScreen';
import AppHeader from './Components/AppHeader';

export default function ActivityScreen() {
  const { user, isLoading, isLeaderMode } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background-light dark:bg-background-dark">
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (!user) return null;

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark">
      <AppHeader title="Activity" iconName="radio" />
      {user.role === 'leader' && isLeaderMode() ? (
        <LeaderActivityScreen />
      ) : (
        <AudienceActivityScreen />
      )}
    </View>
  );
}
