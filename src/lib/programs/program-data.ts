import type { ProgramListItem, ProgramCategory } from './types';

const createProgram = (
  slug: string,
  name: string,
  description: string,
  difficulty: ProgramListItem['difficulty'],
  daysPerWeek: number,
  estimatedWeeks: number,
  category: ProgramCategory
): ProgramListItem => ({
  slug,
  name,
  description,
  difficulty,
  daysPerWeek,
  estimatedWeeks,
  category,
});

export const PROGRAMS: ProgramListItem[] = [
  createProgram(
    'stronglifts-5x5',
    'StrongLifts 5×5',
    'The classic beginner program that has helped millions get stronger. Simple, effective, and proven.',
    'beginner',
    3,
    8,
    'general-strength'
  ),
  createProgram(
    '531',
    '5/3/1 (Wendler)',
    'The most popular strength program ever created. Flexible, sustainable, and proven to work.',
    'intermediate',
    4,
    12,
    'powerlifting'
  ),
  createProgram(
    'madcow-5x5',
    'Madcow 5×5',
    'Bridge from beginner to advanced. Built-in deloads and weekly weight increases.',
    'intermediate',
    3,
    8,
    'powerlifting'
  ),
  createProgram(
    'candito-6-week',
    'Candito 6 Week',
    'Block periodization with strength and peaking phases. Great for meet preparation.',
    'intermediate',
    4,
    6,
    'powerlifting'
  ),
  createProgram(
    'nsuns-lp',
    'nSuns LP',
    'High volume linear progression. Excellent for building base strength.',
    'intermediate',
    4,
    8,
    'powerlifting'
  ),
  createProgram(
    'sheiko',
    'Sheiko',
    'Russian-style programming. High volume at moderate intensity for technique work.',
    'advanced',
    4,
    8,
    'powerlifting'
  ),
  createProgram(
    'nuckols-28-programs',
    'Greg Nuckols 28 Programs',
    'Science-backed programming with multiple variations for different levels.',
    'intermediate',
    3,
    8,
    'general-strength'
  ),
  createProgram(
    'stronger-by-the-day',
    'Stronger by the Day (Megsquats)',
    'A 12-week upper/lower split program designed specifically for women, featuring training max progression and glute-focused accessories.',
    'beginner',
    3,
    12,
    "women's"
  ),
  createProgram(
    'unapologetically-strong',
    'Unapologetically Strong (Jen Sinkler)',
    'An 8-week full body strength program designed to build a solid foundation of power and confidence.',
    'intermediate',
    3,
    8,
    "women's"
  ),
];

export function getProgramBySlug(slug: string): ProgramListItem | undefined {
  return PROGRAMS.find((p) => p.slug === slug);
}

export function getAllPrograms(): ProgramListItem[] {
  return PROGRAMS;
}
