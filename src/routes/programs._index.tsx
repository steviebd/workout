import { createFileRoute, Link } from '@tanstack/react-router';
import { getAllPrograms } from '~/lib/programs';
import { PageHeader } from '~/components/PageHeader';
import { Card } from '~/components/ui/Card';
import { Badge } from '~/components/ui/Badge';

function ProgramsIndex() {
  const programs = getAllPrograms();

  const difficultyColors: Record<string, 'default' | 'secondary' | 'outline'> = {
    beginner: 'default',
    intermediate: 'secondary',
    advanced: 'outline',
  };

  return (
    <div className="flex flex-col gap-6 pb-20">
      <PageHeader title="Powerlifting Programs" subtitle="Train with proven programs" />

      <div className="grid gap-4 px-4">
        {programs.map((program) => (
          <Link key={program.slug} to="/programs/$slug" params={{ slug: program.slug }}>
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">{program.name}</h3>
                  <Badge variant={difficultyColors[program.difficulty]}>
                    {program.difficulty}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{program.description}</p>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{program.daysPerWeek} days/week</span>
                  <span>{program.estimatedWeeks} weeks</span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/programs/_index')({
  component: ProgramsIndex,
});

export default ProgramsIndex;
