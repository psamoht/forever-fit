/**
 * Training State Management
 * 
 * Manages the "Trainingsakte" — a living document on each user's profile
 * that tracks progression, recovery, and muscle balance.
 */

export interface TrainingState {
    fitness_score: number;
    progression_factor: number;
    recovery_status: 'ready' | 'comeback' | 'building';
    days_since_last_workout: number;
    consecutive_misses: number;
    weekly_volume: {
        upper_body: number;
        lower_body: number;
        core: number;
        flexibility: number;
        cardio: number;
    };
    recent_workouts: RecentWorkout[];
    avg_rpe_last_5: number;
    preferred_difficulty: 'easy' | 'medium' | 'hard';
}

export interface RecentWorkout {
    date: string;
    theme: string;
    rpe: number;
    points: number;
    exercises_completed: number;
    exercises_total: number;
    variants_used: string[];
}

export const DEFAULT_TRAINING_STATE: TrainingState = {
    fitness_score: 100,
    progression_factor: 1.0,
    recovery_status: 'ready',
    days_since_last_workout: 0,
    consecutive_misses: 0,
    weekly_volume: {
        upper_body: 0,
        lower_body: 0,
        core: 0,
        flexibility: 0,
        cardio: 0,
    },
    recent_workouts: [],
    avg_rpe_last_5: 5.0,
    preferred_difficulty: 'medium',
};

/**
 * Calculates the new progression factor after a workout is completed.
 * 
 * RPE ≤ 3  → "Zu leicht"  → faster increase (+0.10)
 * RPE 4-6  → "Optimal"    → gentle increase  (+0.05)
 * RPE 7-8  → "Hart"       → pull back         (-0.05)
 * RPE ≥ 9  → "Am Limit"   → significant pull back (-0.10)
 * 
 * Also applies decay for missed days.
 */
function calculateNewProgressionFactor(
    currentFactor: number,
    rpe: number,
    daysSinceLastWorkout: number
): number {
    let newFactor = currentFactor;

    // 1. RPE-based adjustment
    if (rpe <= 3) newFactor += 0.10;
    else if (rpe <= 6) newFactor += 0.05;
    else if (rpe <= 8) newFactor -= 0.05;
    else newFactor -= 0.10;

    // 2. Decay for missed days (only if coming from a gap)
    if (daysSinceLastWorkout > 7) {
        const decayWeeks = Math.floor(daysSinceLastWorkout / 7);
        newFactor -= decayWeeks * 0.15;
    } else if (daysSinceLastWorkout > 3) {
        newFactor -= 0.05;
    }

    // 3. Safety bounds: min 0.5 (half intensity), max 2.0 (double intensity)
    return Math.max(0.5, Math.min(2.0, parseFloat(newFactor.toFixed(2))));
}

/**
 * Determines the recovery status based on days since last workout
 * and workout history.
 */
function calculateRecoveryStatus(
    currentStatus: TrainingState['recovery_status'],
    daysSinceLastWorkout: number,
    rpe: number,
    recentWorkouts: RecentWorkout[]
): TrainingState['recovery_status'] {
    // Entry into comeback mode: 3+ days since last workout
    if (daysSinceLastWorkout > 3 && currentStatus === 'ready') {
        return 'comeback';
    }

    // Transition from comeback to building: completed 1 workout with RPE ≤ 6
    if (currentStatus === 'comeback' && rpe <= 6) {
        return 'building';
    }

    // Transition from building to ready: 2+ recent workouts with RPE ≤ 7
    if (currentStatus === 'building') {
        const recentLowRpe = recentWorkouts
            .slice(-3) // look at last 3
            .filter(w => w.rpe <= 7);
        if (recentLowRpe.length >= 2) {
            return 'ready';
        }
    }

    return currentStatus;
}

/**
 * Calculate weekly volume from recent workouts (rolling 7-day window).
 */
function calculateWeeklyVolume(recentWorkouts: RecentWorkout[]): TrainingState['weekly_volume'] {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const volume = {
        upper_body: 0,
        lower_body: 0,
        core: 0,
        flexibility: 0,
        cardio: 0,
    };

    // Sum points from workouts in the last 7 days
    // Note: We use the theme as a rough proxy. For more granularity,
    // we'd need per-exercise muscle group tracking, but this is a solid start.
    recentWorkouts
        .filter(w => new Date(w.date) >= sevenDaysAgo)
        .forEach(w => {
            const pts = w.points;
            switch (w.theme) {
                case 'upper_body':
                    volume.upper_body += pts;
                    break;
                case 'lower_body':
                    volume.lower_body += pts;
                    break;
                case 'core':
                    volume.core += pts;
                    break;
                case 'mobility':
                case 'flexibility':
                    volume.flexibility += pts;
                    break;
                case 'cardio':
                case 'active_recovery':
                    volume.cardio += pts;
                    break;
                case 'full_body':
                    // Distribute evenly
                    const share = Math.round(pts / 4);
                    volume.upper_body += share;
                    volume.lower_body += share;
                    volume.core += share;
                    volume.flexibility += share;
                    break;
                default:
                    volume.cardio += pts;
            }
        });

    return volume;
}

/**
 * Main function: computes the new training state after a workout.
 * Called from finishWorkout() in the workout player.
 */
export function computeUpdatedTrainingState(
    currentState: TrainingState | null,
    workoutData: {
        rpe: number;
        points: number;
        theme: string;
        exercisesCompleted: number;
        exercisesTotal: number;
        variantsUsed: string[];
    }
): TrainingState {
    const state = currentState || DEFAULT_TRAINING_STATE;

    // Calculate days since last workout
    const now = new Date();
    let daysSinceLastWorkout = state.days_since_last_workout;
    if (state.recent_workouts.length > 0) {
        const lastDate = new Date(state.recent_workouts[state.recent_workouts.length - 1].date);
        daysSinceLastWorkout = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Build the new recent workout entry
    const newRecentWorkout: RecentWorkout = {
        date: now.toISOString().split('T')[0], // YYYY-MM-DD
        theme: workoutData.theme,
        rpe: workoutData.rpe,
        points: workoutData.points,
        exercises_completed: workoutData.exercisesCompleted,
        exercises_total: workoutData.exercisesTotal,
        variants_used: workoutData.variantsUsed,
    };

    // Keep only last 10 workouts in history
    const updatedRecentWorkouts = [...state.recent_workouts, newRecentWorkout].slice(-10);

    // Calculate average RPE of last 5 workouts
    const last5 = updatedRecentWorkouts.slice(-5);
    const avgRpe = last5.length > 0
        ? parseFloat((last5.reduce((sum, w) => sum + w.rpe, 0) / last5.length).toFixed(1))
        : 5.0;

    // Determine preferred difficulty from variant usage
    const allVariants = updatedRecentWorkouts.slice(-5).flatMap(w => w.variants_used);
    const easierCount = allVariants.filter(v => v === 'easier').length;
    const harderCount = allVariants.filter(v => v === 'harder').length;
    let preferredDifficulty: TrainingState['preferred_difficulty'] = 'medium';
    if (harderCount > easierCount + 2) preferredDifficulty = 'hard';
    else if (easierCount > harderCount + 2) preferredDifficulty = 'easy';

    // Core calculations
    const newProgressionFactor = calculateNewProgressionFactor(
        state.progression_factor,
        workoutData.rpe,
        daysSinceLastWorkout
    );

    const newRecoveryStatus = calculateRecoveryStatus(
        state.recovery_status,
        daysSinceLastWorkout,
        workoutData.rpe,
        updatedRecentWorkouts
    );

    const newWeeklyVolume = calculateWeeklyVolume(updatedRecentWorkouts);

    return {
        fitness_score: state.fitness_score + workoutData.points,
        progression_factor: newProgressionFactor,
        recovery_status: newRecoveryStatus,
        days_since_last_workout: 0, // Just completed a workout
        consecutive_misses: 0,      // Just completed a workout
        weekly_volume: newWeeklyVolume,
        recent_workouts: updatedRecentWorkouts,
        avg_rpe_last_5: avgRpe,
        preferred_difficulty: preferredDifficulty,
    };
}
