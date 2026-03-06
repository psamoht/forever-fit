/**
 * Weekly Challenge System
 * 
 * Generates simple, senior-friendly challenges based on user's
 * current level, training state, and weekly schedule.
 * Challenges reset every Monday.
 */

export interface Challenge {
    id: string;
    title: string;
    description: string;
    emoji: string;
    target: number;
    type: 'workouts' | 'points' | 'streak' | 'harder_variant';
}

/**
 * A curated pool of challenges. All use simple, clear German language.
 * No jargon like "RPE" — everything is understandable for seniors.
 */
const CHALLENGE_POOL: Challenge[] = [
    // Workout count challenges
    {
        id: 'w3',
        title: 'Dreimal ist Meisterklasse',
        description: 'Schaffe diese Woche 3 Trainingseinheiten',
        emoji: '🎯',
        target: 3,
        type: 'workouts',
    },
    {
        id: 'w4',
        title: 'Vierfach aktiv',
        description: 'Trainiere diese Woche an 4 Tagen',
        emoji: '💪',
        target: 4,
        type: 'workouts',
    },
    {
        id: 'w5',
        title: 'Wochenkrieger',
        description: 'Schaffe diese Woche 5 Trainingseinheiten',
        emoji: '🏆',
        target: 5,
        type: 'workouts',
    },
    // Points challenges
    {
        id: 'p200',
        title: 'Punktejäger',
        description: 'Sammle diese Woche 200 Punkte',
        emoji: '⭐',
        target: 200,
        type: 'points',
    },
    {
        id: 'p350',
        title: 'Punkte-Profi',
        description: 'Sammle diese Woche 350 Punkte',
        emoji: '🌟',
        target: 350,
        type: 'points',
    },
    {
        id: 'p500',
        title: 'Punkte-Champion',
        description: 'Sammle diese Woche 500 Punkte',
        emoji: '👑',
        target: 500,
        type: 'points',
    },
    // Streak challenges
    {
        id: 's3',
        title: 'Drei-Tage-Feuer',
        description: 'Halte deinen Streak auf mindestens 3 Tage',
        emoji: '🔥',
        target: 3,
        type: 'streak',
    },
    {
        id: 's7',
        title: 'Wochen-Flamme',
        description: 'Erreiche einen Streak von 7 Tagen',
        emoji: '🔥',
        target: 7,
        type: 'streak',
    },
    // Variant challenge
    {
        id: 'h1',
        title: 'Mut zur Herausforderung',
        description: 'Probiere bei einer Übung die schwierigere Variante',
        emoji: '💎',
        target: 1,
        type: 'harder_variant',
    },
];

/**
 * Select an appropriate challenge for the user based on their level.
 * Uses a deterministic seed based on the week number so the same
 * challenge persists throughout the week.
 */
export function getWeeklyChallenge(level: number, weekNumber?: number): Challenge {
    // Calculate current week number for deterministic selection
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const currentWeek = weekNumber ?? Math.ceil(
        ((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24) + startOfYear.getDay() + 1) / 7
    );

    // Filter challenges by difficulty appropriate for the level
    let pool: Challenge[];
    if (level <= 2) {
        // Beginners get easy challenges
        pool = CHALLENGE_POOL.filter(c =>
            (c.type === 'workouts' && c.target <= 3) ||
            (c.type === 'points' && c.target <= 200) ||
            (c.type === 'streak' && c.target <= 3)
        );
    } else if (level <= 5) {
        // Intermediate
        pool = CHALLENGE_POOL.filter(c =>
            (c.type === 'workouts' && c.target <= 4) ||
            (c.type === 'points' && c.target <= 350) ||
            (c.type === 'streak' && c.target <= 7) ||
            c.type === 'harder_variant'
        );
    } else {
        // Advanced gets all challenges
        pool = CHALLENGE_POOL;
    }

    // Deterministic selection based on week number
    const index = currentWeek % pool.length;
    return pool[index];
}

/**
 * Compute challenge progress from the user's weekly stats.
 */
export function getChallengeProgress(
    challenge: Challenge,
    weeklyStats: {
        workoutsCompleted: number;
        pointsEarned: number;
        currentStreak: number;
        harderVariantsUsed: number;
    }
): { current: number; target: number; isComplete: boolean; percentage: number } {
    let current = 0;
    switch (challenge.type) {
        case 'workouts':
            current = weeklyStats.workoutsCompleted;
            break;
        case 'points':
            current = weeklyStats.pointsEarned;
            break;
        case 'streak':
            current = weeklyStats.currentStreak;
            break;
        case 'harder_variant':
            current = weeklyStats.harderVariantsUsed;
            break;
    }

    return {
        current,
        target: challenge.target,
        isComplete: current >= challenge.target,
        percentage: Math.min(100, Math.round((current / challenge.target) * 100)),
    };
}
