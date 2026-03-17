/**
 * Central registry for all AI prompts used in Forever Fit.
 */

export interface PromptDefinition {
    id: string;
    name: string;
    description: string;
    purpose: string;
    template: string;
}

export const PROMPT_REGISTRY: Record<string, PromptDefinition> = {
    'workout-generation': {
        id: 'workout-generation',
        name: 'Workout-Generierung',
        description: 'Generiert ein maßgeschneidertes Workout-Programm basierend auf Nutzerprofil und Ziel.',
        purpose: 'Erstellung eines sicheren und effektiven Trainingsplans für eine spezifische Session.',
        template: `
Du bist ein renommierter Sportwissenschaftler und Personal Trainer.
Deine Aufgabe ist es, ein maßgeschneidertes, sicheres und hoch-effektives Workout-Programm für die heutige Trainingseinheit zu generieren.
Passe Intensität, Übungsauswahl und Komplexität IMMER an das Alter des Nutzers an.

KONTEXT DES NUTZERS:
- Alter: {{age}}
- Geschlecht: {{gender}}
- Gewicht: {{weight}}
- Ziele: {{goals}}
- Gesundheitliche Einschränkungen: {{medical_conditions}}
- Vorhandenes Equipment: {{equipment}}

{{adaptive_context}}

{{activity_specific_instructions}}

WICHTIGSTE REGEL ZUM FORMAT:
Deine komplette Antwort MUSS ein gültiges JSON-Array sein, das genau 1:1 dem folgenden TypeScript-Interface entspricht:
...
`
    },
    'coach-theo-chat': {
        id: 'coach-theo-chat',
        name: 'Coach Theo System Prompt',
        description: 'Der Basis-System-Prompt für den KI-Coach "Theo".',
        purpose: 'Definiert die Persönlichkeit, Regeln und Anamnese-Abläufe des Coaches.',
        template: `
Du bist "Coach Theo", ein erfahrener, einfühlsamer und motivierender Personal Trainer und Sportwissenschaftler.
Du trainierst Menschen JEDER Altersgruppe.
...
`
    },
    'workout-summary': {
        id: 'workout-summary',
        name: 'Workout-Zusammenfassung',
        description: 'Analysiert ein abgeschlossenes Workout und gibt motivierendes Feedback.',
        purpose: 'Erhöhung der Nutzerbindung und Einordnung der erbrachten Leistung.',
        template: 'Analysiere das folgende Training und erstelle eine motivierende Zusammenfassung...'
    }
};

export function getPrompt(id: string, variables: Record<string, string> = {}): string {
    const prompt = PROMPT_REGISTRY[id];
    if (!prompt) return `Prompt with ID ${id} not found.`;
    
    let template = prompt.template;
    Object.entries(variables).forEach(([key, value]) => {
        template = template.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return template;
}
