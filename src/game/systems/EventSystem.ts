// Event system: random events during show runs
import type { GameEvent, EventChoice, EventEffect, EventSeverity } from '../../types';

export interface EventDefinition {
  title: string;
  description: string;
  severity: EventSeverity;
  category: 'positive' | 'negative' | 'choice';
  choices: {
    text: string;
    effects: EventEffect[];
  }[];
}

const EVENT_DEFINITIONS: EventDefinition[] = [
  // ---- Positive events ----
  {
    title: 'Standing Ovation',
    description: 'The audience erupted in a standing ovation tonight! Word is spreading about your incredible show.',
    severity: 'minor',
    category: 'positive',
    choices: [{ text: 'Wonderful!', effects: [{ type: 'buzz', value: 5 }] }],
  },
  {
    title: 'Celebrity Spotted',
    description: 'A famous celebrity was spotted in the audience tonight. Paparazzi are already buzzing about it.',
    severity: 'moderate',
    category: 'positive',
    choices: [{ text: 'How exciting!', effects: [{ type: 'buzz', value: 10 }] }],
  },
  {
    title: 'Glowing Review',
    description: 'The Times theater critic published a rave review calling your show "a triumph of modern theater."',
    severity: 'major',
    category: 'positive',
    choices: [{ text: 'Read the review', effects: [{ type: 'buzz', value: 15 }, { type: 'reputation', value: 2 }] }],
  },
  {
    title: 'Cast Chemistry',
    description: 'Something magical is happening on stage. The cast has found an extraordinary chemistry that elevates every scene.',
    severity: 'moderate',
    category: 'positive',
    choices: [{ text: 'Let it shine', effects: [{ type: 'quality', value: 5 }] }],
  },
  {
    title: 'Local Press Feature',
    description: 'A local newspaper ran a feature story about your theater and its impact on the neighborhood.',
    severity: 'minor',
    category: 'positive',
    choices: [{ text: 'Great coverage', effects: [{ type: 'buzz', value: 8 }] }],
  },
  {
    title: 'Award Nomination',
    description: 'Your show has been nominated for a prestigious theater award! The industry is taking notice.',
    severity: 'major',
    category: 'positive',
    choices: [{ text: 'An honor!', effects: [{ type: 'reputation', value: 5 }, { type: 'buzz', value: 15 }] }],
  },

  // ---- Negative events ----
  {
    title: 'Wardrobe Malfunction',
    description: 'A costume failure during tonight\'s performance caused an embarrassing moment. Social media is having a field day.',
    severity: 'minor',
    category: 'negative',
    choices: [{ text: 'Damage control', effects: [{ type: 'buzz', value: -5 }] }],
  },
  {
    title: 'Cast Illness',
    description: 'Your lead actor has fallen ill and will be out for several days. The understudy will fill in, but quality may suffer.',
    severity: 'moderate',
    category: 'negative',
    choices: [{ text: 'Get well soon', effects: [{ type: 'quality', value: -10 }] }],
  },
  {
    title: 'Bad Review',
    description: 'A prominent critic savaged your show, calling it "a disappointing waste of talent and potential."',
    severity: 'major',
    category: 'negative',
    choices: [{ text: 'Ignore the critics', effects: [{ type: 'buzz', value: -10 }, { type: 'reputation', value: -2 }] }],
  },
  {
    title: 'Backstage Drama',
    description: 'A heated argument erupted backstage between crew members, disrupting tonight\'s pre-show preparations.',
    severity: 'minor',
    category: 'negative',
    choices: [{ text: 'Address the issue', effects: [{ type: 'morale', value: -5 }] }],
  },
  {
    title: 'Equipment Failure',
    description: 'A critical lighting rig malfunctioned during the show. Repairs will be needed, and tonight\'s performance suffered.',
    severity: 'moderate',
    category: 'negative',
    choices: [{ text: 'Call the repair crew', effects: [{ type: 'quality', value: -8 }, { type: 'cash', value: -5000 }] }],
  },

  // ---- Choice events ----
  {
    title: 'Investor Offer',
    description: 'A wealthy patron is offering $50,000 in exchange for 20% of your show\'s future revenue. It\'s quick cash, but at a cost.',
    severity: 'major',
    category: 'choice',
    choices: [
      { text: 'Accept the offer', effects: [{ type: 'cash', value: 50000 }] },
      { text: 'Decline politely', effects: [] },
    ],
  },
  {
    title: 'Press Interview',
    description: 'A reporter wants an exclusive interview. It could be great publicity, but they\'re known for tough questions.',
    severity: 'moderate',
    category: 'choice',
    choices: [
      { text: 'Take the risk', effects: [{ type: 'buzz', value: Math.random() > 0.4 ? 10 : -5 }] },
      { text: 'Decline the interview', effects: [] },
    ],
  },
  {
    title: 'Show Extension Offer',
    description: 'Due to demand, the venue is offering to extend your run by 30 days — but they want $25,000 for the extended booking.',
    severity: 'moderate',
    category: 'choice',
    choices: [
      { text: 'Extend the run ($25K)', effects: [{ type: 'cash', value: -25000 }, { type: 'buzz', value: 5 }] },
      { text: 'Keep original schedule', effects: [] },
    ],
  },
  {
    title: 'Rival Theater',
    description: 'A competitor has opened a flashy new show nearby, pulling attention away from your production.',
    severity: 'moderate',
    category: 'choice',
    choices: [
      { text: 'Counter with marketing ($10K)', effects: [{ type: 'cash', value: -10000 }, { type: 'buzz', value: 8 }] },
      { text: 'Ignore them', effects: [{ type: 'buzz', value: -5 }] },
    ],
  },
];

const EVENT_CHANCE_PER_DAY = 0.15;

/**
 * Roll for a random event. Returns null if no event triggers.
 */
export function rollForEvent(currentDay: number): GameEvent | null {
  if (Math.random() > EVENT_CHANCE_PER_DAY) {
    return null;
  }

  const definition = EVENT_DEFINITIONS[Math.floor(Math.random() * EVENT_DEFINITIONS.length)];

  const choices: EventChoice[] = definition.choices.map((c) => ({
    id: crypto.randomUUID(),
    text: c.text,
    effects: c.effects,
  }));

  return {
    id: crypto.randomUUID(),
    title: definition.title,
    description: definition.description,
    severity: definition.severity,
    day: currentDay,
    choices,
    resolved: definition.category !== 'choice', // auto-resolve non-choice events
  };
}

/**
 * Check if an event auto-resolves (only one choice = no real decision needed).
 */
export function isAutoResolve(event: GameEvent): boolean {
  return event.choices.length <= 1;
}

/**
 * Get the effects from resolving an event with a specific choice.
 */
export function getEventEffects(event: GameEvent, choiceId: string): EventEffect[] {
  const choice = event.choices.find((c) => c.id === choiceId);
  return choice?.effects ?? [];
}
