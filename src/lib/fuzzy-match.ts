export interface ExerciseLibraryItem {
  id: string;
  name: string;
  muscleGroup: string;
  description: string;
}

export interface FuzzyMatchResult {
  score: number;
  isMatch: boolean;
  matchedItem?: ExerciseLibraryItem;
}

export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const matrix: number[][] = [];

  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const maxLength = Math.max(s1.length, s2.length);
  return maxLength === 0 ? 1 : 1 - matrix[s1.length][s2.length] / maxLength;
}

export function findSimilarLibraryExercise(
  name: string,
  muscleGroup: string,
  library: ExerciseLibraryItem[],
  threshold = 0.70
): FuzzyMatchResult {
  let bestMatch: FuzzyMatchResult = { score: 0, isMatch: false };

  for (const item of library) {
    const nameSimilarity = calculateSimilarity(name, item.name);
    const muscleSimilarity = calculateSimilarity(muscleGroup, item.muscleGroup);

    const combinedScore = nameSimilarity * 0.7 + muscleSimilarity * 0.3;

    if (combinedScore > bestMatch.score) {
      const isMatch = combinedScore >= threshold;

      bestMatch = {
        score: combinedScore,
        isMatch,
        matchedItem: isMatch ? item : undefined
      };
    }
  }

  return bestMatch;
}


