import type { ProgramListItem } from './types';

export const PROGRAMS: ProgramListItem[] = [
  {
    slug: 'stronglifts-5x5',
    name: 'StrongLifts 5×5',
    description: 'The classic beginner program that has helped millions get stronger. Simple, effective, and proven.',
    difficulty: 'beginner',
    daysPerWeek: 3,
    estimatedWeeks: 8,
  },
  {
    slug: '531',
    name: '5/3/1 (Wendler)',
    description: 'The most popular strength program ever created. Flexible, sustainable, and proven to work.',
    difficulty: 'intermediate',
    daysPerWeek: 4,
    estimatedWeeks: 12,
  },
  {
    slug: 'madcow-5x5',
    name: 'Madcow 5×5',
    description: 'Bridge from beginner to advanced. Built-in deloads and weekly weight increases.',
    difficulty: 'intermediate',
    daysPerWeek: 3,
    estimatedWeeks: 8,
  },
  {
    slug: 'candito-6-week',
    name: 'Candito 6 Week',
    description: 'Block periodization with strength and peaking phases. Great for meet preparation.',
    difficulty: 'intermediate',
    daysPerWeek: 4,
    estimatedWeeks: 6,
  },
  {
    slug: 'nsuns-lp',
    name: 'nSuns LP',
    description: 'High volume linear progression. Excellent for building base strength.',
    difficulty: 'intermediate',
    daysPerWeek: 4,
    estimatedWeeks: 8,
  },
  {
    slug: 'sheiko',
    name: 'Sheiko',
    description: 'Russian-style programming. High volume at moderate intensity for technique work.',
    difficulty: 'advanced',
    daysPerWeek: 4,
    estimatedWeeks: 8,
  },
  {
    slug: 'nuckols-28-programs',
    name: 'Greg Nuckols 28 Programs',
    description: 'Science-backed programming with multiple variations for different levels.',
    difficulty: 'intermediate',
    daysPerWeek: 3,
    estimatedWeeks: 8,
  },
];

export function getProgramBySlug(slug: string): ProgramListItem | undefined {
  return PROGRAMS.find((p) => p.slug === slug);
}

export function getAllPrograms(): ProgramListItem[] {
  return PROGRAMS;
}
