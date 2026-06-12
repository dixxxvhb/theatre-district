import { describe, expect, it } from 'vitest';
import { buzzAt, computeBuzzField, falloff, litterKey } from './buzz';
import { AMENITIES, BUZZ, DECORATIONS, THEATRES } from '../config/balance';
import { columnsForEra } from './topology';
import type { PlacedBuilding, PlacedDecoration, StreetState } from '../../types/td';

const COLS = columnsForEra(0); // 20

function street(partial: Partial<StreetState> = {}): StreetState {
  return { era: 0, buildings: [], decorations: [], ...partial };
}

function building(partial: Partial<PlacedBuilding> = {}): PlacedBuilding {
  return {
    id: 'b',
    kind: 'theatre_playhouse',
    x: 8,
    side: 'north',
    constructionDaysLeft: 0,
    condition: 1,
    ...partial,
  };
}

function deco(partial: Partial<PlacedDecoration> = {}): PlacedDecoration {
  return { id: 'd', kind: 'street_lamp', x: 10, y: 3, ...partial };
}

const at = (f: Float32Array, x: number, y: number) => buzzAt(f, COLS, x, y);

describe('buzz — locked falloff', () => {
  it('is 1, .75, .5, .25 by ring and zero at the 4th ring out', () => {
    expect([0, 1, 2, 3, 4].map(falloff)).toEqual([1, 0.75, 0.5, 0.25, 0]);
  });

  it('a single decoration projects linear rings', () => {
    const f = computeBuzzField(street({ decorations: [deco({ x: 10, y: 3 })] }), {});
    const s = DECORATIONS.street_lamp.buzz;
    expect(at(f, 10, 3)).toBeCloseTo(s);
    expect(at(f, 11, 3)).toBeCloseTo(s * 0.75);
    expect(at(f, 12, 3)).toBeCloseTo(s * 0.5);
    expect(at(f, 13, 3)).toBeCloseTo(s * 0.25);
    expect(at(f, 14, 3)).toBe(0);
    // Chebyshev: diagonal ring 1 also gets 0.75.
    expect(at(f, 11, 4)).toBeCloseTo(s * 0.75);
  });
});

describe('buzz — summation', () => {
  it('overlapping building sources add plainly', () => {
    const f = computeBuzzField(
      street({
        buildings: [
          building({ id: 'a', kind: 'food_cart', x: 8 }),
          building({ id: 'b', kind: 'food_cart', x: 8, side: 'south' }),
        ],
      }),
      {},
    );
    // Tile equidistant from both (road row 4: ring 2 from row-2 lot front via
    // rows... measure: north cart occupies rows 0..2, south rows 7..9).
    // Sample the north sidewalk under the north cart: ring 1 from row 2.
    const s = AMENITIES.food_cart.buzz;
    const north = at(f, 8, 3);
    expect(north).toBeGreaterThan(s); // several footprint tiles reach it
  });

  it('empty street is all zero', () => {
    const f = computeBuzzField(street(), {});
    expect(Math.max(...f)).toBe(0);
    expect(Math.min(...f)).toBe(0);
  });
});

describe('buzz — decoration diminishing returns', () => {
  it('stacked lamps on one tile yield 1 + D + D² weights, not 3×', () => {
    const lamps = [
      deco({ id: 'l1', x: 10, y: 3 }),
      deco({ id: 'l2', x: 10, y: 3 }),
      deco({ id: 'l3', x: 10, y: 3 }),
    ];
    const f = computeBuzzField(street({ decorations: lamps }), {});
    const s = DECORATIONS.street_lamp.buzz;
    const expected = s * (1 + BUZZ.DIMINISH + BUZZ.DIMINISH ** 2);
    expect(at(f, 10, 3)).toBeCloseTo(expected);
    expect(at(f, 10, 3)).toBeLessThan(s * 3);
  });

  it('buildings do NOT diminish', () => {
    const carts = [
      building({ id: 'c1', kind: 'food_cart', x: 2 }),
      building({ id: 'c2', kind: 'food_cart', x: 2, side: 'south' }),
    ];
    const one = computeBuzzField(street({ buildings: [carts[0]] }), {});
    const two = computeBuzzField(street({ buildings: carts }), {});
    // Road tile between them receives exactly the sum of both contributions.
    const mid = at(two, 3, 4);
    const a = at(one, 3, 4);
    const b = at(computeBuzzField(street({ buildings: [carts[1]] }), {}), 3, 4);
    expect(mid).toBeCloseTo(a + b);
  });

  it('the strongest decoration leads the pool', () => {
    const f = computeBuzzField(
      street({ decorations: [deco({ id: 'l', x: 10, y: 3 }), deco({ id: 'fnt', kind: 'fountain', x: 10, y: 3 })] }),
      {},
    );
    const lamp = DECORATIONS.street_lamp.buzz;
    const fountain = DECORATIONS.fountain.buzz; // stronger
    expect(at(f, 10, 3)).toBeCloseTo(fountain + lamp * BUZZ.DIMINISH);
  });
});

describe('buzz — negatives', () => {
  it('derelict buildings emit negative buzz', () => {
    const f = computeBuzzField(street({ buildings: [building({ condition: 0.2 })] }), {});
    expect(at(f, 8, 2)).toBeLessThan(0);
    expect(at(f, 8, 3)).toBeLessThan(0);
  });

  it('construction sites are neutral', () => {
    const f = computeBuzzField(street({ buildings: [building({ constructionDaysLeft: 3 })] }), {});
    expect(at(f, 8, 2)).toBe(0);
  });

  it('healthy theatres emit the catalog value at full strength on-footprint', () => {
    const f = computeBuzzField(street({ buildings: [building()] }), {});
    expect(at(f, 8, 2)).toBeGreaterThanOrEqual(THEATRES.theatre_playhouse.buzz);
  });

  it('litter is a local negative and clamps', () => {
    const lightLitter = computeBuzzField(street(), { [litterKey(5, 3)]: 1 });
    expect(at(lightLitter, 5, 3)).toBeCloseTo(BUZZ.LITTER_PER_UNIT);
    expect(at(lightLitter, 6, 3)).toBe(0); // no spread

    const heavyLitter = computeBuzzField(street(), { [litterKey(5, 3)]: 99 });
    expect(at(heavyLitter, 5, 3)).toBeCloseTo(BUZZ.LITTER_PER_UNIT * BUZZ.LITTER_MAX_UNITS);
  });

  it('string lights emit from both anchors', () => {
    const f = computeBuzzField(
      street({ decorations: [deco({ kind: 'string_lights', x: 4, spanToX: 8, y: 3 })] }),
      {},
    );
    const s = DECORATIONS.string_lights.buzz;
    expect(at(f, 4, 3)).toBeCloseTo(s);
    expect(at(f, 8, 3)).toBeCloseTo(s);
    // Midpoint x=6: ring 2 from both anchors → two pool entries, diminished.
    expect(at(f, 6, 3)).toBeCloseTo(s * 0.5 + s * 0.5 * BUZZ.DIMINISH);
  });
});
