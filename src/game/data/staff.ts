// Staff data: crew role definitions and candidate generation
import type { CrewMember, CrewRole, CastMember } from '../../types';
import { GAME_CONSTANTS } from './constants';
import { generateName } from '../../utils/nameGenerator';

export interface CrewRoleDefinition {
  role: CrewRole;
  label: string;
  baseSalary: number;
  description: string;
  musicalOnly: boolean;
  required: boolean;           // must hire before rehearsal
  requiredComplexity: number;  // required if show complexity >= this (0 = always if required)
}

export const CREW_ROLE_DEFINITIONS: CrewRoleDefinition[] = [
  {
    role: 'director',
    label: 'Director',
    baseSalary: GAME_CONSTANTS.CREW.DIRECTOR_SALARY_WEEKLY,
    description: 'Skill feeds into show quality formula',
    musicalOnly: false,
    required: true,
    requiredComplexity: 0,
  },
  {
    role: 'stage_manager',
    label: 'Stage Manager',
    baseSalary: GAME_CONSTANTS.CREW.STAGE_MANAGER_SALARY_WEEKLY,
    description: 'Reduces event severity by 20%',
    musicalOnly: false,
    required: true,
    requiredComplexity: 3,
  },
  {
    role: 'lighting_designer',
    label: 'Lighting Designer',
    baseSalary: GAME_CONSTANTS.CREW.LIGHTING_DESIGNER_SALARY_WEEKLY,
    description: '+5% show quality',
    musicalOnly: false,
    required: false,
    requiredComplexity: 0,
  },
  {
    role: 'sound_designer',
    label: 'Sound Designer',
    baseSalary: GAME_CONSTANTS.CREW.SOUND_DESIGNER_SALARY_WEEKLY,
    description: '+5% show quality',
    musicalOnly: false,
    required: false,
    requiredComplexity: 0,
  },
  {
    role: 'costume_designer',
    label: 'Costume Designer',
    baseSalary: GAME_CONSTANTS.CREW.COSTUME_DESIGNER_SALARY_WEEKLY,
    description: '+3% quality, +5% audience satisfaction',
    musicalOnly: false,
    required: false,
    requiredComplexity: 0,
  },
  {
    role: 'set_designer',
    label: 'Set Designer',
    baseSalary: GAME_CONSTANTS.CREW.SET_DESIGNER_SALARY_WEEKLY,
    description: 'Reduces production budget by 15%',
    musicalOnly: false,
    required: false,
    requiredComplexity: 0,
  },
  {
    role: 'choreographer',
    label: 'Choreographer',
    baseSalary: GAME_CONSTANTS.CREW.CHOREOGRAPHER_SALARY_WEEKLY,
    description: 'Required for musicals. +10% quality (musical) / +3% (other)',
    musicalOnly: true,
    required: true,
    requiredComplexity: 0,
  },
  {
    role: 'music_director',
    label: 'Music Director',
    baseSalary: GAME_CONSTANTS.CREW.MUSIC_DIRECTOR_SALARY_WEEKLY,
    description: 'Required for musicals. +8% quality',
    musicalOnly: true,
    required: true,
    requiredComplexity: 0,
  },
  {
    role: 'publicist',
    label: 'Publicist',
    baseSalary: GAME_CONSTANTS.CREW.PUBLICIST_SALARY_WEEKLY,
    description: '+15% buzz effectiveness',
    musicalOnly: false,
    required: false,
    requiredComplexity: 0,
  },
  {
    role: 'house_manager',
    label: 'House Manager',
    baseSalary: GAME_CONSTANTS.CREW.HOUSE_MANAGER_SALARY_WEEKLY,
    description: '+5% ticket sales',
    musicalOnly: false,
    required: false,
    requiredComplexity: 0,
  },
];

// ---- Personality pools ----

const CREW_PERSONALITIES = [
  'Perfectionist — never satisfied, but the work shows',
  'Old school — learned the craft on Broadway in the \'80s',
  'Fresh out of grad school — full of ideas, short on experience',
  'Industry veteran — knows everyone, name-drops constantly',
  'Quiet genius — barely speaks, delivers miracles',
  'Control freak — micromanages everything but catches every mistake',
  'Party animal — unreliable mornings, brilliant afternoons',
  'Former performer — brings actor empathy to the role',
  'Workaholic — first in, last out, eats lunch at the tech table',
  'Zen master — unflappable under pressure, maddening when you need urgency',
  'Gossip — knows every backstage secret before it happens',
  'Mentor figure — younger crew members adore them',
  'Burned out — coasting on reputation, still better than most',
  'Scrappy improviser — can fix anything with gaff tape and willpower',
  'Techno-wizard — automates everything, baffles everyone over 40',
  'Union loyalist — knows the contract by heart, quotes it daily',
  'Night owl — does their best work after midnight',
  'Safety fanatic — the harnesses will be inspected, thank you very much',
  'Artist at heart — treats every design like their magnum opus',
  'Mercenary — excellent work, zero loyalty, always interviewing',
  'Old friends with the venue owner — gets away with everything',
  'Overqualified — should be running a bigger operation',
  'Self-taught — no degree, just decades of doing the thing',
  'Chaos gremlin — somehow the chaos always produces results',
  'Detail-obsessed — notices the one crooked gel frame from 80 feet away',
  'Collaborative spirit — makes everyone around them better',
  'Clock-watcher — does great work, but at 5:01 PM they vanish',
  'Emotionally invested — cries at every tech rehearsal, in a good way',
  'Cool under fire — the building could collapse and they\'d check their cue sheet',
  'Has opinions — lots of them, loudly, about everything',
  'Minimalist — does more with less, philosophically opposed to excess',
  'Overprepared — has a backup plan for the backup plan\'s backup plan',
];

const CAST_PERSONALITIES = [
  'Triple threat — sings, dances, acts. All competently, none brilliantly.',
  'Scene stealer — upstages everyone but audiences love it',
  'Method to the madness — disappears into every role',
  'Chronic ad-libber — keeps the cast on their toes',
  'Social media darling — 500K followers, decent talent',
  'Broadway baby — grew up backstage, theater is in their blood',
  'Crossover star — came from TV, still learning live performance',
  'Classically trained — Juilliard pedigree, Royal Shakespeare attitude',
  'Raw talent — untrained but magnetic, catches on fast',
  'Ensemble lifer — never gets the lead, holds every show together',
  'Diva in training — the talent is there, so is the ego',
  'Comedian at heart — finds the funny in every script',
  'Emotionally available — can cry on cue, seven shows a week',
  'Physical performer — movement is their language, dialogue is secondary',
  'Belter — that voice fills the house without a mic',
  'Subtle and devastating — audiences lean forward when they\'re on stage',
  'Veteran of 12 national tours — has done this role, or one like it, everywhere',
  'Fresh face — just moved to the city, everything is still exciting',
  'Character actor — born to play the weird uncle, the quirky neighbor',
  'Leading type — walks into a room and everyone notices',
  'Intensely private — no social media, no interviews, just the work',
  'Generous scene partner — makes everyone they work with look better',
  'Drama magnet — talented but there\'s always something happening',
  'Musical theater nerd — can sing every Sondheim lyric ever written',
  'Dance captain energy — learns choreo in one pass, teaches it to everyone',
  'Late bloomer — came to theater at 35 after a career in finance',
  'Kid from community theater — still has that raw, unpolished joy',
  'Award winner — has a shelf of trophies and zero pretension about it',
  'Understudy legend — has gone on 47 times, killed it every time',
  'Quiet confidence — doesn\'t need to prove anything, just performs',
  'Stage combat specialist — every fight scene looks terrifyingly real',
  'Vocal chameleon — can do any accent, any register, any style',
  'Always early — in the theater two hours before call, running lines',
  'Prankster — keeps morale high with elaborate backstage bits',
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getCrewRoleDefinition(role: CrewRole): CrewRoleDefinition | undefined {
  return CREW_ROLE_DEFINITIONS.find((d) => d.role === role);
}

/**
 * Generate a random crew candidate for a given role.
 * Skill ranges from 20-80, scaling slightly with reputation.
 */
export function generateCrewCandidate(role: CrewRole, reputation: number = 0): CrewMember {
  const def = getCrewRoleDefinition(role);
  const baseSalary = def?.baseSalary ?? 800;

  // Skill: 20-80 base, with reputation adding up to +15
  const repBonus = Math.floor((reputation / 100) * 15);
  const skill = Math.min(100, Math.max(20, Math.floor(Math.random() * 61) + 20 + repBonus));

  // Salary scales with skill: baseSalary * (0.5 + skill/100)
  const salary = Math.round(baseSalary * (0.5 + skill / 100));

  return {
    id: crypto.randomUUID(),
    name: generateName(),
    role,
    skill,
    salary,
    morale: 70 + Math.floor(Math.random() * 20),
    hired: false,
    personality: randomFrom(CREW_PERSONALITIES),
  };
}

/**
 * Generate a random cast candidate.
 */
export function generateCastCandidate(): CastMember {
  const talent = 20 + Math.floor(Math.random() * 61); // 20-80
  const starPower = Math.floor(Math.random() * 50);    // 0-49, stars are rare
  // Occasional star: 10% chance of high star power
  const finalStarPower = Math.random() < 0.1
    ? 50 + Math.floor(Math.random() * 40)
    : starPower;

  // Salary based on talent + star power
  const baseCastSalary = 500;
  const salary = Math.round(baseCastSalary * (0.5 + talent / 100 + finalStarPower / 200));

  return {
    id: crypto.randomUUID(),
    name: generateName(),
    talent,
    starPower: finalStarPower,
    salary,
    morale: 70 + Math.floor(Math.random() * 20),
    chemistry: 50 + Math.floor(Math.random() * 30),
    roleId: '',
    personality: randomFrom(CAST_PERSONALITIES),
  };
}
