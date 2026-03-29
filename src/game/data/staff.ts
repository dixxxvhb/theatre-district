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
  };
}
