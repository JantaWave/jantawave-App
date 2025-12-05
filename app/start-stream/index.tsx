import { useLocalSearchParams } from 'expo-router';
import StartStreamScreen from '@/src/screens/StartStreamScreen';

export default function Page() {
  const { sessionId, scheduledTime } = useLocalSearchParams();

  return <StartStreamScreen sessionId={sessionId} scheduledTime={scheduledTime} />;
}
