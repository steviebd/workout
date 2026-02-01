import { createFileRoute, Link, Outlet, useParams } from '@tanstack/react-router';
import { getProgramBySlug } from '~/lib/programs';
import { PageHeader } from '~/components/PageHeader';
import { Card } from '~/components/ui/Card';
import { Badge } from '~/components/ui/Badge';
import { Button } from '~/components/ui/Button';

function ProgramDetail() {
  const params = useParams({ from: '/programs/$slug' });
  const program = getProgramBySlug(params.slug);

  if (!program) {
    return (
      <div className="p-4">
        <p>Program not found</p>
        <Link to="/programs">
          <Button variant="outline" className="mt-4">Back to Programs</Button>
        </Link>
      </div>
    );
  }

  const difficultyColors: Record<string, 'default' | 'secondary' | 'outline'> = {
    beginner: 'default',
    intermediate: 'secondary',
    advanced: 'outline',
  };

  return (
    <div className="flex flex-col gap-6 pb-20">
      <PageHeader 
        title={program.name} 
        subtitle={`${program.daysPerWeek} days/week • ${program.estimatedWeeks} weeks`}
      />

      <div className="px-4">
        <Card className="p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <Badge variant={difficultyColors[program.difficulty]}>
                {program.difficulty}
              </Badge>
            </div>
            
            <p className="text-muted-foreground">{program.description}</p>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">Frequency</p>
                <p className="font-semibold">{program.daysPerWeek} days/week</p>
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-semibold">{program.estimatedWeeks} weeks</p>
              </div>
            </div>

            <Link to="/programs/$slug/start" params={{ slug: params.slug }}>
              <Button className="w-full mt-4">
                Start Program
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      <Outlet />
    </div>
  );
}

export const Route = createFileRoute('/programs/$slug')({
  component: ProgramDetail,
});

export default ProgramDetail;
