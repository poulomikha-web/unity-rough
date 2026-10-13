import { JourneyProvider } from '@/lib/JourneyContext';
import { JourneyRoot } from '@/components/JourneyRoot';

export default function Page() {
  return (
    <JourneyProvider>
      <JourneyRoot />
    </JourneyProvider>
  );
}
