import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CREW_ROLE_DEFINITIONS, generateCrewCandidate } from '../../game/data/staff';
import { GAME_CONSTANTS } from '../../game/data/constants';
import type { CrewMember, CrewRole } from '../../types';

function SkillBar({ value }: { value: number }) {
  const color =
    value >= 70 ? '#10b981' :
    value >= 50 ? '#d4a574' :
    value >= 30 ? '#f59e0b' :
    '#ef4444';

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] text-gray-400 w-5 text-right">{value}</span>
    </div>
  );
}

function HireCandidateCard({
  candidate,
  onHire,
}: {
  candidate: CrewMember;
  onHire: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-black/40 border border-gray-800/40">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-200 font-medium truncate">{candidate.name}</div>
        {candidate.personality && (
          <div className="text-[10px] italic text-gray-500 leading-tight mt-0.5">{candidate.personality}</div>
        )}
        <div className="mt-1">
          <SkillBar value={candidate.skill} />
        </div>
        <div className="text-[10px] text-gray-500 mt-0.5">
          ${candidate.salary.toLocaleString()}/wk
        </div>
      </div>
      <button
        onClick={onHire}
        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-900/40 border border-amber-700/50 text-amber-200 hover:bg-amber-900/60 transition-all cursor-pointer shrink-0"
      >
        Hire
      </button>
    </div>
  );
}

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

  return (
    <div className="w-80 h-full bg-gray-950/95 backdrop-blur-sm border-l border-amber-900/30 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-amber-900/20">
        <h2
          className="text-lg font-bold tracking-wide"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: '#d4a574' }}
        >
          Crew & Staff
        </h2>
        {activeShow && (
          <p className="text-gray-500 text-xs mt-1">
            For "{activeShow.title}" ({activeShow.genre})
          </p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500">
            {hiredCrew.length}/{maxCrew} positions filled
          </span>
          <span className="text-xs text-gray-400">
            ${weeklyCost.toLocaleString()}/wk
          </span>
        </div>
        {!officeRoom && (
          <p className="text-[10px] text-yellow-500/70 mt-1">
            Build an Office to increase crew capacity
          </p>
        )}
      </div>

      {/* Role list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {visibleRoles.map((def) => {
          const hiredMember = hiredCrew.find((c) => c.role === def.role);
          const isExpanded = expandedRole === def.role;
          const roleCandidates = candidates[def.role] ?? [];
          const isRequired =
            (def.role === 'director') ||
            (def.role === 'stage_manager' && needsStageManager) ||
            (def.musicalOnly && isMusical && def.required);

          return (
            <div key={def.role} className="rounded-lg overflow-hidden">
              {/* Role row */}
              <div
                className={`p-2.5 border transition-all ${
                  hiredMember
                    ? 'bg-emerald-950/20 border-emerald-900/30'
                    : isRequired
                      ? 'bg-red-950/10 border-red-900/20'
                      : 'bg-black/30 border-gray-800/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-gray-200 font-medium">{def.label}</span>
                      {isRequired && !hiredMember && (
                        <span className="text-[9px] text-red-400 uppercase tracking-wider">req</span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-600 mt-0.5">{def.description}</p>
                  </div>

                  {hiredMember ? (
                    <div className="text-right shrink-0 ml-2">
                      <div className="text-xs text-emerald-300">{hiredMember.name}</div>
                      <div className="text-[10px] text-gray-500">
                        Skill {hiredMember.skill} | ${hiredMember.salary}/wk
                      </div>
                      <button
                        onClick={() => handleFire(hiredMember.id)}
                        className="text-[10px] text-red-500/50 hover:text-red-400 transition-colors cursor-pointer mt-0.5"
                      >
                        Fire
                      </button>
                    </div>
                  ) : (
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
                  )}
                </div>
              </div>

              {/* Candidate list */}
              {isExpanded && !hiredMember && (
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

      {/* Proceed */}
      <div className="p-3 border-t border-amber-900/20 space-y-2">
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
