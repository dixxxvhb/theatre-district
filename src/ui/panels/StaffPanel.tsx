import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CREW_ROLE_DEFINITIONS, generateCrewCandidate } from '../../game/data/staff';
import { GAME_CONSTANTS } from '../../game/data/constants';
import type { CrewMember, CrewRole } from '../../types';

/* ── role → color map for crew badges & bulletin pins ── */
const ROLE_COLORS: Record<CrewRole, string> = {
  director: '#ef4444',
  stage_manager: '#f59e0b',
  music_director: '#8b5cf6',
  choreographer: '#ec4899',
  tech_director: '#6366f1',
  costume_designer: '#14b8a6',
  lighting_designer: '#facc15',
  sound_designer: '#3b82f6',
  set_designer: '#f97316',
  publicist: '#a3e635',
  house_manager: '#64748b',
};

/* ── helpers ── */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getRoleShort(role: CrewRole): string {
  const map: Record<CrewRole, string> = {
    director: 'DIR',
    stage_manager: 'SM',
    music_director: 'MD',
    choreographer: 'CHO',
    tech_director: 'TD',
    costume_designer: 'COS',
    lighting_designer: 'LX',
    sound_designer: 'SND',
    set_designer: 'SET',
    publicist: 'PR',
    house_manager: 'HM',
  };
  return map[role] ?? role.slice(0, 3).toUpperCase();
}

/* ── Skill bar (color-coded) ── */
function SkillBar({ value }: { value: number }) {
  const color =
    value > 70 ? '#10b981' :
    value >= 40 ? '#eab308' :
    '#ef4444';

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] text-gray-400 w-5 text-right">{value}</span>
    </div>
  );
}

/* ── Candidate card ── */
function HireCandidateCard({
  candidate,
  onHire,
}: {
  candidate: CrewMember;
  onHire: () => void;
}) {
  const roleColor = ROLE_COLORS[candidate.role] ?? '#888';

  return (
    <div className="p-2.5 rounded-lg bg-black/40 border border-gray-800/40 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm text-gray-200 font-medium truncate">{candidate.name}</div>
          {candidate.personality && (
            <div className="text-[10px] italic text-gray-500 leading-tight mt-0.5">
              {candidate.personality}
            </div>
          )}
        </div>
        <span
          className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
          style={{ backgroundColor: `${roleColor}20`, color: roleColor }}
        >
          {getRoleShort(candidate.role)}
        </span>
      </div>

      <SkillBar value={candidate.skill} />

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-500">
          ${candidate.salary.toLocaleString()}/wk
        </span>
        <button
          onClick={onHire}
          className="px-3 py-1 text-xs font-semibold rounded-lg bg-amber-900/40 border border-amber-700/50 text-amber-200 hover:bg-amber-900/60 transition-all cursor-pointer"
        >
          Hire
        </button>
      </div>
    </div>
  );
}

/* ── Bulletin board pin (hired crew) ── */
function BoardPin({ member }: { member: CrewMember }) {
  const color = ROLE_COLORS[member.role] ?? '#888';
  return (
    <div
      className="flex flex-col items-center justify-center rounded-md text-center"
      style={{
        width: 38,
        height: 38,
        backgroundColor: `${color}25`,
        border: `1px solid ${color}50`,
      }}
      title={`${member.name} (${getRoleShort(member.role)}) — Skill ${member.skill}`}
    >
      <span className="text-[10px] font-bold leading-none" style={{ color }}>
        {getInitials(member.name)}
      </span>
      <span className="text-[7px] text-gray-500 leading-none mt-0.5">
        {getRoleShort(member.role)}
      </span>
    </div>
  );
}

/* ── Empty pin slot ── */
function EmptySlot() {
  return (
    <div
      className="flex items-center justify-center rounded-md border border-dashed border-gray-700/40 bg-gray-900/20"
      style={{ width: 38, height: 38 }}
    >
      <span className="text-gray-700 text-[10px]">+</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   STAFF PANEL — "The Office"
   ══════════════════════════════════════════════════════════ */
export function StaffPanel() {
  const crew = useGameStore((s) => s.crew);
  const hireCrew = useGameStore((s) => s.hireCrew);
  const fireCrew = useGameStore((s) => s.fireCrew);
  const reputation = useGameStore((s) => s.reputation.score);
  const setPhase = useGameStore((s) => s.setPhase);
  const shows = useGameStore((s) => s.shows);
  const activeShowId = useGameStore((s) => s.activeShowId);
  const properties = useGameStore((s) => s.properties);
  const activePropertyId = useGameStore((s) => s.activePropertyId);

  const activeShow = shows.find((s) => s.id === activeShowId);
  const activeProperty = properties.find((p) => p.id === activePropertyId);
  const isMusical = activeShow?.genre === 'musical';
  const showComplexity = activeShow?.complexity ?? 1;

  // Determine max crew from office
  const officeRoom = activeProperty?.rooms.find((r) => r.type === 'office' && !r.isConstructing);
  const officeLevel = officeRoom?.level ?? 0;
  const maxCrew =
    officeLevel === 0
      ? GAME_CONSTANTS.CREW.NO_OFFICE_MAX_CREW
      : officeLevel >= 2
        ? GAME_CONSTANTS.CREW.UPGRADED_OFFICE_MAX_CREW
        : GAME_CONSTANTS.CREW.BASIC_OFFICE_MAX_CREW;

  const [expandedRole, setExpandedRole] = useState<CrewRole | null>(null);
  const [candidates, setCandidates] = useState<Record<string, CrewMember[]>>({});

  // Filter roles based on show type
  const visibleRoles = CREW_ROLE_DEFINITIONS.filter((def) => {
    if (def.musicalOnly && !isMusical) return false;
    return true;
  });

  const hiredCrew = crew.filter((c) => c.hired);
  const atCapacity = hiredCrew.length >= maxCrew;

  // Director is required always
  const hasDirector = hiredCrew.some((c) => c.role === 'director');
  // Stage manager required if complexity > 2
  const needsStageManager = showComplexity > 2;
  const hasStageManager = hiredCrew.some((c) => c.role === 'stage_manager');
  // Musical requires choreographer + music director
  const hasChoreographer = hiredCrew.some((c) => c.role === 'choreographer');
  const hasMusicDirector = hiredCrew.some((c) => c.role === 'music_director');

  const canProceed =
    hasDirector &&
    (!needsStageManager || hasStageManager) &&
    (!isMusical || (hasChoreographer && hasMusicDirector));

  const handleToggleCandidates = (role: CrewRole) => {
    if (expandedRole === role) {
      setExpandedRole(null);
      return;
    }
    // Generate candidates if not yet generated
    if (!candidates[role]) {
      const newCandidates = Array.from({ length: 3 }, () =>
        generateCrewCandidate(role, reputation),
      );
      setCandidates((prev) => ({ ...prev, [role]: newCandidates }));
    }
    setExpandedRole(role);
  };

  const handleHire = (candidate: CrewMember) => {
    hireCrew(candidate);
    setExpandedRole(null);
    // Remove from candidates
    setCandidates((prev) => ({
      ...prev,
      [candidate.role]: (prev[candidate.role] ?? []).filter((c) => c.id !== candidate.id),
    }));
  };

  const handleFire = (memberId: string) => {
    fireCrew(memberId);
  };

  const handleProceedToAuditions = () => {
    setPhase('audition');
  };

  // Weekly crew cost
  const weeklyCost = hiredCrew.reduce((sum, c) => sum + c.salary, 0);

  // Slots for the bulletin board
  const emptySlots = Math.max(0, maxCrew - hiredCrew.length);

  return (
    <div className="w-80 min-w-[320px] h-full bg-gray-950/95 backdrop-blur-sm border-l border-amber-900/30 flex flex-col overflow-hidden">

      {/* ── Office Scene Header ── */}
      <div className="relative overflow-hidden">
        {/* Desk surface */}
        <div
          className="px-4 pt-4 pb-3"
          style={{
            background: 'linear-gradient(180deg, #1a1510 0%, #1f1a14 60%, #2a2018 100%)',
          }}
        >
          <h2
            className="text-lg font-bold tracking-wide"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: '#d4a574' }}
          >
            The Office
          </h2>
          {activeShow && (
            <p className="text-gray-500 text-xs mt-0.5">
              Staffing "{activeShow.title}"
            </p>
          )}

          {/* Desk items — cost & capacity */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">
              {hiredCrew.length}/{maxCrew} crew
            </span>
            <span className="text-xs text-amber-400/70">
              ${weeklyCost.toLocaleString()}/wk
            </span>
          </div>
        </div>

        {/* Desk edge */}
        <div
          className="h-1"
          style={{
            background: 'linear-gradient(90deg, #5c4a32 0%, #8b6f4e 50%, #5c4a32 100%)',
          }}
        />

        {/* ── Bulletin Board ── */}
        <div
          className="px-3 py-3"
          style={{
            background: 'linear-gradient(180deg, #2d2418 0%, #1e1a14 100%)',
            borderBottom: '1px solid rgba(139,111,78,0.2)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[10px] uppercase tracking-widest text-amber-700/60 font-semibold"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              Crew Board
            </span>
            {!officeRoom && (
              <span className="text-[9px] text-yellow-600/60">No office</span>
            )}
          </div>

          {/* Pin grid */}
          <div className="flex flex-wrap gap-1.5">
            {hiredCrew.map((member) => (
              <BoardPin key={member.id} member={member} />
            ))}
            {Array.from({ length: emptySlots }).map((_, i) => (
              <EmptySlot key={`empty-${i}`} />
            ))}
          </div>

          {/* Capacity notice */}
          {atCapacity && (
            <p className="text-[10px] text-amber-500/60 mt-2 text-center">
              Board is full — build/upgrade an Office
            </p>
          )}
        </div>
      </div>

      {/* ── Hired Crew List ── */}
      {hiredCrew.length > 0 && (
        <div className="px-3 py-2 border-b border-gray-800/30 space-y-1">
          <span className="text-[10px] uppercase tracking-widest text-gray-600 font-semibold">
            Active Crew
          </span>
          {hiredCrew.map((member) => {
            const roleColor = ROLE_COLORS[member.role] ?? '#888';
            return (
              <div
                key={member.id}
                className="flex items-center gap-2 py-1 px-2 rounded-md bg-emerald-950/15 border border-emerald-900/20"
              >
                <div
                  className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold shrink-0"
                  style={{ backgroundColor: `${roleColor}25`, color: roleColor }}
                >
                  {getInitials(member.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-200 truncate">{member.name}</div>
                  <div className="text-[9px] text-gray-600">
                    {getRoleShort(member.role)} | Skill {member.skill} | ${member.salary}/wk
                  </div>
                </div>
                <button
                  onClick={() => handleFire(member.id)}
                  className="text-[9px] text-red-500/40 hover:text-red-400 transition-colors cursor-pointer shrink-0"
                >
                  Fire
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Role Hiring List ── */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <span className="text-[10px] uppercase tracking-widest text-gray-600 font-semibold px-1">
          Open Positions
        </span>
        {visibleRoles.map((def) => {
          const hiredMember = hiredCrew.find((c) => c.role === def.role);
          const isExpanded = expandedRole === def.role;
          const roleCandidates = candidates[def.role] ?? [];
          const isRequired =
            (def.role === 'director') ||
            (def.role === 'stage_manager' && needsStageManager) ||
            (def.musicalOnly && isMusical && def.required);
          const roleColor = ROLE_COLORS[def.role] ?? '#888';

          // Skip already hired roles
          if (hiredMember) return null;

          return (
            <div key={def.role} className="rounded-lg overflow-hidden">
              {/* Role row */}
              <div
                className={`p-2.5 border transition-all ${
                  isRequired
                    ? 'bg-red-950/10 border-red-900/20'
                    : 'bg-black/30 border-gray-800/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: roleColor }}
                      />
                      <span className="text-sm text-gray-200 font-medium">{def.label}</span>
                      {isRequired && (
                        <span className="text-[9px] text-red-400 uppercase tracking-wider">req</span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-600 mt-0.5 pl-3.5">{def.description}</p>
                  </div>

                  <button
                    onClick={() => handleToggleCandidates(def.role)}
                    disabled={atCapacity}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-all cursor-pointer border shrink-0 ml-2 ${
                      atCapacity
                        ? 'bg-gray-900/40 border-gray-800/40 text-gray-600 cursor-not-allowed'
                        : isExpanded
                          ? 'bg-gray-800/60 border-gray-700/50 text-gray-300'
                          : 'bg-amber-900/30 border-amber-800/40 text-amber-300 hover:bg-amber-900/50'
                    }`}
                  >
                    {isExpanded ? 'Cancel' : 'Hire'}
                  </button>
                </div>
              </div>

              {/* Candidate list */}
              {isExpanded && (
                <div className="p-2 space-y-1.5 bg-gray-900/30 border-x border-b border-gray-800/30 rounded-b-lg">
                  {roleCandidates.map((candidate) => (
                    <HireCandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      onHire={() => handleHire(candidate)}
                    />
                  ))}
                  <button
                    onClick={() => {
                      const newCandidates = Array.from({ length: 3 }, () =>
                        generateCrewCandidate(def.role, reputation),
                      );
                      setCandidates((prev) => ({ ...prev, [def.role]: newCandidates }));
                    }}
                    className="w-full py-1.5 text-[10px] text-gray-500 hover:text-gray-400 transition-colors cursor-pointer"
                  >
                    Refresh candidates
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Proceed ── */}
      <div className="flex-shrink-0 p-3 border-t border-amber-900/20 space-y-2">
        <button
          onClick={handleProceedToAuditions}
          disabled={!canProceed}
          className={`w-full py-2.5 text-sm font-semibold rounded-xl transition-all cursor-pointer border ${
            canProceed
              ? 'bg-emerald-900/40 border-emerald-700/50 text-emerald-200 hover:bg-emerald-900/60'
              : 'bg-gray-900/40 border-gray-800/40 text-gray-600 cursor-not-allowed'
          }`}
        >
          {canProceed ? 'Proceed to Auditions' : 'Hire required crew first'}
        </button>

        {!hasDirector && (
          <p className="text-[10px] text-red-400/70 text-center">Director is required</p>
        )}
        {needsStageManager && !hasStageManager && (
          <p className="text-[10px] text-red-400/70 text-center">
            Stage Manager required (complexity {showComplexity})
          </p>
        )}
        {isMusical && !hasChoreographer && (
          <p className="text-[10px] text-red-400/70 text-center">
            Choreographer required for musicals
          </p>
        )}
        {isMusical && !hasMusicDirector && (
          <p className="text-[10px] text-red-400/70 text-center">
            Music Director required for musicals
          </p>
        )}
      </div>
    </div>
  );
}
