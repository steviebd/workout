import { Play, ExternalLink } from 'lucide-react';
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            {videoTutorial.title}
          </DialogTitle>
          <DialogDescription>Coach: {videoTutorial.coachName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
            <iframe
              src={`https://www.youtube.com/embed/${videoTutorial.youtubeId}`}
              title={videoTutorial.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen={true}
              className="w-full h-full"
            />
          </div>

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

          <a
            href={`https://www.youtube.com/watch?v=${videoTutorial.youtubeId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            Watch on YouTube
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
