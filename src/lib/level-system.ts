/**
 * Level System for Forever Fit
 * 
 * Levels are based on total accumulated points ("Punkte").
 * Each level has a title, emoji, and point threshold.
 * After level 10, the system continues with "Meister II", "Meister III", etc.
 */

export interface LevelInfo {
    level: number;
    title: string;
    emoji: string;
    pointsRequired: number;
    pointsForNext: number; // Points needed for the NEXT level
}

const LEVEL_DEFINITIONS = [
    { level: 1, title: "Einsteiger", emoji: "🌱", pointsRequired: 0 },
    { level: 2, title: "Aktiver", emoji: "🚶", pointsRequired: 200 },
    { level: 3, title: "Durchstarter", emoji: "💪", pointsRequired: 500 },
    { level: 4, title: "Energiebündel", emoji: "🔥", pointsRequired: 1000 },
    { level: 5, title: "Fortgeschritten", emoji: "⭐", pointsRequired: 2000 },
    { level: 6, title: "Leistungsträger", emoji: "🏅", pointsRequired: 3500 },
    { level: 7, title: "Fitness-Profi", emoji: "🏆", pointsRequired: 5500 },
    { level: 8, title: "Champion", emoji: "👑", pointsRequired: 8000 },
    { level: 9, title: "Legende", emoji: "💎", pointsRequired: 12000 },
    { level: 10, title: "Meister", emoji: "🌟", pointsRequired: 18000 },
];

// After level 10, each "Meister" tier requires 10,000 additional points
const MEISTER_INCREMENT = 10000;

/**
 * Calculate the user's current level from their total points.
 */
export function getLevelFromPoints(totalPoints: number): LevelInfo {
    // Check standard levels (1-10)
    for (let i = LEVEL_DEFINITIONS.length - 1; i >= 0; i--) {
        if (totalPoints >= LEVEL_DEFINITIONS[i].pointsRequired) {
            const currentDef = LEVEL_DEFINITIONS[i];

            // If it's the max defined level, check for Meister tiers
            if (i === LEVEL_DEFINITIONS.length - 1) {
                const excessPoints = totalPoints - currentDef.pointsRequired;
                const meisterTier = Math.floor(excessPoints / MEISTER_INCREMENT);

                if (meisterTier > 0) {
                    const tierLevel = currentDef.level + meisterTier;
                    return {
                        level: tierLevel,
                        title: `Meister ${toRoman(meisterTier + 1)}`,
                        emoji: "🌟",
                        pointsRequired: currentDef.pointsRequired + (meisterTier * MEISTER_INCREMENT),
                        pointsForNext: currentDef.pointsRequired + ((meisterTier + 1) * MEISTER_INCREMENT),
                    };
                }

                return {
                    ...currentDef,
                    pointsForNext: currentDef.pointsRequired + MEISTER_INCREMENT,
                };
            }

            return {
                ...currentDef,
                pointsForNext: LEVEL_DEFINITIONS[i + 1].pointsRequired,
            };
        }
    }

    // Fallback (should never happen since level 1 starts at 0)
    return { ...LEVEL_DEFINITIONS[0], pointsForNext: LEVEL_DEFINITIONS[1].pointsRequired };
}

/**
 * Check if a point increase caused a level-up.
 * Returns the new level info if there was a level-up, null otherwise.
 */
export function checkLevelUp(pointsBefore: number, pointsAfter: number): LevelInfo | null {
    const levelBefore = getLevelFromPoints(pointsBefore);
    const levelAfter = getLevelFromPoints(pointsAfter);

    if (levelAfter.level > levelBefore.level) {
        return levelAfter;
    }
    return null;
}

/**
 * Get progress percentage towards the next level (0-100).
 */
export function getLevelProgress(totalPoints: number): number {
    const level = getLevelFromPoints(totalPoints);
    const pointsIntoLevel = totalPoints - level.pointsRequired;
    const pointsNeededForLevel = level.pointsForNext - level.pointsRequired;

    if (pointsNeededForLevel <= 0) return 100;
    return Math.min(100, Math.round((pointsIntoLevel / pointsNeededForLevel) * 100));
}

/**
 * Convert number to Roman numeral (for Meister tiers).
 */
function toRoman(num: number): string {
    const romanNumerals: [number, string][] = [
        [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
    ];
    let result = '';
    for (const [value, symbol] of romanNumerals) {
        while (num >= value) {
            result += symbol;
            num -= value;
        }
    }
    return result;
}

/**
 * Streak milestone definitions.
 * Returns a congratulation message if the streak hits a milestone, null otherwise.
 */
export function getStreakMilestone(streak: number): { message: string; emoji: string } | null {
    const milestones: Record<number, { message: string; emoji: string }> = {
        3: { message: "3 Tage am Stück – du kommst in Fahrt!", emoji: "🔥" },
        7: { message: "Eine ganze Woche! Großartig!", emoji: "🔥🔥" },
        14: { message: "2 Wochen ohne Pause – beeindruckend!", emoji: "⭐" },
        21: { message: "3 Wochen! Das ist echte Disziplin!", emoji: "💪" },
        30: { message: "30 Tage! Du bist unaufhaltbar!", emoji: "🏆" },
        50: { message: "50 Tage – du bist eine Legende!", emoji: "💎" },
        100: { message: "100 Tage am Stück! Absoluter Champion!", emoji: "👑" },
        365: { message: "Ein ganzes Jahr! Unfassbar!", emoji: "🌟" },
    };

    return milestones[streak] || null;
}
