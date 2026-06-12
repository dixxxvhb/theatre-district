// The Production Desk — full-screen, curtain-framed management view opened by
// clicking a theatre. NOT a floor plan (locked presentation): the preserved
// show-production systems as playbill-styled panels, plus the Theatre
// Upgrades list (the old room types, audit §5).

import { useState } from 'react';
import { PRODUCTION, THEATRES, UPGRADES, type UpgradeId } from '../../game/config/balance';
import { ROLE_LABELS, ROLE_SLOTS, pairChemistry, upgradeEffects } from '../../game/production/logic';
import { useTDStore } from '../../store/store';
import type { CastMember, Production, RoleSlot } from '../../types/td';

const fmt = (n: number) => `$${n.toLocaleString()}`;

const card = 'rounded-lg border border-amber-900/40 bg-[#16131d] p-4';
const btn =
  'rounded border border-amber-700 bg-amber-950/60 px-3 py-1.5 text-sm text-amber-100 hover:bg-amber-900/60 disabled:cursor-not-allowed disabled:border-gray-800 disabled:bg-transparent disabled:text-gray-600';
const ghostBtn = 'rounded border border-gray-700 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-800';

export function ProductionDesk() {
  const theatreId = useTDStore((s) => s.ui.deskTheatreId);
  const theatre = useTDStore((s) => s.street.buildings.find((b) => b.id === s.ui.deskTheatreId));
  const production = useTDStore((s) => (s.ui.deskTheatreId ? s.productions[s.ui.deskTheatreId] : undefined));
  const openDesk = useTDStore((s) => s.openDesk);
  const [tab, setTab] = useState<'show' | 'upgrades'>('show');

  if (!theatreId || !theatre) return null;
  const entry = THEATRES[theatre.kind as keyof typeof THEATRES];

  return (
    <div className="absolute inset-0 z-40 flex">
      {/* Stage curtains frame the desk. */}
      <div className="w-10 shrink-0 bg-gradient-to-r from-[#4a1420] via-[#5c1a28] to-[#2c0c14] shadow-[inset_-12px_0_18px_rgba(0,0,0,0.6)]" />
      <div className="flex-1 overflow-y-auto bg-[#0e0b14]/97 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-6 py-5">
          <div className="flex items-center justify-between border-b border-amber-900/40 pb-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-amber-700">Production Desk</div>
              <h2 className="text-2xl text-amber-200" style={{ fontFamily: 'Georgia, serif' }}>
                {entry.label}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button className={tab === 'show' ? btn : ghostBtn} onClick={() => setTab('show')}>
                The Show
              </button>
              <button className={tab === 'upgrades' ? btn : ghostBtn} onClick={() => setTab('upgrades')}>
                Upgrades
              </button>
              <button className={ghostBtn} onClick={() => openDesk(null)}>
                Back to the street
              </button>
            </div>
          </div>

          {tab === 'show' ? (
            <ShowPipeline theatreId={theatreId} production={production} />
          ) : (
            <UpgradesPanel theatreId={theatreId} owned={theatre.upgrades ?? []} />
          )}
        </div>
      </div>
      <div className="w-10 shrink-0 bg-gradient-to-l from-[#4a1420] via-[#5c1a28] to-[#2c0c14] shadow-[inset_12px_0_18px_rgba(0,0,0,0.6)]" />
    </div>
  );
}

// --- pipeline stages -----------------------------------------------------------

function ShowPipeline({ theatreId, production }: { theatreId: string; production?: Production }) {
  if (!production) return <DarkStage theatreId={theatreId} />;
  switch (production.stage) {
    case 'commissioning':
      return <Commissioning theatreId={theatreId} production={production} />;
    case 'casting':
      return <Casting theatreId={theatreId} production={production} />;
    case 'rehearsing':
      return <Rehearsing theatreId={theatreId} production={production} />;
    case 'running':
      return <Running theatreId={theatreId} production={production} />;
  }
}

function DarkStage({ theatreId }: { theatreId: string }) {
  const commission = useTDStore((s) => s.commission);
  const theatre = useTDStore((s) => s.street.buildings.find((b) => b.id === theatreId));
  const cash = useTDStore((s) => s.economy.cash);
  const fx = upgradeEffects(theatre?.upgrades);
  const cost = Math.round(PRODUCTION.COMMISSION_COST * fx.commissionMult);
  return (
    <div className={`${card} mt-5 text-center`}>
      <div className="text-4xl text-gray-700" style={{ fontFamily: 'Georgia, serif' }}>
        The stage is dark.
      </div>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
        A theatre with no show is a very expensive sculpture. Commission scripts and three writers will pitch
        you their best.
      </p>
      <button className={`${btn} mt-4`} disabled={cash < cost} onClick={() => commission(theatreId)}>
        Commission scripts ({fmt(cost)})
      </button>
    </div>
  );
}

function Commissioning({ theatreId, production }: { theatreId: string; production: Production }) {
  const chooseShow = useTDStore((s) => s.chooseShow);
  const theatre = useTDStore((s) => s.street.buildings.find((b) => b.id === theatreId));
  const cash = useTDStore((s) => s.economy.cash);
  const fx = upgradeEffects(theatre?.upgrades);
  return (
    <div className="mt-5">
      <h3 className="text-sm uppercase tracking-widest text-amber-700">Three pitches on your desk</h3>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {production.options?.map((o, i) => {
          const rights = Math.round(o.rightsCost * (1 - fx.rightsDiscount));
          return (
            <div key={i} className={`${card} flex flex-col`}>
              <div className="text-lg leading-tight text-amber-100" style={{ fontFamily: 'Georgia, serif' }}>
                {o.title}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {o.genre.replace(/_/g, ' ')} · {o.archetypeLabel}
              </div>
              <div className="mt-3 space-y-1 text-xs text-gray-400">
                <Bar label="Script" value={o.scriptQuality} />
                <Bar label="Appeal" value={o.appeal} />
              </div>
              <button
                className={`${btn} mt-auto pt-1.5`}
                disabled={cash < rights}
                onClick={() => chooseShow(theatreId, i)}
              >
                Buy rights ({fmt(rights)})
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Casting({ theatreId, production }: { theatreId: string; production: Production }) {
  const refresh = useTDStore((s) => s.refreshCandidates);
  const castRole = useTDStore((s) => s.castRole);
  const startRehearsals = useTDStore((s) => s.startRehearsals);
  const cash = useTDStore((s) => s.economy.cash);
  const [openSlot, setOpenSlot] = useState<RoleSlot | null>(null);

  const hired = ROLE_SLOTS.filter((r) => production.cast[r]).length;

  return (
    <div className="mt-5">
      <ShowHeader production={production} note={`Casting — ${hired}/4 roles filled (the Lead is required)`} />
      <div className="mt-3 grid grid-cols-2 gap-3">
        {ROLE_SLOTS.map((slot) => {
          const member = production.cast[slot];
          const candidates = production.candidates?.[slot];
          return (
            <div key={slot} className={card}>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-amber-700">{ROLE_LABELS[slot]}</span>
                {!member && (
                  <button
                    className={ghostBtn}
                    onClick={() => {
                      refresh(theatreId, slot);
                      setOpenSlot(slot);
                    }}
                  >
                    {candidates ? 'New auditions' : 'Hold auditions'}
                  </button>
                )}
              </div>
              {member ? (
                <CastCard member={member} cast={production.cast} />
              ) : openSlot === slot && candidates ? (
                <div className="mt-2 space-y-2">
                  {candidates.map((c) => (
                    <button
                      key={c.id}
                      className="block w-full rounded border border-gray-800 bg-gray-900/50 p-2 text-left hover:border-amber-800"
                      disabled={cash < c.signingFee}
                      onClick={() => castRole(theatreId, slot, c)}
                    >
                      <CandidateRow c={c} cast={production.cast} />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-3 text-sm text-gray-600">Uncast.</div>
              )}
            </div>
          );
        })}
      </div>
      <button className={`${btn} mt-4`} disabled={!production.cast.lead} onClick={() => startRehearsals(theatreId)}>
        Begin rehearsals
      </button>
      {!production.cast.lead && <span className="ml-3 text-xs text-gray-500">You need a Lead first.</span>}
    </div>
  );
}

function Rehearsing({ theatreId, production }: { theatreId: string; production: Production }) {
  const openShow = useTDStore((s) => s.openShow);
  const cash = useTDStore((s) => s.economy.cash);
  const ready = production.readiness >= PRODUCTION.OPEN_THRESHOLD;
  return (
    <div className="mt-5">
      <ShowHeader production={production} note={`Rehearsals — day ${production.rehearsalDays}`} />
      <div className={`${card} mt-3`}>
        <Bar label={`Readiness ${Math.round(production.readiness)}%`} value={production.readiness} tall />
        <p className="mt-2 text-xs text-gray-400">
          {ready
            ? 'The company can open. Every extra day of polish sharpens opening-night quality — but wages keep running.'
            : `Opening unlocks at ${PRODUCTION.OPEN_THRESHOLD}% readiness. The director will bring you decisions along the way.`}
        </p>
        <button
          className={`${btn} mt-3`}
          disabled={!ready || cash < PRODUCTION.OPENING_COST}
          onClick={() => openShow(theatreId)}
        >
          Open the show ({fmt(PRODUCTION.OPENING_COST)})
        </button>
      </div>
    </div>
  );
}

function Running({ theatreId, production }: { theatreId: string; production: Production }) {
  const setPrice = useTDStore((s) => s.setTicketPrice);
  const closeShow = useTDStore((s) => s.closeShow);
  const [confirmClose, setConfirmClose] = useState(false);
  return (
    <div className="mt-5">
      <ShowHeader production={production} note={`Open run — night ${production.runDays}`} />
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className={card}>
          <div className="text-xs uppercase tracking-widest text-amber-700">The numbers</div>
          <div className="mt-2 space-y-1 text-sm text-gray-300">
            <div>Quality: <span className="text-amber-200">{production.quality}</span></div>
            <div>Word of mouth: <span className="text-amber-200">{Math.round(production.momentum * 100)}%</span></div>
            <div>Last house: <span className="text-amber-200">{production.lastAttendance}</span></div>
            <div>Gross to date: <span className="text-amber-200">{fmt(production.gross)}</span></div>
          </div>
        </div>
        <div className={card}>
          <div className="text-xs uppercase tracking-widest text-amber-700">Ticket price</div>
          <div className="mt-3 flex items-center gap-3">
            <input
              type="range"
              min={10}
              max={120}
              value={production.ticketPrice}
              onChange={(e) => setPrice(theatreId, Number(e.target.value))}
              className="flex-1 accent-amber-600"
            />
            <span className="w-12 text-right font-mono text-amber-200">${production.ticketPrice}</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">Price moves demand. Gouge a hit and the word of mouth pays for it.</p>
          <div className="mt-4 border-t border-gray-800 pt-3">
            {confirmClose ? (
              <span className="text-xs text-gray-400">
                Close the show?{' '}
                <button className="text-red-300 underline" onClick={() => closeShow(theatreId)}>Yes, final curtain</button>{' '}
                · <button className="text-gray-400 underline" onClick={() => setConfirmClose(false)}>keep running</button>
              </span>
            ) : (
              <button className="text-xs text-red-300/80 underline" onClick={() => setConfirmClose(true)}>
                Close the show
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- upgrades --------------------------------------------------------------------

function UpgradesPanel({ theatreId, owned }: { theatreId: string; owned: string[] }) {
  const buyUpgrade = useTDStore((s) => s.buyUpgrade);
  const cash = useTDStore((s) => s.economy.cash);
  return (
    <div className="mt-5 grid grid-cols-2 gap-2">
      {(Object.entries(UPGRADES) as Array<[UpgradeId, (typeof UPGRADES)[UpgradeId]]>).map(([id, u]) => {
        const has = owned.includes(id);
        return (
          <div key={id} className={`${card} ${has ? 'border-amber-700/60' : ''} !p-3`}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-amber-100" style={{ fontFamily: 'Georgia, serif' }}>{u.label}</span>
              {has ? (
                <span className="text-[10px] uppercase tracking-widest text-amber-600">Installed</span>
              ) : (
                <button className={`${btn} !px-2 !py-0.5 !text-xs`} disabled={cash < u.cost} onClick={() => buyUpgrade(theatreId, id)}>
                  {fmt(u.cost)}
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">{u.desc}</p>
          </div>
        );
      })}
    </div>
  );
}

// --- bits ------------------------------------------------------------------------

function ShowHeader({ production, note }: { production: Production; note: string }) {
  if (!production.show) return null;
  return (
    <div className="mt-4">
      <div className="text-xl text-amber-100" style={{ fontFamily: 'Georgia, serif' }}>
        {production.show.title}
      </div>
      <div className="text-xs text-gray-500">
        {production.show.genre.replace(/_/g, ' ')} · {production.show.archetypeLabel} · {note}
      </div>
    </div>
  );
}

function CastCard({ member, cast }: { member: CastMember; cast: Production['cast'] }) {
  return (
    <div className="mt-2">
      <div className="text-sm text-amber-100">{member.name}</div>
      <div className="text-xs text-gray-500">
        skill {member.skill} · star {member.starPower} · {member.personality} · {fmt(member.dailyWage)}/day
      </div>
      <ChemistryHint c={member} cast={cast} />
    </div>
  );
}

function CandidateRow({ c, cast }: { c: CastMember; cast: Production['cast'] }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-amber-100">{c.name}</span>
        <span className="font-mono text-xs text-gray-400">{fmt(c.signingFee)}</span>
      </div>
      <div className="text-xs text-gray-500">
        skill {c.skill} · star {c.starPower} · {c.personality}
      </div>
      <ChemistryHint c={c} cast={cast} />
    </div>
  );
}

function ChemistryHint({ c, cast }: { c: CastMember; cast: Production['cast'] }) {
  const others = ROLE_SLOTS.map((r) => cast[r]).filter((m): m is CastMember => !!m && m.id !== c.id);
  if (others.length === 0) return null;
  const avg = others.reduce((n, o) => n + pairChemistry(c, o), 0) / others.length;
  const label = avg >= 3 ? 'electric with this cast' : avg >= 0 ? 'gets along fine' : 'friction with this cast';
  const color = avg >= 3 ? 'text-emerald-400/80' : avg >= 0 ? 'text-gray-500' : 'text-red-400/80';
  return <div className={`mt-0.5 text-[11px] ${color}`}>Chemistry: {label}</div>;
}

function Bar({ label, value, tall }: { label: string; value: number; tall?: boolean }) {
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-[10px] uppercase tracking-wider text-gray-500">
        <span>{label}</span>
      </div>
      <div className={`${tall ? 'h-2.5' : 'h-1.5'} overflow-hidden rounded bg-gray-800`}>
        <div className="h-full bg-amber-700" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
}
