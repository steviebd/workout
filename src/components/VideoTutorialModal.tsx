import { Play } from 'lucide-react';
import type { VideoTutorial } from '~/lib/exercise-library';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/Dialog';

interface VideoTutorialModalProps {
  videoTutorial: VideoTutorial;
  exerciseName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VideoTutorialModal({
  videoTutorial,
  exerciseName,
  open,
  onOpenChange,
}: VideoTutorialModalProps) {
  const videoUrl = videoTutorial.youtubeId.startsWith('http')
    ? videoTutorial.youtubeId
    : `https://www.youtube.com/shorts/${videoTutorial.youtubeId}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            {videoTutorial.title}
          </DialogTitle>
          <DialogDescription>Coach: {videoTutorial.coachName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
<a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-6 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
>
            <Play className="h-6 w-6" />
            Watch on YouTube
</a>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Key Cues for {exerciseName}</h4>
            <ul className="space-y-1">
              {videoTutorial.keyCues.map((cue, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary font-medium">•</span>
                  {cue}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
