// Peep thoughts — click any crowd member, hear one line. This is the player's
// primary diagnostic: every line telegraphs real sim state (unmet needs,
// queue pressure, street quality, the daily pulse). Funny AND true, or it
// doesn't ship.

import { AgentState, crowd, Need } from '../sim/crowd';
import { getBuzzField } from '../sim/buzzCache';
import { worldToGrid } from '../render/iso';
import { dayPhase } from '../sim/calendar';
import { useTDStore } from '../../store/store';
import { litterKey } from '../street/buzz';

const POOLS: Record<string, string[]> = {
  needShow: [
    "I hear there's a show tonight. There IS a show tonight, right?",
    'Took the train an hour for this. Curtain better be worth it.',
    "I promised my sister I'd see something with singing in it.",
    'One ticket. Front of house. Tonight. Manifesting.',
  ],
  queueing: [
    'This line builds character. I have enough character. Move.',
    "If the line doesn't move soon I'm reviewing the SIDEWALK.",
    'Twenty minutes in this line?!',
    'I can see the marquee from here. So close. So far.',
  ],
  hungry: [
    "I'd kill for a pretzel right now.",
    'Dinner first, drama second. Always.',
    'Is there anywhere to EAT on this street?',
    'My stomach is doing its own overture.',
  ],
  thirsty: [
    'A nightcap would fix me entirely.',
    'Where does a person get a drink around here?',
    'Intermission wine is a personality. Mine.',
  ],
  souvenir: [
    'I need a program, a poster, and a tote bag. In that order.',
    'If I don’t buy merch, did I even attend?',
  ],
  photo: [
    'This street is gorgeous at night.',
    'One more photo. Okay, five more photos.',
    'The lamplight here is doing something to me.',
    'Nobody back home will believe this marquee.',
  ],
  prettyStreet: [
    'Whoever planted those trees deserves a raise.',
    'Oh, the string lights are ON tonight.',
    'They keep this block beautiful. You can tell someone cares.',
  ],
  uglyStreet: [
    'Bit gloomy down this end, no?',
    'This block has seen better decades.',
    "Hmm. I've seen livelier alleys.",
  ],
  litter: [
    'Who LEFT all this? Animals. Theatre animals.',
    'A playbill graveyard. Tragic, in the wrong way.',
    'Someone should sweep this. Someone paid. Someone uniformed.',
  ],
  postShowGood: [
    'I laughed. I cried. The reviews write themselves.',
    'THAT is why I leave the house. Bravo.',
    'I would see that again tomorrow. I might.',
    'The finale! The LIGHTS! I need to sit down.',
  ],
  postShowBad: [
    'Well. The seats were comfortable.',
    "I've seen better. In a church basement. In a drought.",
    'The lead was flat and so was my soda.',
  ],
  turnedAway: [
    'SOLD OUT? I wore my good coat!',
    'No seats left. This street needs a bigger house.',
  ],
  leaving: [
    'Lovely night. My feet disagree.',
    "Last train's calling my name.",
    'Home. Tea. Bed. The full trilogy.',
  ],
  curtainQuiet: [
    'Shh — everyone decent is inside watching.',
    'You can hear the orchestra from the sidewalk. Nice spot, this.',
  ],
  broke: [
    'Wallet says no. Wallet has said no for an hour.',
    "I'm down to bus fare and dreams.",
  ],
  generic: [
    'Nice evening for it, whatever it is.',
    'I love this city. Loudly. At strangers.',
    'My feet hurt in a cultured way.',
  ],
};

function pick(pool: string[], seed: number): string {
  return pool[Math.abs(seed) % pool.length];
}

/** A thought for agent i, derived from live sim + street state. */
export function thoughtFor(i: number): string {
  const s = useTDStore.getState();
  const seed = Math.floor(crowd.posX[i] * 7 + crowd.posY[i] * 13) + s.time.day;
  const state = crowd.state[i];
  const need = crowd.need[i];
  const phase = dayPhase(s.time.tickOfDay);

  if (state === AgentState.QUEUEING) return pick(POOLS.queueing, seed);
  if (state === AgentState.LEAVING) return pick(POOLS.leaving, seed);
  if (state === AgentState.PHOTO) return pick(POOLS.photo, seed);

  // Local context: buzz + litter where they stand.
  const { gx, gy } = worldToGrid(crowd.posX[i], crowd.posY[i]);
  const x = Math.round(gx);
  const y = Math.round(gy);
  const { field, cols } = getBuzzField(s.street, s.upkeep);
  const localBuzz = field[y * cols + x] ?? 0;
  const localLitter = (s.upkeep.litter[litterKey(x, y)] ?? 0) > 1.5;

  if (localLitter) return pick(POOLS.litter, seed);
  if (crowd.satisfied[i] === 1 && phase === 'postshow') return pick(POOLS.postShowGood, seed);
  if (crowd.satisfied[i] === 0 && phase === 'postshow' && state === AgentState.WALKING && need === Need.REST)
    return pick(POOLS.postShowBad, seed);
  if (crowd.wallet[i] < 8) return pick(POOLS.broke, seed);
  if (need === Need.SHOW) return pick(POOLS.needShow, seed);
  if (need === Need.FOOD) return pick(POOLS.hungry, seed);
  if (need === Need.DRINK) return pick(POOLS.thirsty, seed);
  if (need === Need.SOUVENIR) return pick(POOLS.souvenir, seed);
  if (phase === 'curtain') return pick(POOLS.curtainQuiet, seed);
  if (localBuzz > 6) return pick(POOLS.prettyStreet, seed);
  if (localBuzz < -1) return pick(POOLS.uglyStreet, seed);
  return pick(POOLS.generic, seed);
}

/** Count of authored lines (content-floor check: ~40). */
export const THOUGHT_LINE_COUNT = Object.values(POOLS).reduce((n, p) => n + p.length, 0);
