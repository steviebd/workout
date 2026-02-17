import { Link } from '@tanstack/react-router';
import { Calendar } from 'lucide-react';
import { Card } from '~/components/ui/Card';
import { Badge } from '~/components/ui/Badge';
import { useDateFormat } from '@/lib/context/DateFormatContext';

export interface ExerciseItemProps {
  id: string;
  name: string;
  muscleGroup: string | null;
  description: string | null;
  createdAt: string;
}

export function ExerciseItem({ id, name, muscleGroup, description, createdAt }: ExerciseItemProps) {
  const { formatDate } = useDateFormat();

  return (
    <Link to="/exercises/$id" params={{ id }}>
      <Card className="p-4 hover:border-primary/50 transition-colors cursor-pointer touch-manipulation">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-base font-semibold line-clamp-1">{name}</h3>
          {muscleGroup ? <Badge variant="secondary">{muscleGroup}</Badge> : null}
        </div>
        {description ? <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{description}</p> : null}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center text-xs text-muted-foreground">
            <Calendar className="mr-1 h-3 w-3" />
            {formatDate(createdAt)}
          </div>
          <span className="text-xs text-primary font-medium">View Details</span>
        </div>
      </Card>
    </Link>
  );
}
