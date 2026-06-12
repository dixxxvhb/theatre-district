// Teach-on-first-encounter cards. Each fires exactly once — when the system
// it teaches first activates. They never stack, never interrupt twice, and
// live permanently in the Almanac for re-reading (Session 8).

import type { TDState } from '../../types/td';

export interface TeachCard {
  id: string;
  title: string;
  body: string;
  /** True when this card's system has activated in the running game. */
  trigger: (s: TDState) => boolean;
}

export const TEACH_CARDS: TeachCard[] = [
  {
    id: 'buzz_overlay',
    title: 'The Buzz Overlay',
    body:
      'Press Tab to toggle the heatmap on. Blue is dread; gold is good. The crowd walks where the gold is. Hover any tile for a number.',
    trigger: (s) => s.settings.buzzOverlay,
  },
  {
    id: 'critics_arrive',
    title: 'The Critics Arrive',
    body:
      'Three critics review every opening night: Vivienne Marsh worships text, Bernard Quill wants spectacle, Jo Okafor is weather. Their verdict is the show’s starting word of mouth.',
    trigger: (s) => Object.values(s.productions).some((p) => !!p.reviews),
  },
  {
    id: 'seasons',
    title: 'Seasons matter',
    body:
      'Spring brings the Tonys. Summer floods the street with tourists. Fall opens loud. Winter bites — bring a coat to your ticket prices.',
    trigger: (s) => s.time.day >= 28,
  },
  {
    id: 'weather',
    title: 'Weather',
    body:
      'Rain thins the crowd but doubles your wet-street reflections; bars do better. Heat sends people indoors and to the carts. Plan around it.',
    trigger: (s) => s.weather !== 'clear',
  },
  {
    id: 'pricing',
    title: 'Ticket pricing',
    body:
      'A hit can take a higher ticket. Push too far and word of mouth dies for it — gouging trips a nightly momentum penalty. Watch the Playbill, not just the cash.',
    trigger: (s) => Object.values(s.productions).some((p) => p.runDays >= 3 && p.ticketPrice > 40),
  },
  {
    id: 'dark_week',
    title: 'Dark Week',
    body:
      'When the lights dim at $0, the street goes quiet. After three days a patron offer arrives — once per era — and it’s yours if you take it. The lights come back up.',
    trigger: (s) => s.darkWeekDays > 0,
  },
  {
    id: 'show_transfers',
    title: 'Show transfers',
    body:
      'Once you have two theatres going, a hit can transfer between them — same momentum, different room. Drag a show across with the Production Desk’s transfer button.',
    trigger: (s) => s.street.era >= 3,
  },
  {
    id: 'photo_mode',
    title: 'Photo mode',
    body: 'Press P at any time. The UI hides, the camera frees, the night is yours. Time keeps moving unless you pause.',
    trigger: (s) => s.time.day >= 10,
  },
  {
    id: 'almanac',
    title: 'The Almanac',
    body: 'Every teach card lives in the Almanac (H) once it has fired. Nothing in this game stays explained once and then disappears.',
    trigger: (s) => s.time.day >= 14,
  },
  {
    id: 'tonys',
    title: 'Spring Awards',
    body:
      'Every spring, the District nominates its best shows for recognition. Quality, run length, and verdicts all count. The Impresario plays for this.',
    trigger: (s) => s.street.era >= 4,
  },
];
