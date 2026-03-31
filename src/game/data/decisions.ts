import type { DirectorDecision } from '../../types';

export const DIRECTOR_DECISIONS: DirectorDecision[] = [
  {
    id: 'rehearsal_focus',
    title: 'Rehearsal Focus',
    description: 'The cast is asking for direction. How should rehearsal time be spent?',
    optionA: {
      label: 'Focus on choreography',
      description: '+3% quality, +1 rehearsal day',
      effects: [
        { type: 'quality', value: 3 },
        { type: 'days', value: 1 },
      ],
    },
    optionB: {
      label: 'Run full scenes',
      description: '+5% readiness, no quality bonus',
      effects: [
        { type: 'readiness', value: 5 },
      ],
    },
  },
  {
    id: 'lead_request',
    title: "Lead's Request",
    description: 'Your lead wants to try something different with a key scene.',
    optionA: {
      label: 'Let them improvise',
      description: '+5% quality (90% chance), risk: -3% readiness (10% chance)',
      effects: [
        { type: 'quality', value: 5, chance: 0.9 },
        { type: 'readiness', value: -3, chance: 0.1 },
      ],
    },
    optionB: {
      label: 'Stick to the script',
      description: '+3% readiness, no risk',
      effects: [
        { type: 'readiness', value: 3 },
      ],
    },
  },
  {
    id: 'cast_tension',
    title: 'Cast Tension',
    description: 'Two cast members are at odds. The tension is affecting rehearsals.',
    optionA: {
      label: 'Mediate the conflict',
      description: '-$2,000, +5 morale for all',
      effects: [
        { type: 'cash', value: -2000 },
        { type: 'morale', value: 5 },
      ],
    },
    optionB: {
      label: 'Let them work it out',
      description: '50% chance +3% quality, 50% chance -5 morale',
      effects: [
        { type: 'quality', value: 3, chance: 0.5 },
        { type: 'morale', value: -5, chance: 0.5 },
      ],
    },
  },
  {
    id: 'tech_rehearsal',
    title: 'Tech Rehearsal',
    description: 'Tech week is approaching. How thorough should the run be?',
    optionA: {
      label: 'Full tech run',
      description: '+5% quality, +2 rehearsal days',
      effects: [
        { type: 'quality', value: 5 },
        { type: 'days', value: 2 },
      ],
    },
    optionB: {
      label: 'Minimal tech',
      description: 'No quality bonus, save time',
      effects: [],
    },
  },
  {
    id: 'guest_choreographer',
    title: 'Guest Choreographer',
    description: 'A respected choreographer is available for a session.',
    optionA: {
      label: 'Hire them',
      description: '-$5,000, +8% quality for musicals',
      effects: [
        { type: 'cash', value: -5000 },
        { type: 'quality', value: 8 },
      ],
    },
    optionB: {
      label: "We're fine",
      description: 'No effect',
      effects: [],
    },
  },
];

export function pickDecision(usedIds: string[]): DirectorDecision | null {
  const available = DIRECTOR_DECISIONS.filter((d) => !usedIds.includes(d.id));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}
