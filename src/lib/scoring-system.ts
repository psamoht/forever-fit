export type MuscleGroup = 'Upper Body' | 'Lower Body' | 'Core' | 'Flexibility/Mobility' | 'Cardio';

export interface ScoredExercise {
    id: string;
    name: string;
    baseMET: number; // Metabolic Equivalent of Task
    muscleGroup: MuscleGroup;
    mode: 'reps' | 'timer';
}

/**
 * Calculates a standardized fitness score for an exercise.
 * 
 * Formula:
 * For timer based (duration in seconds): (Duration / 60) * MET * Multiplier
 * For reps based: (Reps / 10) * MET * Multiplier
 * 
 * Values are scaled to provide "Points" (e.g. 10-50 points per exercise).
 */
export function calculateExerciseScore(exercise: ScoredExercise, performedValue: number): number {
    const SCALE_MULTIPLIER = 5; // To make points feel significant

    // Ensure we use the dynamc baseMET if available, else fallback
    const met = exercise.baseMET || 3.0;

    let score = 0;
    if (exercise.mode === 'timer') {
        // performedValue is in seconds
        const minutes = performedValue / 60;
        score = minutes * met * SCALE_MULTIPLIER;
    } else {
        // performedValue is in reps
        // Assuming 10 reps takes roughly 30 seconds for a typical senior exercise, roughly 0.5 mins
        const estimatedMinutes = (performedValue / 10) * 0.5;
        score = estimatedMinutes * met * SCALE_MULTIPLIER;
    }

    return Math.round(score);
}

// Map existing exercise IDs to Base METs and Muscle Groups
export const EXERCISE_SCORING_DICTIONARY: Record<string, { baseMET: number, muscleGroup: MuscleGroup }> = {
    // Mobility (Light) -> MET often 2.0 - 2.5
    'cat-cow': { baseMET: 2.0, muscleGroup: 'Flexibility/Mobility' },
    'child-pose': { baseMET: 1.5, muscleGroup: 'Flexibility/Mobility' },
    't-spine-rotation': { baseMET: 2.5, muscleGroup: 'Flexibility/Mobility' },
    'neck-stretch': { baseMET: 1.5, muscleGroup: 'Flexibility/Mobility' },
    'seated-twist': { baseMET: 2.0, muscleGroup: 'Flexibility/Mobility' },

    // Strength (Moderate to Hard) -> MET 3.0 - 6.0
    'squats': { baseMET: 5.0, muscleGroup: 'Lower Body' },
    'half-squats': { baseMET: 3.5, muscleGroup: 'Lower Body' }, // easier
    'jump-squats': { baseMET: 7.0, muscleGroup: 'Lower Body' }, // harder

    'pushups': { baseMET: 5.0, muscleGroup: 'Upper Body' },
    'knee-pushups': { baseMET: 3.8, muscleGroup: 'Upper Body' }, // easier
    'incline-pushups': { baseMET: 3.0, muscleGroup: 'Upper Body' }, // easiest

    'lunges': { baseMET: 5.5, muscleGroup: 'Lower Body' },
    'step-ups': { baseMET: 4.5, muscleGroup: 'Lower Body' }, // easier variant of lunges
    'jumping-lunges': { baseMET: 7.5, muscleGroup: 'Lower Body' }, // harder

    'plank': { baseMET: 4.0, muscleGroup: 'Core' },
    'knee-plank': { baseMET: 3.0, muscleGroup: 'Core' },

    // Cardio
    'high-knees': { baseMET: 6.0, muscleGroup: 'Cardio' },
    'jumping-jacks': { baseMET: 7.0, muscleGroup: 'Cardio' },
    'marching-in-place': { baseMET: 3.5, muscleGroup: 'Cardio' },
};

// Fallback scoring for unknown exercises
export const DEFAULT_SCORING = { baseMET: 3.0, muscleGroup: 'Cardio' as MuscleGroup };
