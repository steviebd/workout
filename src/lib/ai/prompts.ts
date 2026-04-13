import type { SystemPromptContext, TrainingContext } from '~/lib/db/nutrition';

function buildTrainingSection(tc: TrainingContext | null): string {
  if (!tc) {
    return `TODAY'S TRAINING:
- Training type: No training context set`;
  }

  let section = `TODAY'S TRAINING:
- Training type: ${tc.type}`;

  if (tc.programName) {
    section += `\n- Program: ${tc.programName}`;
  }
  if (tc.sessionName) {
    section += `\n- Session: ${tc.sessionName}`;
  }
  if (tc.targetLifts) {
    section += `\n- Target lifts: ${tc.targetLifts}`;
  }
  if (tc.type === 'custom' && tc.customLabel) {
    section += `\n- Custom label: ${tc.customLabel}`;
  }

  return section;
}

function buildWhoopSection(data: {
  recoveryScore: number | null;
  recoveryStatus: string | null;
  hrv: number | null;
  restingHeartRate: number | null;
  caloriesBurned: number | null;
  totalStrain: number | null;
}): string {
  const hasWhoop = data.recoveryScore !== null || data.caloriesBurned !== null;

  if (!hasWhoop) {
    return `RECOVERY (from Whoop):
No Whoop data available — assume moderate recovery`;
  }

  let section = `RECOVERY (from Whoop):`;

  if (data.recoveryScore !== null) {
    const status = data.recoveryStatus ?? 'unknown';
    section += `\n- Recovery score: ${data.recoveryScore}% (${status})`;
  }

  if (data.hrv !== null) {
    section += `\n- HRV: ${data.hrv} ms`;
  }

  if (data.restingHeartRate !== null) {
    section += `\n- Resting HR: ${data.restingHeartRate} bpm`;
  }

  if (data.caloriesBurned !== null) {
    section += `\n- Calories burned today: ${data.caloriesBurned} kcal`;
  }

  if (data.totalStrain !== null) {
    section += `\n- Total strain: ${data.totalStrain}`;
  }

  return section;
}

function buildIntakeSection(
  intake: { totalCalories: number; totalProteinG: number; totalCarbsG: number; totalFatG: number },
  targets: { calories: number; proteinG: number; carbsG: number; fatG: number },
  energyUnit: 'kcal' | 'kj'
): string {
  const calUnit = energyUnit === 'kj' ? 'kJ' : 'kcal';
  const intakeCals = energyUnit === 'kj' ? Math.round(intake.totalCalories * 4.184) : Math.round(intake.totalCalories);
  const targetCals = energyUnit === 'kj' ? Math.round(targets.calories * 4.184) : targets.calories;

  return `DAILY INTAKE SO FAR:
- Calories: ${intakeCals} / ${targetCals} ${calUnit}
- Protein: ${Math.round(intake.totalProteinG)}g / ${targets.proteinG}g
- Carbs: ${Math.round(intake.totalCarbsG)}g / ${targets.carbsG}g
- Fat: ${Math.round(intake.totalFatG)}g / ${targets.fatG}g`;
}

function buildTargetsSection(
  targets: { calories: number; proteinG: number; carbsG: number; fatG: number },
  bodyweightKg: number | null,
  energyUnit: 'kcal' | 'kj'
): string {
  const calUnit = energyUnit === 'kj' ? 'kJ' : 'kcal';
  const calDisplay = energyUnit === 'kj' ? Math.round(targets.calories * 4.184) : targets.calories;

  let section = `MACRO TARGETS (powerlifting-focused defaults):`;

  if (bodyweightKg) {
    section += `\n- Protein: 2.0g per kg bodyweight`;
    section += `\n- Fat: 0.8g per kg bodyweight`;
    section += `\n- Carbs: fill remaining calories`;
    section += `\n- Adjusted for training day intensity (+10-15% on heavy days, -5% on rest days)`;
  } else {
    section += `\n- (Set bodyweight to calculate targets)`;
  }

  section += `\n- Total target: ${calDisplay} ${calUnit}/day`;

  return section;
}

export function assembleSystemPrompt(context: SystemPromptContext): string {
  const {
    bodyweightKg,
    energyUnit,
    weightUnit,
    trainingContext,
    whoopData,
    dailyIntake,
    macroTargets,
  } = context;

  const bwDisplay = bodyweightKg
    ? `${bodyweightKg} ${weightUnit}`
    : 'not recorded';

  const trainingSection = buildTrainingSection(trainingContext);
  const whoopSection = buildWhoopSection(whoopData);
  const intakeSection = buildIntakeSection(dailyIntake, macroTargets, energyUnit);
  const targetsSection = buildTargetsSection(macroTargets, bodyweightKg, energyUnit);

  return `You are a nutrition assistant for a powerlifter using the Fit workout app.

USER CONTEXT:
- Bodyweight: ${bwDisplay}
- Energy unit preference: ${energyUnit}
- Weight unit preference: ${weightUnit}

${trainingSection}

${whoopSection}

${intakeSection}

${targetsSection}

When analysing food images, return structured estimates for calories, protein, carbs, and fat in a conversational response.
Always respond in the user's preferred energy unit.`.trim();
}
