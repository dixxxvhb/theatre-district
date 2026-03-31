import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { generateCastCandidate } from '../../game/data/staff';
import type { CastMember, ShowRole } from '../../types';

// --- Chemistry helpers ---
function personalityHash(personality: string): number {
  return personality.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
}

function getChemistry(a: string, b: string): number {
  return Math.abs(personalityHash(a) - personalityHash(b)) % 5 + 1;
}

// --- Stat bar (red < 40, yellow 40-70, green > 70) ---
function StatBar({ value, label }: { value: number; label: string }) {
  const color =
    value > 70 ? '#10b981' :
    value >= 40 ? '#f59e0b' :
    '#ef4444';

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-gray-500 w-14 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] text-gray-400 w-6 text-right">{value}</span>
    </div>
  );
}

// --- Stage scene (top 60%) ---
function StageScene({
  candidate,
  waitingCount,
}: {
  candidate: CastMember | null;
  waitingCount: number;
}) {
  const talent = candidate?.talent ?? 50;
  const starPower = candidate?.starPower ?? 0;

  // Glow intensity proportional to starPower (0-100 -> 4px-40px spread)
  const glowSpread = 4 + (starPower / 100) * 36;
  const glowOpacity = 0.15 + (starPower / 100) * 0.55;

  // Confident stance if talent > 70, smaller silhouette if < 40
  const isConfident = talent > 70;
  const isNervous = talent < 40;

  // Wing silhouettes (waiting candidates)
  const leftWing = Math.ceil(waitingCount / 2);
  const rightWing = waitingCount - leftWing;

  return (
    <div
      className="relative w-full rounded-t-xl overflow-hidden"
      style={{
        height: '200px',
        background: 'linear-gradient(180deg, #0a0a0a 0%, #1a1208 60%, #2d1f0a 100%)',
      }}
    >
      {/* Stage floor line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, #8b6914 30%, #d4a574 50%, #8b6914 70%, transparent)' }}
      />

      {/* Spotlight */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2"
        style={{
          width: '200px',
          height: '200px',
          background: `radial-gradient(ellipse 120px 180px at center 30%, rgba(255,235,180,0.18) 0%, rgba(255,220,130,0.06) 40%, transparent 70%)`,
        }}
      />

      {/* Left wing silhouettes */}
      <div className="absolute left-3 bottom-4 flex flex-col-reverse gap-1.5 items-center">
        {Array.from({ length: leftWing }, (_, i) => (
          <div
            key={`l-${i}`}
            className="rounded-full bg-gray-800/60"
            style={{ width: '8px', height: '8px', opacity: 0.4 + i * 0.1 }}
          />
        ))}
      </div>

      {/* Right wing silhouettes */}
      <div className="absolute right-3 bottom-4 flex flex-col-reverse gap-1.5 items-center">
        {Array.from({ length: rightWing }, (_, i) => (
          <div
            key={`r-${i}`}
            className="rounded-full bg-gray-800/60"
            style={{ width: '8px', height: '8px', opacity: 0.4 + i * 0.1 }}
          />
        ))}
      </div>

      {/* Center stage performer */}
      {candidate && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-4 flex flex-col items-center">
          {/* Star glow behind performer */}
          <div
            className="absolute rounded-full"
            style={{
              width: `${isConfident ? 56 : isNervous ? 28 : 40}px`,
              height: `${isConfident ? 56 : isNervous ? 28 : 40}px`,
              bottom: isConfident ? '-4px' : '0px',
              left: '50%',
              transform: 'translateX(-50%)',
              boxShadow: `0 0 ${glowSpread}px ${glowSpread / 2}px rgba(255, 200, 60, ${glowOpacity})`,
            }}
          />

          {/* Performer silhouette */}
          <div
            className="relative flex flex-col items-center"
            style={{
              transition: 'all 0.4s ease',
            }}
          >
            {/* Head */}
            <div
              className="rounded-full bg-gray-300"
              style={{
                width: isConfident ? '16px' : isNervous ? '10px' : '13px',
                height: isConfident ? '16px' : isNervous ? '10px' : '13px',
                marginBottom: '2px',
              }}
            />
            {/* Body */}
            <div
              className="rounded-sm"
              style={{
                width: isConfident ? '20px' : isNervous ? '10px' : '14px',
                height: isConfident ? '32px' : isNervous ? '18px' : '24px',
                backgroundColor: isConfident ? '#d4a574' : isNervous ? '#6b7280' : '#9ca3af',
              }}
            />
            {/* Arms (confident = spread, nervous = close) */}
            {isConfident && (
              <>
                <div className="absolute top-5 -left-3 w-3 h-1 bg-gray-300 rounded-full -rotate-30" />
                <div className="absolute top-5 -right-3 w-3 h-1 bg-gray-300 rounded-full rotate-30" />
              </>
            )}
          </div>

          {/* Name tag */}
          <span className="text-[9px] text-amber-300/70 mt-1.5 whitespace-nowrap">
            {candidate.name}
          </span>
        </div>
      )}

      {/* Curtain folds (left + right) */}
      <div
        className="absolute top-0 left-0 w-6 h-full"
        style={{ background: 'linear-gradient(90deg, #1a0505 0%, transparent 100%)', opacity: 0.6 }}
      />
      <div
        className="absolute top-0 right-0 w-6 h-full"
        style={{ background: 'linear-gradient(-90deg, #1a0505 0%, transparent 100%)', opacity: 0.6 }}
      />
    </div>
  );
}

// --- Chemistry spark dots ---
function ChemistryDots({ chemistry, show }: { chemistry: number; show: boolean }) {
  if (!show) return null;
  return (
    <div className="flex items-center gap-0.5 ml-2">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: '5px',
            height: '5px',
            backgroundColor: i < chemistry ? '#fbbf24' : '#374151',
            boxShadow: i < chemistry ? '0 0 4px rgba(251,191,36,0.5)' : 'none',
          }}
        />
      ))}
    </div>
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
  const castMembers = useGameStore((s) => s.castMembers);

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
  const [hoveredCast, setHoveredCast] = useState(false);

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

  const selectedCandidate = currentCasting?.candidates.find(
    (c) => c.id === currentCasting.selectedCandidateId,
  ) ?? null;

  // Chemistry with existing cast (average against all cast personalities)
  const castPersonalities = castMembers.map((cm) => cm.personality).filter(Boolean);
  const chemistryScore = selectedCandidate && castPersonalities.length > 0
    ? Math.round(
        castPersonalities.reduce(
          (sum, p) => sum + getChemistry(selectedCandidate.personality, p),
          0,
        ) / castPersonalities.length,
      )
    : selectedCandidate
      ? Math.floor(Math.random() * 3) + 2 // no cast yet, moderate chemistry
      : 0;

  // How many candidates are waiting (not yet auditioned in current role)
  const waitingInWings = currentCasting
    ? currentCasting.candidates.filter((c) => c.id !== currentCasting.selectedCandidateId).length
    : 0;

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
    if (currentCasting?.selectedCandidateId) {
      const candidate = currentCasting.candidates.find(
        (c) => c.id === currentCasting.selectedCandidateId,
      );
      if (candidate) {
        castRole(activeShow.id, currentCasting.role.id, candidate);
      }
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
      <div className="bg-gray-950/95 border border-amber-900/30 rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* ===== TOP 60%: STAGE SCENE ===== */}
        <StageScene
          candidate={selectedCandidate}
          waitingCount={waitingInWings}
        />

        {/* Header overlay on stage */}
        <div className="px-6 -mt-10 relative z-10">
          <div className="text-center mb-2">
            <h2
              className="text-xl font-bold text-amber-200 drop-shadow-lg"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              Center Stage
            </h2>
            <p className="text-gray-400 text-xs">
              Casting for "{activeShow.title}" -- Role {currentRoleIndex + 1} of {totalRoles}
            </p>
          </div>
        </div>

        {/* ===== BOTTOM 40%: CASTING TABLE ===== */}
        <div className="px-6 pb-5 pt-3">

          {/* Progress bar */}
          <div className="mb-4">
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
              {/* Current role badge */}
              <div className={`${ROLE_TYPE_COLORS[currentCasting.role.type].bg} border ${ROLE_TYPE_COLORS[currentCasting.role.type].border} rounded-lg p-2.5 mb-3`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`text-[10px] uppercase tracking-wider ${ROLE_TYPE_COLORS[currentCasting.role.type].text}`}>
                      {currentCasting.role.type}
                    </span>
                    <h3 className="text-base text-gray-100 font-semibold">{currentCasting.role.name}</h3>
                  </div>
                  {currentCasting.role.type === 'ensemble' && (
                    <span className="text-xs text-gray-500">(optional)</span>
                  )}
                </div>
              </div>

              {/* Candidate cards as a row */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {currentCasting.candidates.map((candidate) => {
                  const isSelected = currentCasting.selectedCandidateId === candidate.id;
                  return (
                    <button
                      key={candidate.id}
                      onClick={() => handleSelectCandidate(candidate.id)}
                      className={`w-full text-left p-2.5 rounded-lg transition-all cursor-pointer border ${
                        isSelected
                          ? 'border-amber-500/60 bg-amber-950/30'
                          : 'border-gray-800/50 bg-black/40 hover:border-gray-700/50 hover:bg-gray-900/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium text-gray-200 truncate">{candidate.name}</span>
                        <span className="text-[9px] text-gray-500 shrink-0 ml-1">${candidate.salary.toLocaleString()}/wk</span>
                      </div>
                      {candidate.personality && (
                        <div className="text-[9px] italic text-gray-500 mb-1.5 leading-tight truncate">{candidate.personality}</div>
                      )}
                      <div className="space-y-0.5">
                        <StatBar value={candidate.talent} label="Talent" />
                        <StatBar value={candidate.morale} label="Morale" />
                        <StatBar value={candidate.chemistry} label="Reliability" />
                        {currentCasting.role.type === 'lead' && (
                          <StatBar value={candidate.starPower} label="Star Power" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {!isLastRole && (
                  <>
                    <button
                      onClick={handleSkipRole}
                      className="flex-1 py-2 text-xs rounded-xl border border-gray-800/50 text-gray-500 hover:text-gray-300 hover:border-gray-700/50 transition-all cursor-pointer"
                    >
                      Skip Role
                    </button>
                    <button
                      onClick={handleNextRole}
                      disabled={!currentCasting.selectedCandidateId}
                      onMouseEnter={() => setHoveredCast(true)}
                      onMouseLeave={() => setHoveredCast(false)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer border flex items-center justify-center ${
                        currentCasting.selectedCandidateId
                          ? 'bg-amber-900/40 border-amber-700/50 text-amber-200 hover:bg-amber-900/60'
                          : 'bg-gray-900/40 border-gray-800/40 text-gray-600 cursor-not-allowed'
                      }`}
                    >
                      Cast & Next
                      <ChemistryDots chemistry={chemistryScore} show={hoveredCast && !!currentCasting.selectedCandidateId} />
                    </button>
                  </>
                )}

                {isLastRole && (
                  <button
                    onClick={handleNextRole}
                    disabled={!currentCasting.selectedCandidateId}
                    onMouseEnter={() => setHoveredCast(true)}
                    onMouseLeave={() => setHoveredCast(false)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer border flex items-center justify-center ${
                      currentCasting.selectedCandidateId
                        ? 'bg-amber-900/40 border-amber-700/50 text-amber-200 hover:bg-amber-900/60'
                        : 'bg-gray-900/40 border-gray-800/40 text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    {currentCasting.selectedCandidateId ? 'Cast Final Role' : 'Skip Final Role'}
                    <ChemistryDots chemistry={chemistryScore} show={hoveredCast && !!currentCasting.selectedCandidateId} />
                  </button>
                )}
              </div>
            </>
          )}

          {/* Begin Rehearsal */}
          <div className="mt-4 pt-3 border-t border-gray-800/50">
            <button
              onClick={handleBeginRehearsal}
              disabled={!minCastingMet}
              className={`w-full py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer border ${
                minCastingMet
                  ? 'bg-emerald-900/40 border-emerald-700/50 text-emerald-200 hover:bg-emerald-900/60'
                  : 'bg-gray-900/40 border-gray-800/40 text-gray-600 cursor-not-allowed'
              }`}
            >
              {minCastingMet ? 'Begin Rehearsals' : 'Cast all lead roles first'}
            </button>
            <p className="text-center text-gray-600 text-[10px] mt-1.5">
              {castedCount} / {totalRoles} roles cast
              {!allLeadsCast && ' -- All lead roles are required'}
            </p>
          </div>

          {/* Back */}
          <button
            onClick={() => setPhase('production')}
            className="w-full mt-2 py-1.5 text-[10px] text-gray-600 hover:text-gray-400 transition-colors cursor-pointer"
          >
            Back to Crew Hiring
          </button>
        </div>
      </div>
    </div>
  );
}
