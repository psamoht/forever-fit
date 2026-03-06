
export interface Exercise {
    id: string;
    name: string;
    sets?: number;     // number of sets (Durchgänge)
    duration?: number; // seconds (optional if mode is reps)
    reps?: number;     // number of repetitions (optional if mode is timer)
    mode: 'timer' | 'reps';
    description: string;
    videoUrl?: string;
    baseMET?: number;
    muscleGroup?: string;
    easierVariant?: Partial<Exercise>;
    harderVariant?: Partial<Exercise>;
}

export const MOCK_WORKOUT: Exercise[] = [
    {
        id: "alt-1",
        name: "Schulterkreisen im Sitzen",
        reps: 15,
        mode: 'reps',
        description: "Setze dich aufrecht hin und kreise die Schultern langsam nach hinten.",
        videoUrl: "" // Empty videoUrl will trigger dynamic generation
    },
    {
        id: "1",
        name: "Katze-Kuh",
        reps: 10,
        mode: 'reps',
        description: "Gehe in den Vierfüßlerstand. Runde beim Ausatmen den Rücken (Katze) und lass ihn beim Einatmen sanft durchhängen (Kuh).",
        videoUrl: "/exercises/cat-cow.png"
    },
    {
        id: "2",
        name: "Kindeshaltung",
        duration: 45,
        mode: 'timer',
        description: "Setze dich auf deine Fersen, strecke die Arme weit nach vorne und lege die Stirn am Boden ab. Atme tief in den Rücken.",
        videoUrl: "/exercises/childs-pose.png"
    },
    {
        id: "3",
        name: "Brustwirbelsäulen-Rotation",
        reps: 8,
        mode: 'reps',
        description: "Vierfüßlerstand. Eine Hand an den Hinterkopf legen, Ellbogen zum gegenüberliegenden Arm führen und dann weit nach oben aufdrehen. Pro Seite.",
        videoUrl: "/exercises/thoracic-rotation.png"
    }
];

export const ALTERNATIVE_EXERCISES: Exercise[] = [
    {
        id: "alt-1",
        name: "Schulterkreisen im Sitzen",
        reps: 15,
        mode: 'reps',
        description: "Setze dich aufrecht hin und kreise die Schultern langsam nach hinten.",
        videoUrl: "" // Placeholder
    },
    {
        id: "alt-2",
        name: "Seitneigen im Stehen",
        reps: 10,
        mode: 'reps',
        description: "Stehe aufrecht. Gleite mit der Hand am Oberschenkel entlang nach unten zur Seite.",
        videoUrl: ""
    }
];

export const STRENGTH_EXERCISES: Exercise[] = [
    {
        id: "s-1",
        name: "Kniebeugen (Squats)",
        sets: 3,
        reps: 15,
        mode: 'reps',
        description: "Stelle dich schulterbreit hin. Gehe in die Hocke, als würdest du dich auf einen Stuhl setzen. Rücken gerade halten.",
        videoUrl: "/exercises/squats.png",
        easierVariant: {
            name: "Halbe Kniebeugen",
            description: "Gehe nur halb so tief in die Hocke. Stütze dich bei Bedarf leicht an einer Wand oder Stuhllehne ab.",
        },
        harderVariant: {
            name: "Tiefe Kniebeugen",
            description: "Gehe so tief wie möglich in die Hocke, wobei die Fersen auf dem Boden bleiben. Halte die Spannung unten für eine Sekunde.",
        }
    },
    {
        id: "s-2",
        name: "Liegestütze (Pushups)",
        sets: 2,
        reps: 10,
        mode: 'reps',
        description: "Hände etwas breiter als schulterbreit aufstützen. Körper bildet eine Linie. Langsam absenken und wieder hochdrücken.",
        videoUrl: "/exercises/pushups.png",
        easierVariant: {
            name: "Knie-Liegestütze",
            description: "Stütze dich auf den Knien ab statt auf den Füßen. Das reduziert das Gewicht deutlich.",
        },
        harderVariant: {
            name: "Langsame Liegestütze",
            description: "Lasse dir beim Absenken 3 Sekunden Zeit und drücke dich explosiv wieder nach oben.",
        }
    },
    {
        id: "s-3",
        name: "Ausfallschritte",
        reps: 10, // per leg
        mode: 'reps',
        description: "Großer Schritt nach vorne. Hinteres Knie Richtung Boden absenken. Oberkörper aufrecht halten. Abwechselnd.",
        videoUrl: "/exercises/lunges.png",
        easierVariant: {
            name: "Kleine Ausfallschritte",
            description: "Mache einen kleineren Schritt und senke das Knie nur leicht ab. Halte dich an einer Wand fest.",
        },
        harderVariant: {
            name: "Ausfallschritte mit Wippen",
            description: "Bleibe unten im Ausfallschritt und wippe dreimal leicht auf und ab, bevor du wieder hochkommst.",
        }
    },
    {
        id: "s-4",
        name: "Unterarmstütz (Plank)",
        sets: 2,
        duration: 30, // seconds
        mode: 'timer',
        description: "Unterarme und Zehenspitzen aufstellen, Körper bildet eine gerade Linie. Bauchnabel einziehen.",
        videoUrl: "/exercises/plank.png",
        easierVariant: {
            name: "Knie-Plank",
            description: "Setze die Knie ab, halte aber den Oberkörper weiterhin gerade.",
        },
        harderVariant: {
            name: "Plank mit Beinheben",
            description: "Hebe abwechselnd ein Bein für 2 Sekunden vom Boden ab.",
        }
    }
];

export const CARDIO_EXERCISES: Exercise[] = [
    {
        id: "c-1",
        name: "Hampelmann (Jumping Jacks)",
        duration: 45,
        mode: 'timer',
        description: "Springe, öffne dabei die Beine und führe die Arme über dem Kopf zusammen. Zurück in die Ausgangsposition.",
        videoUrl: "/exercises/jumping-jacks.png"
    },
    {
        id: "c-2",
        name: "High Knees",
        duration: 30,
        mode: 'timer',
        description: "Laufe auf der Stelle und ziehe dabei die Knie so hoch wie möglich.",
        videoUrl: "/exercises/high-knees.png"
    },
    {
        id: "c-3",
        name: "Bergsteiger (Mountain Climbers)",
        duration: 30,
        mode: 'timer',
        description: "Liegestützposition. Ziehe abwechselnd die Knie schnell Richtung Brust.",
        videoUrl: "/exercises/mountain-climbers.png"
    }
];
