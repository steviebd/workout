import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import type { ProgramCategory } from '~/lib/programs/types';
import { getAllPrograms } from '~/lib/programs';
import { Card } from '~/components/ui/Card';
import { Badge } from '~/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/Tabs';
import { PageLayout } from '~/components/ui/PageLayout';

function ProgramsIndex() {
  const programs = getAllPrograms();
  const [activeCategory, setActiveCategory] = useState<ProgramCategory | 'all'>('all');

  const categories: Array<{ value: ProgramCategory | 'all'; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'powerlifting', label: 'Powerlifting' },
    { value: 'general-strength', label: 'General Strength' },
    { value: "women's", label: "Women's" },
  ];

  const categoryColors: Record<ProgramCategory, 'default' | 'secondary' | 'outline'> = {
    powerlifting: 'outline',
    'general-strength': 'secondary',
    "women's": 'default',
  };

  const filteredPrograms = activeCategory === 'all'
    ? programs
    : programs.filter((p) => p.category === activeCategory);

  return (
    <PageLayout title="Programs" subtitle="Train with proven programs">
      <div className="px-4">
        <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as ProgramCategory | 'all')}>
          <TabsList className="w-full justify-start overflow-x-auto">
            {categories.map((cat) => (
              <TabsTrigger key={cat.value} value={cat.value}>
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 px-4">
        {filteredPrograms.map((program) => (
          <Link key={program.slug} to="/programs/$slug/start" params={{ slug: program.slug }}>
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-lg truncate">{program.name}</h3>
                  <Badge variant={categoryColors[program.category]}>
                    {program.category === "women's" ? "Women's" : program.category}
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
    </PageLayout>
  );
}

export const Route = createFileRoute('/programs/_index')({
  component: ProgramsIndex,
});

export default ProgramsIndex;
