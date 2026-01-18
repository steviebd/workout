export interface ExerciseLibraryItem {
  name: string;
  muscleGroup: string;
  description: string;
}

export const exerciseLibrary: ExerciseLibraryItem[] = [
  // Chest
  { name: 'Barbell Bench Press', muscleGroup: 'Chest', description: 'A compound exercise where you lie on a bench and press a barbell up from chest level, primarily targeting the pectoralis major.' },
  { name: 'Dumbbell Bench Press', muscleGroup: 'Chest', description: 'A compound chest exercise performed on a bench using dumbbells, allowing for a greater range of motion and independent arm movement.' },
  { name: 'Incline Dumbbell Press', muscleGroup: 'Chest', description: 'A variation of the bench press performed on an incline bench, emphasizing the upper portion of the pectoralis major.' },
  { name: 'Cable Fly', muscleGroup: 'Chest', description: 'An isolation exercise using cables to maintain constant tension while bringing hands together in front of the chest, targeting the pectorals.' },
  { name: 'Push-ups', muscleGroup: 'Chest', description: 'A bodyweight exercise where you push yourself up from the ground, primarily working the chest, shoulders, and triceps.' },
  { name: 'Dips', muscleGroup: 'Chest', description: 'A compound exercise performed on parallel bars, leaning forward emphasizes chest involvement while upright targets triceps more.' },

  // Back
  { name: 'Barbell Row', muscleGroup: 'Back', description: 'A compound back exercise where you bend over and pull a barbell toward your lower chest, targeting the latissimus dorsi and rhomboids.' },
  { name: 'Deadlift', muscleGroup: 'Back', description: 'A compound exercise lifting a barbell from the floor to hip level, working the entire posterior chain including back, glutes, and hamstrings.' },
  { name: 'Lat Pulldown', muscleGroup: 'Back', description: 'A cable exercise pulling a bar down to chest level while seated, effectively targeting the latissimus dorsi and upper back muscles.' },
  { name: 'Pull-ups', muscleGroup: 'Back', description: 'A bodyweight exercise hanging from a bar and pulling yourself up, primarily working the lats with secondary engagement of biceps and rear delts.' },
  { name: 'Seated Cable Row', muscleGroup: 'Back', description: 'A compound back exercise performed sitting, pulling a handle toward the abdomen while keeping the back straight, targeting the middle back.' },
  { name: 'Dumbbell Row', muscleGroup: 'Back', description: 'A unilateral back exercise bent over with one hand supporting, pulling a dumbbell up to the hip to target the lat and upper back.' },

  // Shoulders
  { name: 'Overhead Press', muscleGroup: 'Shoulders', description: 'A compound shoulder exercise pressing a barbell from shoulders to overhead, primarily targeting the anterior and lateral deltoids.' },
  { name: 'Dumbbell Shoulder Press', muscleGroup: 'Shoulders', description: 'A shoulder exercise pressing dumbbells from shoulder height to overhead, allowing greater shoulder stabilization and range of motion.' },
  { name: 'Lateral Raises', muscleGroup: 'Shoulders', description: 'An isolation exercise raising dumbbells to the sides to target the lateral deltoid muscles, creating shoulder width and definition.' },
  { name: 'Front Raises', muscleGroup: 'Shoulders', description: 'An isolation exercise raising weights in front to target the anterior deltoid, often performed with dumbbells or a barbell.' },
  { name: 'Face Pulls', muscleGroup: 'Shoulders', description: 'A rear delt exercise using a cable rope pulled toward the face, targeting the rear deltoids, rhomboids, and rotator cuff muscles.' },
  { name: 'Rear Delt Fly', muscleGroup: 'Shoulders', description: 'An isolation exercise bending forward and raising dumbbells to the sides, specifically targeting the posterior deltoid muscles.' },

  // Biceps
  { name: 'Barbell Curl', muscleGroup: 'Biceps', description: 'The classic biceps exercise curling a barbell from hip level to the shoulders, primarily targeting the biceps brachii.' },
  { name: 'Dumbbell Curl', muscleGroup: 'Biceps', description: 'A fundamental bicep curl using individual dumbbells, allowing each arm to work independently with a full range of motion.' },
  { name: 'Hammer Curl', muscleGroup: 'Biceps', description: 'A variation of the dumbbell curl with neutral grip, targeting the brachialis and brachioradialis for arm thickness.' },
  { name: 'Preacher Curl', muscleGroup: 'Biceps', description: 'An isolation exercise performed on a preacher bench, preventing cheating by isolating the biceps through a full contraction.' },

  // Triceps
  { name: 'Tricep Pushdown', muscleGroup: 'Triceps', description: 'A cable exercise pushing a bar down by extending the elbows, one of the most effective exercises for targeting the triceps.' },
  { name: 'Skull Crushers', muscleGroup: 'Triceps', description: 'An isolation exercise lowering a weight to the forehead while lying on a bench, then extending the arms to work the triceps.' },
  { name: 'Overhead Tricep Extension', muscleGroup: 'Triceps', description: 'A tricep isolation exercise extending a weight overhead behind the head, providing a deep stretch and contraction.' },
  { name: 'Dips', muscleGroup: 'Triceps', description: 'A compound exercise on parallel bars where you lower and push yourself up, with upright positioning emphasizing triceps engagement.' },

  // Forearms
  { name: 'Wrist Curl', muscleGroup: 'Forearms', description: 'An isolation exercise curling the wrists with palms facing up to target the flexor muscles of the forearm.' },
  { name: 'Reverse Wrist Curl', muscleGroup: 'Forearms', description: 'An isolation exercise curling the wrists with palms facing down to target the extensor muscles of the forearm.' },
  { name: "Farmer's Walk", muscleGroup: 'Forearms', description: 'A compound exercise carrying heavy weights while walking, building grip strength and forearm endurance through sustained holding.' },

  // Core
  { name: 'Plank', muscleGroup: 'Core', description: 'An isometric core exercise holding a push-up position, engaging the entire midsection including abs, obliques, and lower back.' },
  { name: 'Hanging Leg Raise', muscleGroup: 'Core', description: 'An advanced core exercise hanging from a bar and raising legs to horizontal, targeting the hip flexors and lower abs.' },
  { name: 'Cable Crunch', muscleGroup: 'Core', description: 'A weighted ab exercise kneeling in front of a cable, crunching down to flex the spine against resistance.' },
  { name: 'Russian Twist', muscleGroup: 'Core', description: 'A rotational core exercise sitting and twisting side to side, targeting the obliques and entire abdominal region.' },

  // Quads
  { name: 'Barbell Squat', muscleGroup: 'Quads', description: 'The king of leg exercises, squatting with a barbell on the back to build overall leg mass and strength, primarily targeting quads.' },
  { name: 'Leg Press', muscleGroup: 'Quads', description: 'A machine-based compound exercise pushing a platform away while seated, targeting the quadriceps with less spinal loading than squats.' },
  { name: 'Lunges', muscleGroup: 'Quads', description: 'A unilateral leg exercise stepping forward and lowering the body, targeting quads, glutes, and hamstrings while improving balance.' },
  { name: 'Leg Extension', muscleGroup: 'Quads', description: 'An isolation machine exercise extending the legs against resistance, directly targeting the quadriceps muscles.' },

  // Hamstrings
  { name: 'Romanian Deadlift', muscleGroup: 'Hamstrings', description: 'A hip-hinge movement lowering a barbell while keeping legs slightly bent, intensely targeting the hamstrings and glutes.' },
  { name: 'Leg Curl', muscleGroup: 'Hamstrings', description: 'A machine isolation exercise curling the legs against resistance while lying down, directly targeting the hamstring muscles.' },
  { name: 'Good Mornings', muscleGroup: 'Hamstrings', description: 'A hip-hinge exercise resembling a bow, bending at the waist with a barbell on the back to stretch and load the hamstrings.' },

  // Glutes
  { name: 'Hip Thrust', muscleGroup: 'Glutes', description: 'A glute isolation exercise thrusting hips upward with weight on the pelvis, one of the most effective movements for glute development.' },
  { name: 'Cable Kickback', muscleGroup: 'Glutes', description: 'A unilateral cable exercise kicking one leg back to target the gluteus maximus, providing constant tension through the movement.' },

  // Calves
  { name: 'Standing Calf Raise', muscleGroup: 'Calves', description: 'A calf exercise rising onto the toes while standing, primarily targeting the gastrocnemius muscle for overall calf development.' },
  { name: 'Seated Calf Raise', muscleGroup: 'Calves', description: 'A calf exercise performed seated with weight on the knees, targeting the soleus muscle beneath the gastrocnemius.' },

  // Full Body
  { name: 'Burpees', muscleGroup: 'Full Body', description: 'A high-intensity bodyweight exercise combining a squat, push-up, and jump, providing a full body cardiovascular and strength challenge.' },
  { name: 'Kettlebell Swings', muscleGroup: 'Full Body', description: 'A dynamic hip-hinge exercise swinging a kettlebell to shoulder height, combining strength and cardio while working the posterior chain.' },

  // Cardio
  { name: 'Treadmill', muscleGroup: 'Cardio', description: 'A cardio machine for walking or running in place, providing an adjustable intensity workout for cardiovascular endurance.' },
  { name: 'Rowing Machine', muscleGroup: 'Cardio', description: 'A full-body cardio exercise simulating rowing a boat, engaging legs, core, and arms for an efficient aerobic workout.' },
  { name: 'Stationary Bike', muscleGroup: 'Cardio', description: 'A low-impact cycling exercise providing excellent cardiovascular benefits without stressing the joints.' },

  // Other
  { name: 'Box Jump', muscleGroup: 'Other', description: 'A plyometric exercise jumping onto a box or platform, developing explosive power in the legs and improving athletic performance.' },
];

export function getExercisesByMuscleGroup(muscleGroup: string): ExerciseLibraryItem[] {
  return exerciseLibrary.filter(
    (exercise) => exercise.muscleGroup.toLowerCase() === muscleGroup.toLowerCase()
  );
}

export function searchLibraryExercises(searchTerm: string): ExerciseLibraryItem[] {
  const term = searchTerm.toLowerCase();
  return exerciseLibrary.filter(
    (exercise) =>
      exercise.name.toLowerCase().includes(term) ||
      exercise.muscleGroup.toLowerCase().includes(term)
  );
}

export function getAllMuscleGroups(): string[] {
  const groups = new Set(exerciseLibrary.map((e) => e.muscleGroup));
  return Array.from(groups).sort();
}
