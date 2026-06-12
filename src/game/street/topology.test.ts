import { describe, expect, it } from 'vitest';
import {
  columnsForEra,
  footprintRows,
  inBounds,
  isLot,
  isSidewalk,
  lotSide,
  sidewalkRowFor,
  tileKind,
} from './topology';
import { STREET } from '../config/balance';

describe('topology — row layout', () => {
  it('rows north→south: 3 lot, 1 sidewalk, 2 road, 1 sidewalk, 3 lot', () => {
    expect([0, 1, 2].map(tileKind)).toEqual(['lot_north', 'lot_north', 'lot_north']);
    expect(tileKind(3)).toBe('sidewalk_north');
    expect([4, 5].map(tileKind)).toEqual(['road', 'road']);
    expect(tileKind(6)).toBe('sidewalk_south');
    expect([7, 8, 9].map(tileKind)).toEqual(['lot_south', 'lot_south', 'lot_south']);
  });

  it('helpers agree with kinds', () => {
    expect(isLot(0)).toBe(true);
    expect(isLot(4)).toBe(false);
    expect(isSidewalk(3)).toBe(true);
    expect(isSidewalk(5)).toBe(false);
    expect(lotSide(1)).toBe('north');
    expect(lotSide(8)).toBe('south');
    expect(lotSide(4)).toBeNull();
  });
});

describe('topology — era growth', () => {
  it('columns follow the locked era table and clamp out of range', () => {
    expect(columnsForEra(0)).toBe(20);
    expect(columnsForEra(1)).toBe(28);
    expect(columnsForEra(4)).toBe(64);
    expect(columnsForEra(-1)).toBe(20);
    expect(columnsForEra(99)).toBe(64);
  });

  it('inBounds respects era width and fixed rows', () => {
    expect(inBounds({ x: 0, y: 0 }, 0)).toBe(true);
    expect(inBounds({ x: 19, y: 9 }, 0)).toBe(true);
    expect(inBounds({ x: 20, y: 0 }, 0)).toBe(false);
    expect(inBounds({ x: 20, y: 0 }, 1)).toBe(true);
    expect(inBounds({ x: 0, y: STREET.TOTAL_ROWS }, 0)).toBe(false);
  });
});

describe('topology — building footprints hug the sidewalk', () => {
  it('north-lot footprints press south against the north sidewalk', () => {
    expect(footprintRows('north', 3)).toEqual([0, 1, 2]);
    expect(footprintRows('north', 2)).toEqual([1, 2]);
    expect(footprintRows('north', 1)).toEqual([2]);
  });

  it('south-lot footprints press north against the south sidewalk', () => {
    expect(footprintRows('south', 3)).toEqual([7, 8, 9]);
    expect(footprintRows('south', 2)).toEqual([7, 8]);
    expect(footprintRows('south', 1)).toEqual([7]);
  });

  it('each lot side fronts its own sidewalk row', () => {
    expect(sidewalkRowFor('north')).toBe(3);
    expect(sidewalkRowFor('south')).toBe(6);
  });
});
