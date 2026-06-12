// Production logic — pure functions for the Desk pipeline. Show drafts and
// archetypes come from the PRESERVED legacy data (src/game/data/shows.ts);
// chemistry and quality are ports of the legacy formulas onto the four-role
// TD cast. Everything here is deterministic given its inputs (chemistry) or
// explicitly random (draft/candidate generation), and unit-tested.

import { PRODUCTION, UPGRADES, type UpgradeId } from '../config/balance';
import { generateShowTitle, SHOW_ARCHETYPES } from '../data/shows';
import { generateName } from '../../utils/nameGenerator';
import type { CastMember, Production, RoleSlot, ShowDraft } from '../../types/td';

export const ROLE_SLOTS: RoleSlot[] = ['lead', 'second', 'featured', 'ensemble'];

export const ROLE_LABELS: Record<RoleSlot, string> = {
  lead: 'The Lead',
  second: 'Second Lead',
  featured: 'Featured',
  ensemble: 'Ensemble Captain',
};

const PERSONALITIES = ['method', 'showboat', 'craftsman', 'free spirit', 'perfectionist', 'charmer'];

const GENRES = ['musical', 'play', 'revival', 'experimental', 'one_person_show'];

// --- generation -----------------------------------------------------------------

function rand(lo: number, hi: number): number {
  return Math.round(lo + Math.random() * (hi - lo));
}

export function draftShow(): ShowDraft {
  const names = Object.keys(SHOW_ARCHETYPES);
  const archetype = names[Math.floor(Math.random() * names.length)];
  const a = SHOW_ARCHETYPES[archetype as keyof typeof SHOW_ARCHETYPES];
  return {
    title: generateShowTitle(),
    genre: GENRES[Math.floor(Math.random() * GENRES.length)],
    archetype,
    archetypeLabel: a.label,
    scriptQuality: rand(a.scriptQualityRange[0], a.scriptQualityRange[1]),
    appeal: rand(a.appealRange[0], a.appealRange[1]),
    rightsCost: PRODUCTION.RIGHTS_COST[archetype] ?? 5_000,
  };
}

export function draftOptions(): ShowDraft[] {
  return [draftShow(), draftShow(), draftShow()];
}

/** Candidate quality scales with the role's prominence + Star Dressing Rooms. */
export function generateCandidates(slot: RoleSlot, dressingBonus: boolean): CastMember[] {
  const floor = slot === 'lead' ? 45 : slot === 'second' ? 38 : 30;
  const lift = dressingBonus ? 8 : 0;
  return Array.from({ length: 3 }, () => {
    const skill = Math.min(96, rand(floor + lift, 88 + lift));
    const starPower = rand(slot === 'lead' ? 30 : 5, slot === 'lead' ? 95 : 70);
    const points = skill + starPower;
    return {
      id: crypto.randomUUID(),
      name: generateName(),
      skill,
      starPower,
      personality: PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)],
      signingFee: Math.round((points * PRODUCTION.SIGNING_PER_POINT) / 100) * 100,
      dailyWage: Math.round(points * PRODUCTION.DAILY_WAGE_PER_POINT),
    };
  });
}

// --- chemistry (port of the legacy pair-hash approach) ----------------------------

function stringHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Deterministic pair chemistry in roughly −6..+8 — same two people, same spark. */
export function pairChemistry(a: CastMember, b: CastMember): number {
  if (a.personality === b.personality) return 4; // kindred spirits
  const h = stringHash([a.name, b.name].sort().join('+'));
  return (h % 15) - 6;
}

/** Total cast chemistry across all hired pairs, scaled to about −10..+15. */
export function castChemistry(cast: Partial<Record<RoleSlot, CastMember>>): number {
  const members = ROLE_SLOTS.map((r) => cast[r]).filter((m): m is CastMember => !!m);
  if (members.length < 2) return 0;
  let total = 0;
  let pairs = 0;
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      total += pairChemistry(members[i], members[j]);
      pairs++;
    }
  }
  return Math.round((total / pairs) * 1.8);
}

// --- upgrades ----------------------------------------------------------------------

export interface UpgradeEffects {
  buzzBonus: number; // grand_lobby — extra emission (read by buzz via theatre)
  attendanceBonus: number; // modern_box_office — flat walk-in bonus
  capacityMult: number; // house_expansion
  qualityBonus: number; // stage_renovation + tech_booth
  decayMult: number; // backstage_complex — building aging multiplier
  betterCandidates: boolean; // star_dressing
  musicalBonus: number; // orchestra_pit (musicals only)
  rehearsalMult: number; // rehearsal_hall
  ticketPremium: number; // vip_lounge — $ added without demand penalty
  takingsCut: number; // house_bar — share of nightly revenue added
  rightsDiscount: number; // scenic_storage — fraction off rights
  commissionMult: number; // production_office
  momentumDecayMult: number; // green_room
  wordOfMouthFloor: boolean; // restrooms — removes the quiet drag
  spectacleUnlocked: boolean; // fly_system — big_spectacle staging bonus
}

export function upgradeEffects(upgrades: string[] | undefined): UpgradeEffects {
  const has = (id: UpgradeId) => !!upgrades?.includes(id);
  return {
    buzzBonus: has('grand_lobby') ? 3 : 0,
    attendanceBonus: has('modern_box_office') ? 8 : 0,
    capacityMult: has('house_expansion') ? 1.15 : 1,
    qualityBonus: (has('stage_renovation') ? 5 : 0) + (has('tech_booth') ? 4 : 0),
    decayMult: has('backstage_complex') ? 0.6 : 1,
    betterCandidates: has('star_dressing'),
    musicalBonus: has('orchestra_pit') ? 8 : 0,
    rehearsalMult: has('rehearsal_hall') ? 1.5 : 1,
    ticketPremium: has('vip_lounge') ? 6 : 0,
    takingsCut: has('house_bar') ? 0.12 : 0,
    rightsDiscount: has('scenic_storage') ? 0.25 : 0,
    commissionMult: has('production_office') ? 0.5 : 1,
    momentumDecayMult: has('green_room') ? 0.6 : 1,
    wordOfMouthFloor: has('restrooms'),
    spectacleUnlocked: has('fly_system'),
  };
}

export function upgradeCost(id: UpgradeId): number {
  return UPGRADES[id].cost;
}

// --- quality -----------------------------------------------------------------------

/** Opening-night quality: script + cast + chemistry + house + polish. */
export function openingQuality(production: Production, effects: UpgradeEffects): number {
  const show = production.show;
  if (!show) return 0;
  const members = ROLE_SLOTS.map((r) => production.cast[r]).filter((m): m is CastMember => !!m);
  const avgSkill = members.length ? members.reduce((n, m) => n + m.skill, 0) / members.length : 0;
  const starBonus = Math.max(...members.map((m) => m.starPower), 0) > 80 ? 4 : 0;

  let q =
    PRODUCTION.QUALITY_BASE +
    show.scriptQuality * PRODUCTION.QUALITY_SCRIPT_WEIGHT +
    avgSkill * PRODUCTION.QUALITY_CAST_WEIGHT +
    castChemistry(production.cast) +
    starBonus +
    effects.qualityBonus;

  if (show.genre === 'musical') q += effects.musicalBonus;
  if (show.archetype === 'big_spectacle') q += effects.spectacleUnlocked ? 8 : -6; // spectacle needs a fly system
  q += production.qualityNudge;
  q += Math.max(0, production.readiness - PRODUCTION.OPEN_THRESHOLD) * PRODUCTION.POLISH_QUALITY_PER_POINT;

  return Math.round(Math.min(100, Math.max(0, q)));
}

/** Daily cast wages while rehearsing or running. */
export function dailyWages(production: Production): number {
  return ROLE_SLOTS.reduce((n, r) => n + (production.cast[r]?.dailyWage ?? 0), 0);
}

export function emptyProduction(): Production {
  return {
    stage: 'commissioning',
    cast: {},
    readiness: 0,
    rehearsalDays: 0,
    usedDecisionIds: [],
    qualityNudge: 0,
    previewDays: 0,
    belowParNights: 0,
    quality: 0,
    momentum: 1,
    ticketPrice: 0,
    lastAttendance: 0,
    gross: 0,
    runDays: 0,
  };
}
