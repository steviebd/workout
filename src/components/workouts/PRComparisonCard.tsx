import { Trophy } from 'lucide-react';
import type { PRComparison } from '~/lib/workout-summary';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/Card';
import { cn } from '~/lib/cn';
import { useUnit } from '@/lib/context/UserPreferencesContext';

interface PRComparisonCardProps {
  comparisonData: PRComparison[];
}

function PRComparisonItem({ item, formatWeight }: { item: PRComparison; formatWeight: (w: number) => string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold">{item.exerciseName}</span>
        {item.isNewRecord ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-transparent bg-success/20 px-2.5 py-0.5 text-xs font-semibold text-success">
            <Trophy className="h-3 w-3" />
            New Record!
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-4 p-3 bg-secondary/30 rounded-lg">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Previous Best</p>
          <p className="font-semibold text-lg">
            {item.historicalPR ? formatWeight(item.historicalPR.weight) : '—'}
          </p>
          {item.historicalPR ? (
            <p className="text-xs text-muted-foreground">
              {item.historicalPR.reps} rep{item.historicalPR.reps > 1 ? 's' : ''} · Est. 1RM: {item.historicalPR.e1rm} kg
            </p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground mb-1">Today's Best</p>
          <p className={cn("font-semibold text-lg", item.isNewRecord ? "text-achievement" : "")}>
            {formatWeight(item.weight)}
          </p>
          <p className={cn("text-xs", item.isNewRecord ? "text-achievement" : "text-muted-foreground")}>
            {item.reps} rep{item.reps > 1 ? 's' : ''} · Est. 1RM: {item.estimatedE1RM} kg
          </p>
          {item.isNewRecord && item.historicalPR ? (
            <p className="text-xs text-success font-medium">
              +{formatWeight(item.weight - item.historicalPR.weight)} weight
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function PRComparisonCard({ comparisonData }: PRComparisonCardProps) {
  const { formatWeight } = useUnit();

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-5 w-5 text-achievement" />
          Personal Records
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          We are working on providing more accurate estimated 1RM calculations.
        </p>
        {comparisonData.map((item) => (
          <PRComparisonItem key={item.exerciseName} item={item} formatWeight={formatWeight} />
        ))}
      </CardContent>
    </Card>
  );
}
