// Event engine — one daily roll, two presentations (spec):
//   passive events  → newspaper-ticker toasts, applied immediately
//   decision events → auto-pause + playbill-styled modal with 2–3 choices
//
// Content: 10 new street/era events here, plus the PRESERVED 15 Broadway
// Tycoon theatre events (EVENT_DEFINITIONS) mapped onto TD effects and aimed
// at a random running production.

import { EVENT_DEFINITIONS } from '../systems/EventSystem';
import type { TDState } from '../../types/td';

export interface TDEffect {
  type: 'cash' | 'momentum' | 'qualityNudge' | 'litterBurst' | 'spawnMult' | 'condition' | 'surge' | 'readiness';
  value: number;
  /** For spawnMult: how many days it lasts. */
  days?: number;
}

export interface TDChoice {
  text: string;
  effects: TDEffect[];
}

export interface TDEvent {
  id: string;
  title: string;
  description: string;
  /** street events stand alone; theatre events need a target production. */
  scope: 'street' | 'theatre';
  /** Minimum era (0-based), optional. */
  minEra?: number;
  choices: TDChoice[];
}

// --- the new street/era events (content floor: ≥8 — these are 10) ------------------

export const STREET_EVENTS: TDEvent[] = [
  {
    id: 'street_celebrity',
    title: 'Celebrity Stroll',
    description: 'A very famous face was photographed walking your street "incognito" in enormous sunglasses. The internet has decided this means something.',
    scope: 'street',
    choices: [{ text: 'Say nothing. Smile.', effects: [{ type: 'spawnMult', value: 1.5, days: 2 }] }],
  },
  {
    id: 'street_festival',
    title: 'Street Festival Permit',
    description: 'The neighborhood association wants to run a weekend street festival outside your theatres. Loud, crowded, sticky — and very good for business.',
    scope: 'street',
    choices: [
      { text: 'Sponsor it ($1,200)', effects: [{ type: 'cash', value: -1200 }, { type: 'spawnMult', value: 1.7, days: 3 }] },
      { text: 'Decline politely', effects: [] },
    ],
  },
  {
    id: 'street_watermain',
    title: 'Water Main Break',
    description: 'A pipe under the road gave up at 4 a.m. The street is a shallow river and the cleanup crew wants overtime.',
    scope: 'street',
    choices: [
      { text: 'Pay for fast repairs ($2,000)', effects: [{ type: 'cash', value: -2000 }] },
      { text: 'Let the city handle it', effects: [{ type: 'litterBurst', value: 6 }, { type: 'spawnMult', value: 0.6, days: 2 }] },
    ],
  },
  {
    id: 'street_filmcrew',
    title: 'Film Crew Inquiry',
    description: 'A location scout wants to shoot a moody night scene on your street. They pay well and break things occasionally.',
    scope: 'street',
    choices: [
      { text: 'Take the fee ($3,500)', effects: [{ type: 'cash', value: 3500 }, { type: 'spawnMult', value: 0.7, days: 1 }] },
      { text: 'Protect the evening trade', effects: [] },
    ],
  },
  {
    id: 'street_poacher',
    title: 'Poaching Letter',
    description: 'The rival district across town sent your best cast members flattering letters and a fruit basket. The nerve. The NERVE.',
    scope: 'theatre',
    minEra: 1,
    choices: [
      { text: 'Counter with a bonus ($1,500)', effects: [{ type: 'cash', value: -1500 }, { type: 'momentum', value: 0.05 }] },
      { text: 'Trust the company', effects: [{ type: 'momentum', value: -0.12 }] },
    ],
  },
  {
    id: 'street_blackout',
    title: 'Grid Flicker',
    description: 'Half the block lost power for an hour at dusk. Marquees dark, fridges warm, tempers short.',
    scope: 'street',
    choices: [{ text: 'Light candles, carry on', effects: [{ type: 'spawnMult', value: 0.65, days: 1 }] }],
  },
  {
    id: 'street_patron_gift',
    title: 'An Envelope, No Note',
    description: 'A regular at the stage door pressed an envelope into your hand and walked off. It contains cash and a pressed violet.',
    scope: 'street',
    choices: [{ text: 'Keep the violet too', effects: [{ type: 'cash', value: 1800 }] }],
  },
  {
    id: 'street_graffiti',
    title: 'Overnight Murals',
    description: 'Someone redecorated three walls overnight. It is either vandalism or outsider art, depending on which paper you read.',
    scope: 'street',
    choices: [
      { text: 'Scrub it off ($600)', effects: [{ type: 'cash', value: -600 }] },
      { text: 'Call it an installation', effects: [{ type: 'litterBurst', value: 3 }, { type: 'spawnMult', value: 1.2, days: 2 }] },
    ],
  },
  {
    id: 'street_busker',
    title: 'The Busker Question',
    description: 'A violinist has claimed the corner. Half your patrons love her, the box office can hear nothing but Vivaldi.',
    scope: 'street',
    choices: [
      { text: 'License her ($300)', effects: [{ type: 'cash', value: -300 }, { type: 'spawnMult', value: 1.25, days: 3 }] },
      { text: 'Move her along', effects: [] },
    ],
  },
  {
    id: 'street_rival_gala',
    title: 'Rival District Gala',
    description: 'The rival district threw a gala with searchlights and fireworks. Tonight, your street feels like the quiet sibling.',
    scope: 'street',
    minEra: 2,
    choices: [{ text: 'Their night. Ours is coming.', effects: [{ type: 'spawnMult', value: 0.7, days: 1 }] }],
  },
];

// --- the preserved Broadway Tycoon theatre events ------------------------------------

/** Map legacy effect vocabulary onto TD knobs. Legacy buzz/reputation/morale
 *  scale onto momentum; quality onto momentum for a running show. */
export function legacyTheatreEvents(): TDEvent[] {
  return EVENT_DEFINITIONS.map((e, i) => ({
    id: `legacy_${i}_${e.title.toLowerCase().replace(/\W+/g, '_')}`,
    title: e.title,
    description: e.description,
    scope: 'theatre' as const,
    choices: e.choices.map((c) => ({
      text: c.text,
      effects: c.effects.flatMap((fx): TDEffect[] => {
        switch (fx.type) {
          case 'cash':
            return [{ type: 'cash', value: fx.value }];
          case 'buzz':
            return [{ type: 'momentum', value: fx.value / 100 }];
          case 'reputation':
            return [{ type: 'momentum', value: fx.value / 120 }];
          case 'morale':
            return [{ type: 'momentum', value: fx.value / 160 }];
          case 'quality':
            return [{ type: 'momentum', value: fx.value / 90 }];
          default:
            return [];
        }
      }),
    })),
  }));
}

export const ALL_EVENTS: TDEvent[] = [...STREET_EVENTS, ...legacyTheatreEvents()];

export function eventById(id: string): TDEvent | null {
  return ALL_EVENTS.find((e) => e.id === id) ?? null;
}

/** Daily roll. Theatre events need at least one running production. */
export function rollDailyEvent(s: TDState, runningTheatreIds: string[], chance: number): { event: TDEvent; theatreId?: string } | null {
  if (Math.random() > chance) return null;
  const eligible = ALL_EVENTS.filter((e) => {
    if (e.minEra !== undefined && s.street.era < e.minEra) return false;
    if (e.scope === 'theatre' && runningTheatreIds.length === 0) return false;
    return true;
  });
  if (eligible.length === 0) return null;
  const event = eligible[Math.floor(Math.random() * eligible.length)];
  const theatreId =
    event.scope === 'theatre' ? runningTheatreIds[Math.floor(Math.random() * runningTheatreIds.length)] : undefined;
  return { event, theatreId };
}
