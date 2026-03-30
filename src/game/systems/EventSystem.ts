// Event system: random events during show runs
import type { GameEvent, EventChoice, EventEffect, EventSeverity } from '../../types';

export interface EventDefinition {
  title: string;
  description: string;
  severity: EventSeverity;
  category: 'positive' | 'negative' | 'choice';
  choices: {
    text: string;
    effects: EventEffect[];
  }[];
}

const EVENT_DEFINITIONS: EventDefinition[] = [
  // ================================================================
  // POSITIVE EVENTS
  // ================================================================
  {
    title: 'Standing Ovation',
    description: 'The audience erupted in a genuinely earned standing ovation tonight. The cast is beaming, social media is glowing, and your box office phone is ringing.',
    severity: 'moderate',
    category: 'positive',
    choices: [{ text: 'We earned this', effects: [{ type: 'buzz', value: 8 }, { type: 'reputation', value: 3 }, { type: 'morale', value: 10 }] }],
  },
  {
    title: 'Celebrity Spotted',
    description: 'A famous celebrity was spotted in the audience tonight. Paparazzi are already buzzing about it.',
    severity: 'moderate',
    category: 'positive',
    choices: [{ text: 'How exciting!', effects: [{ type: 'buzz', value: 10 }] }],
  },
  {
    title: 'Glowing Review',
    description: 'The Times theater critic published a rave review calling your show "a triumph of modern theater."',
    severity: 'major',
    category: 'positive',
    choices: [{ text: 'Read the review', effects: [{ type: 'buzz', value: 15 }, { type: 'reputation', value: 2 }] }],
  },
  {
    title: 'Cast Chemistry',
    description: 'Something magical is happening on stage. The cast has found an extraordinary chemistry that elevates every scene.',
    severity: 'moderate',
    category: 'positive',
    choices: [{ text: 'Let it shine', effects: [{ type: 'quality', value: 5 }] }],
  },
  {
    title: 'Local Press Feature',
    description: 'A local newspaper ran a feature story about your theater and its impact on the neighborhood.',
    severity: 'minor',
    category: 'positive',
    choices: [{ text: 'Great coverage', effects: [{ type: 'buzz', value: 8 }] }],
  },
  {
    title: 'Award Nomination',
    description: 'Your show has been nominated for a prestigious theater award! The industry is taking notice.',
    severity: 'major',
    category: 'positive',
    choices: [{ text: 'An honor!', effects: [{ type: 'reputation', value: 5 }, { type: 'buzz', value: 15 }] }],
  },
  {
    title: 'Celebrity Date Night',
    description: 'An A-list couple was spotted at your show tonight. Paparazzi photos are going viral — every entertainment blog has the story.',
    severity: 'moderate',
    category: 'positive',
    choices: [{ text: 'Enjoy the spotlight', effects: [{ type: 'buzz', value: 15 }] }],
  },
  {
    title: 'Tony Buzz',
    description: 'Industry whispers are growing — your show might get a Tony nomination. Critics are re-evaluating, and ticket demand is surging.',
    severity: 'major',
    category: 'positive',
    choices: [{ text: 'Stay humble, stay hungry', effects: [{ type: 'buzz', value: 20 }, { type: 'reputation', value: 5 }] }],
  },

  // ================================================================
  // NEGATIVE EVENTS
  // ================================================================
  {
    title: 'Wardrobe Malfunction',
    description: 'A costume failure during tonight\'s performance caused an embarrassing moment. Social media is having a field day.',
    severity: 'minor',
    category: 'negative',
    choices: [{ text: 'Damage control', effects: [{ type: 'buzz', value: -5 }] }],
  },
  {
    title: 'Cast Illness',
    description: 'Your lead actor has fallen ill and will be out for several days. The understudy will fill in, but quality may suffer.',
    severity: 'moderate',
    category: 'negative',
    choices: [{ text: 'Get well soon', effects: [{ type: 'quality', value: -10 }] }],
  },
  {
    title: 'Bad Review',
    description: 'A prominent critic savaged your show, calling it "a disappointing waste of talent and potential."',
    severity: 'major',
    category: 'negative',
    choices: [{ text: 'Ignore the critics', effects: [{ type: 'buzz', value: -10 }, { type: 'reputation', value: -2 }] }],
  },
  {
    title: 'Backstage Drama',
    description: 'A heated argument erupted backstage between crew members, disrupting tonight\'s pre-show preparations.',
    severity: 'minor',
    category: 'negative',
    choices: [{ text: 'Address the issue', effects: [{ type: 'morale', value: -5 }] }],
  },
  {
    title: 'Equipment Failure',
    description: 'A critical lighting rig malfunctioned during the show. Repairs will be needed, and tonight\'s performance suffered.',
    severity: 'moderate',
    category: 'negative',
    choices: [{ text: 'Call the repair crew', effects: [{ type: 'quality', value: -8 }, { type: 'cash', value: -5000 }] }],
  },

  // ================================================================
  // CHOICE EVENTS — Original
  // ================================================================
  {
    title: 'Investor Offer',
    description: 'A wealthy patron is offering $50,000 in exchange for 20% of your show\'s future revenue. It\'s quick cash, but at a cost.',
    severity: 'major',
    category: 'choice',
    choices: [
      { text: 'Accept the offer', effects: [{ type: 'cash', value: 50000 }] },
      { text: 'Decline politely', effects: [] },
    ],
  },
  {
    title: 'Press Interview',
    description: 'A reporter wants an exclusive interview. It could be great publicity, but they\'re known for tough questions.',
    severity: 'moderate',
    category: 'choice',
    choices: [
      { text: 'Take the risk', effects: [{ type: 'buzz', value: Math.random() > 0.4 ? 10 : -5 }] },
      { text: 'Decline the interview', effects: [] },
    ],
  },
  {
    title: 'Show Extension Offer',
    description: 'Due to demand, the venue is offering to extend your run by 30 days — but they want $25,000 for the extended booking.',
    severity: 'moderate',
    category: 'choice',
    choices: [
      { text: 'Extend the run ($25K)', effects: [{ type: 'cash', value: -25000 }, { type: 'buzz', value: 5 }] },
      { text: 'Keep original schedule', effects: [] },
    ],
  },
  {
    title: 'Rival Theater',
    description: 'A competitor has opened a flashy new show nearby, pulling attention away from your production.',
    severity: 'moderate',
    category: 'choice',
    choices: [
      { text: 'Counter with marketing ($10K)', effects: [{ type: 'cash', value: -10000 }, { type: 'buzz', value: 8 }] },
      { text: 'Ignore them', effects: [{ type: 'buzz', value: -5 }] },
    ],
  },

  // ================================================================
  // CAST DRAMA — New
  // ================================================================
  {
    title: 'Diva Demands',
    description: 'Your lead is demanding a bigger dressing room, fresh flowers daily, and a personal assistant — or they\'re "exploring other opportunities." The rest of the cast is rolling their eyes.',
    severity: 'moderate',
    category: 'choice',
    choices: [
      { text: 'Give them what they want ($3K)', effects: [{ type: 'cash', value: -3000 }, { type: 'quality', value: 3 }] },
      { text: 'Call their bluff', effects: [{ type: 'morale', value: -8 }, { type: 'quality', value: -5 }] },
    ],
  },
  {
    title: 'Understudy Shines',
    description: 'During today\'s rehearsal, the understudy delivered a performance that left the room speechless — arguably better than the lead. The lead noticed, and they\'re not happy.',
    severity: 'moderate',
    category: 'choice',
    choices: [
      { text: 'Swap them — promote the understudy', effects: [{ type: 'quality', value: 8 }, { type: 'morale', value: -6 }] },
      { text: 'Keep the current lead', effects: [{ type: 'morale', value: 3 }] },
    ],
  },
  {
    title: 'Cast Romance',
    description: 'Two of your cast members have started dating. Their onstage chemistry is electric — audiences are spellbound. But if it goes south, so does act two.',
    severity: 'minor',
    category: 'positive',
    choices: [{ text: 'Enjoy the magic while it lasts', effects: [{ type: 'quality', value: 5 }] }],
  },
  {
    title: 'Method Actor',
    description: 'Your lead has gone full method — refusing to break character offstage. They\'re calling everyone by character names, eating in costume, and sleeping in the theater. The performance is transcendent. The cast is losing their minds.',
    severity: 'moderate',
    category: 'choice',
    choices: [
      { text: 'Tolerate the genius', effects: [{ type: 'quality', value: 8 }, { type: 'morale', value: -5 }] },
      { text: 'Insist they snap out of it', effects: [{ type: 'morale', value: 5 }, { type: 'quality', value: -3 }] },
    ],
  },
  {
    title: 'Social Media Scandal',
    description: 'Old social media posts from a cast member have surfaced — and they\'re not great. Twitter is calling for a statement. The press smells blood.',
    severity: 'major',
    category: 'choice',
    choices: [
      { text: 'Address it publicly ($5K PR response)', effects: [{ type: 'cash', value: -5000 }, { type: 'reputation', value: 1 }] },
      { text: 'Ignore it and hope it blows over', effects: [{ type: 'buzz', value: -15 }] },
    ],
  },
  {
    title: 'Vocal Strain',
    description: 'Your lead singer\'s voice is giving out — the vibrato is gone, the high notes are cracking. The show depends on that voice.',
    severity: 'major',
    category: 'choice',
    choices: [
      { text: 'Rest them for 3 days (understudy fills in)', effects: [{ type: 'quality', value: -8 }] },
      { text: 'Push through — the show must go on', effects: [{ type: 'quality', value: -3 }, { type: 'morale', value: -5 }] },
    ],
  },
  {
    title: 'Union Grievance',
    description: 'The actors\' union has filed a formal complaint about overtime rehearsal hours. Your stage manager looks nervous.',
    severity: 'moderate',
    category: 'choice',
    choices: [
      { text: 'Pay the overtime ($8K)', effects: [{ type: 'cash', value: -8000 }, { type: 'morale', value: 5 }] },
      { text: 'Fight it — we were within guidelines', effects: [{ type: 'morale', value: -10 }] },
    ],
  },
  {
    title: 'Cast Member Poached',
    description: 'A rival theater has offered your lead double their current salary. They\'re torn — they love the show, but that\'s life-changing money.',
    severity: 'major',
    category: 'choice',
    choices: [
      { text: 'Match the offer ($12K bonus)', effects: [{ type: 'cash', value: -12000 }, { type: 'morale', value: 8 }] },
      { text: 'Let them go — nobody is irreplaceable', effects: [{ type: 'quality', value: -12 }, { type: 'morale', value: -5 }] },
    ],
  },

  // ================================================================
  // TECHNICAL — New
  // ================================================================
  {
    title: 'Fly System Malfunction',
    description: 'The fly system jammed during the dream sequence — a backdrop froze mid-descent, killing the illusion. The audience murmured. Your rigger says it needs parts.',
    severity: 'moderate',
    category: 'choice',
    choices: [
      { text: 'Rush repair ($3K)', effects: [{ type: 'cash', value: -3000 }] },
      { text: 'Work around it for now', effects: [{ type: 'quality', value: -5 }] },
    ],
  },
  {
    title: 'Sound System Upgrade Available',
    description: 'A top-tier sound company is offering a demo installation of their new wireless mic system. Crystal clarity, zero feedback. But the full install isn\'t cheap.',
    severity: 'moderate',
    category: 'choice',
    choices: [
      { text: 'Upgrade the system ($10K)', effects: [{ type: 'cash', value: -10000 }, { type: 'quality', value: 5 }] },
      { text: 'Our current setup works fine', effects: [] },
    ],
  },
  {
    title: 'Lighting Rig Falls',
    description: 'A lighting instrument crashed to the stage during load-in — inches from a crew member. No one was hurt, but the fire marshal is asking questions. You need an inspection.',
    severity: 'major',
    category: 'choice',
    choices: [
      { text: 'Rush safety inspection ($5K)', effects: [{ type: 'cash', value: -5000 }, { type: 'reputation', value: 1 }] },
      { text: 'Go dark for 2 days (standard inspection)', effects: [{ type: 'quality', value: -6 }, { type: 'buzz', value: -4 }] },
    ],
  },
  {
    title: 'Costume Rip on Stage',
    description: 'Mid-scene wardrobe catastrophe — a seam split from collar to hem during the big dance number. The actor powered through like a pro, the audience gasped, and now it\'s trending.',
    severity: 'minor',
    category: 'positive',
    choices: [{ text: 'The show must go on', effects: [{ type: 'quality', value: -3 }, { type: 'buzz', value: 5 }] }],
  },
  {
    title: 'Power Outage',
    description: 'The grid went down mid-act. Complete darkness. The audience is murmuring. Your stage manager has two options: cancel, or go acoustic by candlelight.',
    severity: 'major',
    category: 'choice',
    choices: [
      { text: 'Cancel tonight\'s performance', effects: [{ type: 'buzz', value: -8 }, { type: 'cash', value: -3000 }] },
      { text: 'Candlelit acoustic performance', effects: [{ type: 'buzz', value: Math.random() > 0.5 ? 20 : -10 }] },
    ],
  },

  // ================================================================
  // BUSINESS — New
  // ================================================================
  {
    title: 'School Group Booking',
    description: 'A local school district wants to book 200 seats for a Wednesday matinee at half-price. Guaranteed butts in seats, but lower revenue than walk-ups.',
    severity: 'minor',
    category: 'choice',
    choices: [
      { text: 'Accept the booking', effects: [{ type: 'buzz', value: 5 }, { type: 'reputation', value: 2 }] },
      { text: 'Hold out for full-price tickets', effects: [{ type: 'cash', value: 2000 }] },
    ],
  },
  {
    title: 'Corporate Sponsor',
    description: 'A corporation is offering $25,000 to sponsor your show — in exchange for naming rights. "The Amalgamated Widget Presents..." Your publicist is conflicted.',
    severity: 'major',
    category: 'choice',
    choices: [
      { text: 'Take the money', effects: [{ type: 'cash', value: 25000 }, { type: 'buzz', value: -5 }] },
      { text: 'Protect the art', effects: [{ type: 'reputation', value: 2 }] },
    ],
  },
  {
    title: 'Documentary Crew',
    description: 'A film crew wants to follow your production for a behind-the-scenes documentary. Great exposure, but cameras in the wings make everyone nervous.',
    severity: 'moderate',
    category: 'choice',
    choices: [
      { text: 'Let them film', effects: [{ type: 'buzz', value: 10 }, { type: 'quality', value: -3 }] },
      { text: 'Our stage, our privacy', effects: [{ type: 'morale', value: 3 }] },
    ],
  },
  {
    title: 'Rent Increase',
    description: 'Your landlord just dropped the news — rent is going up. "Market rates," they say, with a shrug that costs you thousands.',
    severity: 'major',
    category: 'choice',
    choices: [
      { text: 'Negotiate a buyout ($15K, problem solved)', effects: [{ type: 'cash', value: -15000 }] },
      { text: 'Absorb the increase (+$500/day)', effects: [{ type: 'cash', value: -7000 }] },
    ],
  },

  // ================================================================
  // AUDIENCE — New
  // ================================================================
  {
    title: 'Audience Member Collapse',
    description: 'A medical emergency stopped the show mid-act. An audience member collapsed — paramedics arrived quickly. The audience is shaken, but your staff handled it with grace.',
    severity: 'minor',
    category: 'positive',
    choices: [{ text: 'Humanity first', effects: [{ type: 'buzz', value: -2 }, { type: 'reputation', value: 2 }] }],
  },
  {
    title: 'Heckler',
    description: 'A drunk audience member is loudly heckling during act two. The lead is visibly rattled. Your house manager is hovering.',
    severity: 'minor',
    category: 'choice',
    choices: [
      { text: 'Handle it with humor from the stage', effects: [{ type: 'buzz', value: 3 }] },
      { text: 'Have them escorted out', effects: [{ type: 'buzz', value: -2 }, { type: 'reputation', value: 1 }] },
    ],
  },
  {
    title: 'Viral TikTok Moment',
    description: 'An audience member secretly filmed the finale and it\'s blowing up on TikTok — 2 million views overnight. Your box office is slammed with calls.',
    severity: 'major',
    category: 'positive',
    choices: [{ text: 'Embrace the chaos', effects: [{ type: 'buzz', value: 25 }] }],
  },
  {
    title: 'Walkouts',
    description: 'A group of audience members walked out during intermission tonight. Word travels fast in the theater district.',
    severity: 'minor',
    category: 'negative',
    choices: [{ text: 'Not everyone gets it', effects: [{ type: 'buzz', value: -6 }, { type: 'morale', value: -3 }] }],
  },
  {
    title: 'Sold Out Run Extended',
    description: 'Every remaining performance just sold out. Scalpers are listing tickets at triple face value. Your accountant is smiling for the first time this quarter.',
    severity: 'major',
    category: 'positive',
    choices: [{ text: 'This is why we do it', effects: [{ type: 'cash', value: 15000 }, { type: 'buzz', value: 10 }] }],
  },

  // ================================================================
  // MISC FLAVOR — New
  // ================================================================
  {
    title: 'Ghost Light Incident',
    description: 'Someone forgot to set the ghost light last night. Now half the cast is convinced the theater is cursed. Morale is... theatrical.',
    severity: 'minor',
    category: 'negative',
    choices: [{ text: 'Theater superstitions...', effects: [{ type: 'morale', value: -4 }] }],
  },
  {
    title: 'The Scottish Play',
    description: 'An intern said "Macbeth" inside the theater. The stage manager is making them spin three times and spit. The cast is genuinely spooked.',
    severity: 'minor',
    category: 'negative',
    choices: [{ text: 'We don\'t say that word here', effects: [{ type: 'morale', value: -3 }] }],
  },
  {
    title: 'Opening Night Jitters',
    description: 'The cast is wired — nerves are electric backstage. Some channel it into brilliance, others into mistakes. Tonight could go either way.',
    severity: 'minor',
    category: 'choice',
    choices: [
      { text: 'Give a rousing pep talk', effects: [{ type: 'morale', value: 8 }, { type: 'quality', value: 3 }] },
      { text: 'Let them find their own energy', effects: [{ type: 'quality', value: Math.random() > 0.5 ? 5 : -5 }] },
    ],
  },
  {
    title: 'Broadway Legend Visits',
    description: 'A legendary Broadway icon stopped by to watch a rehearsal — and stayed for the whole run-through. They had notes. Your director is either thrilled or mortified.',
    severity: 'moderate',
    category: 'choice',
    choices: [
      { text: 'Incorporate their notes', effects: [{ type: 'quality', value: 6 }, { type: 'reputation', value: 3 }] },
      { text: 'Politely thank them (our vision)', effects: [{ type: 'reputation', value: 1 }] },
    ],
  },
  {
    title: 'Stage Door Frenzy',
    description: 'A crowd of fans is gathered at the stage door every night, waiting for autographs. Your lead is eating it up. The rest of the cast is wondering when they became background players.',
    severity: 'minor',
    category: 'positive',
    choices: [{ text: 'Star power is real', effects: [{ type: 'buzz', value: 6 }, { type: 'morale', value: -2 }] }],
  },
  {
    title: 'Playbill Feature',
    description: 'Playbill wants to run a feature on your production — a two-page spread with photos. Your publicist is already picking out headshots.',
    severity: 'moderate',
    category: 'positive',
    choices: [{ text: 'We\'ll take the spotlight', effects: [{ type: 'buzz', value: 12 }, { type: 'reputation', value: 2 }] }],
  },
  {
    title: 'Community Outreach',
    description: 'A local community center asks if you\'d host a free workshop for underprivileged kids. No revenue, but it\'s the right thing to do — and the press would love it.',
    severity: 'minor',
    category: 'choice',
    choices: [
      { text: 'Host the workshop', effects: [{ type: 'reputation', value: 3 }, { type: 'buzz', value: 5 }, { type: 'cash', value: -1000 }] },
      { text: 'We can\'t afford the time right now', effects: [] },
    ],
  },
  {
    title: 'Cast Album Offer',
    description: 'A boutique record label wants to record a cast album. It means late-night studio sessions and exhausted performers — but a cast album lives forever.',
    severity: 'major',
    category: 'choice',
    choices: [
      { text: 'Record the album', effects: [{ type: 'buzz', value: 15 }, { type: 'reputation', value: 4 }, { type: 'morale', value: -5 }] },
      { text: 'The live show is enough', effects: [{ type: 'morale', value: 3 }] },
    ],
  },
];

const EVENT_CHANCE_PER_DAY = 0.15;

/**
 * Roll for a random event. Returns null if no event triggers.
 */
export function rollForEvent(currentDay: number): GameEvent | null {
  if (Math.random() > EVENT_CHANCE_PER_DAY) {
    return null;
  }

  const definition = EVENT_DEFINITIONS[Math.floor(Math.random() * EVENT_DEFINITIONS.length)];

  const choices: EventChoice[] = definition.choices.map((c) => ({
    id: crypto.randomUUID(),
    text: c.text,
    effects: c.effects,
  }));

  return {
    id: crypto.randomUUID(),
    title: definition.title,
    description: definition.description,
    severity: definition.severity,
    day: currentDay,
    choices,
    resolved: definition.category !== 'choice', // auto-resolve non-choice events
  };
}

/**
 * Check if an event auto-resolves (only one choice = no real decision needed).
 */
export function isAutoResolve(event: GameEvent): boolean {
  return event.choices.length <= 1;
}

/**
 * Get the effects from resolving an event with a specific choice.
 */
export function getEventEffects(event: GameEvent, choiceId: string): EventEffect[] {
  const choice = event.choices.find((c) => c.id === choiceId);
  return choice?.effects ?? [];
}
