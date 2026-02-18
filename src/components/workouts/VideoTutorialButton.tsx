import { Play } from 'lucide-react';
import type { VideoTutorial } from '~/lib/db/exercise/library';
import { Button } from '~/components/ui/Button';

interface VideoTutorialButtonProps {
  videoTutorial: VideoTutorial;
  exerciseName: string;
  onClick?: () => void;
}

export function VideoTutorialButton({ videoTutorial, exerciseName, onClick }: VideoTutorialButtonProps) {
  if (!videoTutorial) return null;

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={onClick}
      aria-label={`Watch tutorial for ${exerciseName}`}
      title={`Watch tutorial: ${videoTutorial.title}`}
    >
      <Play className="h-4 w-4" />
    </Button>
  );
}
