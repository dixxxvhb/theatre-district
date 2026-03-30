import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { generateCastCandidate } from '../../game/data/staff';
import type { CastMember, ShowRole } from '../../types';

function TalentBar({ value, label }: { value: number; label: string }) {
  const color =
    value >= 70 ? '#10b981' :
    value >= 50 ? '#d4a574' :
    value >= 30 ? '#f59e0b' :
    '#ef4444';

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-gray-500 w-10 shrink-0">{label}</span>
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

function CandidateCard({
  candidate,
  roleType,
  selected,
  onSelect,
}: {
  candidate: CastMember;
  roleType: 'lead' | 'supporting' | 'ensemble';
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-lg transition-all cursor-pointer border ${
        selected
          ? 'border-amber-500/60 bg-amber-950/30'
          : 'border-gray-800/50 bg-black/40 hover:border-gray-700/50 hover:bg-gray-900/30'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-200">{candidate.name}</span>
        <span className="text-xs text-gray-500">${candidate.salary.toLocaleString()}/wk</span>
      </div>
      {candidate.personality && (
        <div className="text-[10px] italic text-gray-500 mb-2 leading-tight">{candidate.personality}</div>
      )}
      <div className="space-y-1">
        <TalentBar value={candidate.talent} label="Talent" />
        {roleType === 'lead' && (
          <TalentBar value={candidate.starPower} label="Star" />
        )}
      </div>
    </button>
  );
}

interface RoleCasting {
  role: ShowRole;
  candidates: CastMember[];
  selectedCandidateId: string | null;
}

export function AuditionModal() {
  const shows = useGameStore((s) => s.shows);
  const activeShowId = useGameStore((s) => s.activeShowId);
  const castRole = useGameStore((s) => s.castRole);
  const startRehearsals = useGameStore((s) => s.startRehearsals);
  const setPhase = useGameStore((s) => s.setPhase);

  const activeShow = shows.find((s) => s.id === activeShowId);

  // Generate candidates for each unfilled role
  const [roleCastings, setRoleCastings] = useState<RoleCasting[]>(() => {
    if (!activeShow) return [];
    return activeShow.roles
      .filter((r) => !r.castMemberId)
      .map((role) => ({
        role,
        candidates: Array.from({ length: 3 }, () => generateCastCandidate()),
        selectedCandidateId: null,
      }));
  });

  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);

  if (!activeShow) return null;

  const currentCasting = roleCastings[currentRoleIndex];
  const totalRoles = roleCastings.length;
  const castedCount = roleCastings.filter((rc) => rc.selectedCandidateId !== null).length;

  // Minimum: all leads and at least 1 supporting must be cast
  const leadRoles = roleCastings.filter((rc) => rc.role.type === 'lead');
  const allLeadsCast = leadRoles.every((rc) => rc.selectedCandidateId !== null);
  const supportingRoles = roleCastings.filter((rc) => rc.role.type === 'supporting');
  const supportingCast = supportingRoles.filter((rc) => rc.selectedCandidateId !== null).length;
  const minCastingMet = allLeadsCast && (supportingRoles.length === 0 || supportingCast >= 1);

  const handleSelectCandidate = (candidateId: string) => {
    setRoleCastings((prev) =>
      prev.map((rc, i) =>
        i === currentRoleIndex
          ? { ...rc, selectedCandidateId: rc.selectedCandidateId === candidateId ? null : candidateId }
          : rc,
      ),
    );
  };

  const handleNextRole = () => {
    // If a candidate was selected, cast them
    if (currentCasting?.selectedCandidateId) {
      const candidate = currentCasting.candidates.find(
        (c) => c.id === currentCasting.selectedCandidateId,
      );
      if (candidate) {
        castRole(activeShow.id, currentCasting.role.id, candidate);
      }
      // Clear selection so handleBeginRehearsal doesn't double-cast
      setRoleCastings((prev) =>
        prev.map((rc, i) =>
          i === currentRoleIndex ? { ...rc, selectedCandidateId: null } : rc,
        ),
      );
    }

    if (currentRoleIndex < totalRoles - 1) {
      setCurrentRoleIndex(currentRoleIndex + 1);
    }
  };

  const handleSkipRole = () => {
    // Clear selection and move to next
    setRoleCastings((prev) =>
      prev.map((rc, i) =>
        i === currentRoleIndex ? { ...rc, selectedCandidateId: null } : rc,
      ),
    );
    if (currentRoleIndex < totalRoles - 1) {
      setCurrentRoleIndex(currentRoleIndex + 1);
    }
  };

  const handleBeginRehearsal = () => {
    // Cast any remaining selected candidate for current role
    if (currentCasting?.selectedCandidateId) {
      const candidate = currentCasting.candidates.find(
        (c) => c.id === currentCasting.selectedCandidateId,
      );
      if (candidate) {
        castRole(activeShow.id, currentCasting.role.id, candidate);
      }
    }
    startRehearsals(activeShow.id);
  };

  const isLastRole = currentRoleIndex >= totalRoles - 1;

  const ROLE_TYPE_COLORS = {
    lead: { bg: 'bg-amber-900/20', border: 'border-amber-700/30', text: 'text-amber-300' },
    supporting: { bg: 'bg-purple-900/20', border: 'border-purple-700/30', text: 'text-purple-300' },
    ensemble: { bg: 'bg-gray-800/30', border: 'border-gray-700/30', text: 'text-gray-400' },
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-950/95 border border-amber-900/30 rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-4">
          <h2
            className="text-2xl font-bold text-amber-200 mb-1"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            Auditions
          </h2>
          <p className="text-gray-500 text-sm">
            Casting for "{activeShow.title}" -- Role {currentRoleIndex + 1} of {totalRoles}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center gap-1 mb-1">
            {roleCastings.map((rc, i) => {
              const isCurrent = i === currentRoleIndex;
              const isCast = rc.selectedCandidateId !== null || i < currentRoleIndex;
              return (
                <div
                  key={rc.role.id}
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    isCurrent
                      ? 'bg-amber-500'
                      : isCast
                        ? 'bg-emerald-600'
                        : 'bg-gray-800'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {currentCasting && (
          <>
            {/* Current role */}
            <div className={`${ROLE_TYPE_COLORS[currentCasting.role.type].bg} border ${ROLE_TYPE_COLORS[currentCasting.role.type].border} rounded-xl p-3 mb-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className={`text-xs uppercase tracking-wider ${ROLE_TYPE_COLORS[currentCasting.role.type].text}`}>
                    {currentCasting.role.type}
                  </span>
                  <h3 className="text-lg text-gray-100 font-semibold">{currentCasting.role.name}</h3>
                </div>
                {currentCasting.role.type === 'ensemble' && (
                  <span className="text-xs text-gray-500">(optional)</span>
                )}
              </div>
            </div>

            {/* Candidates */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {currentCasting.candidates.map((candidate) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  roleType={currentCasting.role.type}
                  selected={currentCasting.selectedCandidateId === candidate.id}
                  onSelect={() => handleSelectCandidate(candidate.id)}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {!isLastRole && (
                <>
                  <button
                    onClick={handleSkipRole}
                    className="flex-1 py-2.5 text-sm rounded-xl border border-gray-800/50 text-gray-500 hover:text-gray-300 hover:border-gray-700/50 transition-all cursor-pointer"
                  >
                    Skip Role
                  </button>
                  <button
                    onClick={handleNextRole}
                    disabled={!currentCasting.selectedCandidateId}
                    className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all cursor-pointer border ${
                      currentCasting.selectedCandidateId
                        ? 'bg-amber-900/40 border-amber-700/50 text-amber-200 hover:bg-amber-900/60'
                        : 'bg-gray-900/40 border-gray-800/40 text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    Cast & Next
                  </button>
                </>
              )}

              {isLastRole && (
                <button
                  onClick={handleNextRole}
                  disabled={!currentCasting.selectedCandidateId}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all cursor-pointer border ${
                    currentCasting.selectedCandidateId
                      ? 'bg-amber-900/40 border-amber-700/50 text-amber-200 hover:bg-amber-900/60'
                      : 'bg-gray-900/40 border-gray-800/40 text-gray-600 cursor-not-allowed'
                  }`}
                >
                  {currentCasting.selectedCandidateId ? 'Cast Final Role' : 'Skip Final Role'}
                </button>
              )}
            </div>
          </>
        )}

        {/* Begin Rehearsal */}
        <div className="mt-6 pt-4 border-t border-gray-800/50">
          <button
            onClick={handleBeginRehearsal}
            disabled={!minCastingMet}
            className={`w-full py-3 text-sm font-bold rounded-xl transition-all cursor-pointer border ${
              minCastingMet
                ? 'bg-emerald-900/40 border-emerald-700/50 text-emerald-200 hover:bg-emerald-900/60'
                : 'bg-gray-900/40 border-gray-800/40 text-gray-600 cursor-not-allowed'
            }`}
          >
            {minCastingMet ? 'Begin Rehearsals' : 'Cast all lead roles first'}
          </button>
          <p className="text-center text-gray-600 text-xs mt-2">
            {castedCount} / {totalRoles} roles cast
            {!allLeadsCast && ' -- All lead roles are required'}
          </p>
        </div>

        {/* Back */}
        <button
          onClick={() => setPhase('production')}
          className="w-full mt-3 py-2 text-xs text-gray-600 hover:text-gray-400 transition-colors cursor-pointer"
        >
          Back to Crew Hiring
        </button>
      </div>
    </div>
  );
}
