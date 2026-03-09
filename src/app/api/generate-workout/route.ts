import { model } from "@/lib/gemini";
import { NextResponse } from "next/server";
import { logApiUsage, logUserActivity } from "@/lib/admin-logger";
import { Exercise } from "@/lib/workout-data";
import { createClient } from "@supabase/supabase-js";

// Needs SERVICE_ROLE_KEY to safely bypass RLS when injecting new AI exercises
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZ2x5aGZneHN5cHN6b25tdXp0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODU4MTA1NywiZXhwIjoyMDg0MTU3MDU3fQ.V8QTGCPrHBRZAEC6R0t7S7_aV_Qt6uUpf95Wgrk7O6E";
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export async function POST(req: Request) {
    try {
        const { theme, activityTitle, profile, equipment, trainingState } = await req.json();

        if (!theme || !profile) {
            return NextResponse.json({ error: "Missing required fields (theme or profile)" }, { status: 400 });
        }

        const isSpaziergang = activityTitle?.toLowerCase().includes('spazier') || theme === 'active_recovery' || activityTitle?.toLowerCase().includes('pause');

        let activitySpecificInstructions = `
HEUTIGES THEMA DIESER EINHEIT:
Thema: ${theme} ("upper_body" = Arme/Brust/Rücken, "lower_body" = Beine/Gesäß, "core" = Bauch/Rücken, "full_body" = Ganzkörper, "cardio" = Herz-Kreislauf, "mobility" = Beweglichkeit)
Titel der Aktivität: ${activityTitle || 'Workout'}

AKTUELLES FITNESS-LEVEL:
Level ${profile.level || 1}

REGELN FÜR DIE GENERIERUNG:
1. Ignoriere NIEMALS die "Gesundheitlichen Einschränkungen". Wenn da "kaputte Knie" steht, darf es KEINE tiefen Kniebeugen oder Ausfallschritte geben. Biete stattdessen sichere Alternativen (z.B. im Sitzen oder isometrisch).
2. Nutze NUR das genannte Equipment. Wenn nichts genannt ist, nur Bodyweight.
3. Wähle exakt 3 bis 5 Übungen, die zum Thema passen.
4. Generiere für JEDE Übung eine "easierVariant" (leichtere Variante) und eine "harderVariant" (schwierigere Variante), damit der Nutzer die Intensität live anpassen kann.
5. Sorge für fließende, gut erklärte deutsche Beschreibungen ("description").
6. Bei "mode" wähle entweder "reps" (Wiederholungen) oder "timer" (Sekunden).
7. Erfinde motivierende "namen" für die Übungen.
8. Setze für JEDE Übung einen passenden baseMET-Wert (z.B. 2.5 für leichtes Dehnen/Spazieren, 5.0 für Kniebeugen, 7.0 für HIIT) und ordne sie zwingend einer festgelegten muscleGroup zu.
`;

        if (isSpaziergang) {
            activitySpecificInstructions = `
HEUTIGE AKTIVITÄT:
Titel der Aktivität: ${activityTitle || 'Aktive Pause (Spazieren)'}
(Dies ist ein Spaziergang / eine sanfte aktive Erholung an der frischen Luft)

AKTUELLES FITNESS-LEVEL:
Level ${profile.level || 1}

REGELN FÜR DIE GENERIERUNG:
1. WICHTIG: DIES IST EIN SPAZIERGANG / EINE AKTIVE PAUSE.
2. Du DARFST KEINE normalen Fitness-Übungen (wie Nackendehnung, Kniebeugen, Kraft etc.) generieren.
3. Generiere EXAKT 1 Übung namens "Lockeres Spazieren an der frischen Luft" (oder ähnlich für Achtsames Gehen).
4. Setze mode AUF JEDEN FALL auf "timer" und die Dauer auf mindestens 900 Sekunden (15 Min).
5. Generiere KEINE weiteren Übungen. Nur diese eine.
6. Setze den baseMET-Wert für Spazieren auf ca. 3.0 und die muscleGroup auf "Cardio".
7. Schreibe eine motivierende "description" über die Vorteile von frischer Luft und sanfter Bewegung. Die Varianten (easier/harder) können "Langsamer schlendern" und "Zügiges Gehen (Power Walking)" sein.
`;
        }

        // Build adaptive training context from training state
        let adaptiveContext = '';
        if (trainingState) {
            const pf = trainingState.progression_factor || 1.0;
            const rs = trainingState.recovery_status || 'ready';
            const wv = trainingState.weekly_volume || {};
            const avgRpe = trainingState.avg_rpe_last_5 || 5.0;
            const recentWorkouts = trainingState.recent_workouts || [];

            // Progression block
            adaptiveContext += `
PROGRESSIONS-STEUERUNG:
- Aktueller Progressions-Faktor: ${pf.toFixed(2)}
- Bei Faktor 1.0: Standard-Intensität (z.B. 10 Wiederholungen, 2 Sätze, 30 Sek. Planks)
- Bei Faktor > 1.0: Intensität proportional erhöhen (z.B. bei 1.15: ~12 Wiederholungen, 35 Sek. Planks)
- Bei Faktor < 1.0: Intensität proportional senken (z.B. bei 0.8: ~8 Wiederholungen, 25 Sek. Planks)
- Durchschnittliche Belastungseinschätzung der letzten 5 Einheiten (RPE): ${avgRpe.toFixed(1)} / 10
- Passe Reps, Dauer, Sätze UND Übungsauswahl entsprechend dem Faktor an.
`;

            // Recovery block
            if (rs === 'comeback') {
                adaptiveContext += `
WICHTIG - WIEDEREINSTIEG NACH PAUSE:
Der Nutzer kehrt nach einer längeren Pause zurück. Starte SANFT:
- Maximal 3 leichte Übungen
- Fokus auf Mobility und leichte Bodyweight-Bewegungen
- Niedrige Wiederholungszahlen (50-60% des Normalwerts)
- Längere Pausen zwischen Übungen einplanen
- KEINE anspruchsvollen Kraft- oder Cardio-Übungen
`;
            } else if (rs === 'building') {
                adaptiveContext += `
AUFBAUPHASE:
Der Nutzer baut nach einer Pause gerade wieder auf:
- Maximal 4 Übungen erlaubt
- Intensität bei 80% des Normalwerts
- Langsam steigern, aber noch nicht volle Belastung
`;
            }

            // Muscle balance block
            const totalVolume = Object.values(wv).reduce((sum: number, val: any) => sum + (val || 0), 0);
            if (totalVolume > 0) {
                const categories = [
                    { key: 'upper_body', label: 'Oberkörper', val: wv.upper_body || 0 },
                    { key: 'lower_body', label: 'Unterkörper', val: wv.lower_body || 0 },
                    { key: 'core', label: 'Core/Rumpf', val: wv.core || 0 },
                    { key: 'flexibility', label: 'Beweglichkeit', val: wv.flexibility || 0 },
                    { key: 'cardio', label: 'Ausdauer', val: wv.cardio || 0 }
                ];
                const avg = totalVolume / categories.length;
                const neglected = categories.filter(c => c.val < avg * 0.5).map(c => c.label);
                const overtrained = categories.filter(c => c.val > avg * 1.5).map(c => c.label);

                adaptiveContext += `
MUSKELGRUPPEN-BALANCE DIESE WOCHE (letzte 7 Tage):
${categories.map(c => `- ${c.label}: ${c.val} Punkte`).join('\n')}
${neglected.length > 0 ? `VERNACHLÄSSIGT: ${neglected.join(', ')} → Bevorzuge Übungen für diese Gruppen!` : ''}
${overtrained.length > 0 ? `BEREITS VIEL TRAINIERT: ${overtrained.join(', ')} → Weniger Fokus darauf.` : ''}
`;
            }

            // Recent workout history (last 3)
            if (recentWorkouts.length > 0) {
                const last3 = recentWorkouts.slice(-3);
                adaptiveContext += `
LETZTE TRAININGSEINHEITEN:
${last3.map((w: any) => `- ${w.date}: Thema "${w.theme}", RPE ${w.rpe}/10, ${w.exercises_completed}/${w.exercises_total} Übungen`).join('\n')}
Vermeide zu viel Wiederholung der gleichen Übungen. Bringe Abwechslung rein!
`;
            }
        }

        const systemPrompt = `
Du bist ein renommierter Sportwissenschaftler und Personal Trainer.
Deine Aufgabe ist es, ein maßgeschneidertes, sicheres und hoch-effektives Workout-Programm für die heutige Trainingseinheit zu generieren.
Passe Intensität, Übungsauswahl und Komplexität IMMER an das Alter des Nutzers an.

KONTEXT DES NUTZERS:
- Alter: ${profile.birth_year ? `${new Date().getFullYear() - profile.birth_year} Jahre` : 'Nicht angegeben'}
- Geschlecht: ${profile.gender === 'male' ? 'Männlich' : profile.gender === 'female' ? 'Weiblich' : 'Nicht angegeben'}
- Gewicht: ${profile.weight ? profile.weight + ' kg' : 'Nicht angegeben'}
- Ziele: ${profile.goals || 'Allgemeine Fitness und Beweglichkeit'}
- Gesundheitliche Einschränkungen: ${profile.medical_conditions || 'Keine bekannten Einschränkungen'}
- Vorhandenes Equipment: ${equipment?.join(', ') || 'Nur Körpergewicht'}

${adaptiveContext}

${activitySpecificInstructions}

WICHTIGSTE REGEL ZUM FORMAT:
Deine komplette Antwort MUSS ein gültiges JSON-Array sein, das genau 1:1 dem folgenden TypeScript-Interface entspricht:

interface Exercise {
    id: string; // Wird vom Backend überschrieben, setze hier vorerst "gen-X"
    name: string;
    sets: number; // REGELN FÜR SÄTZE: 
                  // 1. Kraftübungen: 2-3 Sätze.
                  // 2. BEIDSEITIGE ÜBUNGEN (z.B. Dehnen links/rechts, Rotation im/gegen Uhrzeigersinn): IMMER GENAU 2 SÄTZE (einer pro Seite).
                  // 3. ISOMETRISCHE ÜBUNGEN (Plank, Wandsitz) oder DURCHGEHENDE BEWEGUNGEN (Gehen): IMMER GENAU 1 SATZ.
    duration?: number; // Sekunden, falls mode='timer'
    reps?: number;     // Anzahl, falls mode='reps'
    mode: 'timer' | 'reps';
    description: string;
    videoUrl: string; // Setze dies vorerst auf ""
    baseMET: number; // NEU! z.B. 4.0
    muscleGroup: 'Upper Body' | 'Lower Body' | 'Core' | 'Flexibility/Mobility' | 'Cardio'; // NEU! Exakt einer dieser Strings
    easierVariant: { name: string; description: string; };
    harderVariant: { name: string; description: string; };
}

Gib AUSSCHLIESSLICH das JSON-Array zurück. KEINEN Markdown-Text außerhalb des Arrays. KEINE Einleitungen.
Beispiel (Struktur):
[
  {
    "id": "gen-1",
    "name": "Sicheres Schulterkreisen",
    "sets": 2,
    "reps": 15,
    "mode": "reps",
    "description": "Setze dich aufrecht hin...",
    "videoUrl": "",
    "baseMET": 2.5,
    "muscleGroup": "Flexibility/Mobility",
    "easierVariant": { "name": "...", "description": "..." },
    "harderVariant": { "name": "...", "description": "..." }
  }
]
`;

        const chat = model.startChat({
            generationConfig: {
                temperature: 0.7,
            }
        });

        const result = await chat.sendMessage(systemPrompt);
        const text = result.response.text();

        const inputTokens = result.response.usageMetadata?.promptTokenCount || 0;
        const outputTokens = result.response.usageMetadata?.candidatesTokenCount || 0;
        const userId = profile?.id || null;

        Promise.all([
            logApiUsage(userId, 'generate-workout', inputTokens, outputTokens),
            logUserActivity(userId, 'workout_generated', `Generated plan for theme: ${theme}`, { theme })
        ]).catch(e => console.error("Admin Logging Error:", e));

        // Extrahiere das JSON Array
        let jsonStr = text;
        const jsonMatch = text.match(/\`\`\`json\n([\s\S]*?)\n\`\`\`/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1];
        } else {
            jsonStr = text.replace(/\`\`\`(json)?/g, '').trim();
        }

        const rawExercises: (Exercise & { baseMET: number; muscleGroup: string })[] = JSON.parse(jsonStr);

        // Map AI exercises to DB UUIDs
        // We look up each exercise by name in the DB. If it exists, use its ID.
        // If not, we insert it into the global exercises catalog.
        const populatedExercises = await Promise.all(
            rawExercises.map(async (aiEx) => {
                // 1. Try to find existing
                const { data: existingEx } = await supabaseAdmin
                    .from('exercises')
                    .select('id')
                    .ilike('name', aiEx.name)
                    .single();

                if (existingEx?.id) {
                    return { ...aiEx, id: existingEx.id };
                }

                // 2. Insert new
                const { data: newEx, error: insertError } = await supabaseAdmin
                    .from('exercises')
                    .insert({
                        name: aiEx.name,
                        description: aiEx.description,
                        difficulty_level: 'medium', // Default AI guess
                        base_met: aiEx.baseMET,
                        muscle_group: aiEx.muscleGroup,
                        is_verified: false
                    })
                    .select('id')
                    .single();

                if (insertError) {
                    console.error("Failed to insert new exercise into catalog:", insertError);
                    return aiEx; // fallback to the generated string, though it will crash workout_exercises later
                }

                return { ...aiEx, id: newEx.id };
            })
        );

        return NextResponse.json({ exercises: populatedExercises });

    } catch (error) {
        console.error("AI Generation Error:", error);
        return NextResponse.json({ error: "Failed to generate workout via AI" }, { status: 500 });
    }
}
