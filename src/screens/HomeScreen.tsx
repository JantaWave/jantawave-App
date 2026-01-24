import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import HomeHeader from './Components/HomeHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
import LeaderHome from './LeaderHome';
import AudienceHome from './AudienceHome';

export default function Home() {
  const { user, isLoading, isLeaderMode } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background-light dark:bg-background-dark">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) return null;

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark">
      <HomeHeader />

      <View className="flex-1">
        {user.role === 'leader' && isLeaderMode() ? <LeaderHome /> : <AudienceHome />}
      </View>
    </View>
  );
}
