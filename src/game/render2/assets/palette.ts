// "Stage Door" palette — Art Deco NYC, c. 1928.
// 16 colors. Locked. Every sprite goes through these — Kenney sources get
// recolored at load time, procedural assets sample directly.

export const PALETTE = {
  ink:      0x1A1622,  // outlines, shadow cores
  coal:     0x2D2638,  // roof, deep shade
  dust:     0x4A4156,  // walls in shadow
  bone:     0xE8DCC4,  // plaster, light walls
  cream:    0xF4E9D2,  // lobby, lit surfaces
  velvet:   0x7A1F2B,  // curtain mid
  crimson:  0xA82838,  // curtain highlight, seats
  burgundy: 0x4E1620,  // curtain shadow
  brass:    0xC8923D,  // marquee bulbs OFF, fixtures
  filament: 0xF5C24A,  // marquee bulbs ON, warm light
  amber:    0xE89441,  // stage wash, interior glow
  sidewalk: 0x6E6960,  // concrete
  slate:    0x3F4A55,  // stone trim, night wash
  midnight: 0x1E2B3C,  // night sky
  sage:     0x5C7864,  // awnings, accent doors
  brick:    0x8B4A3A,  // exterior facade brick
} as const;

export type PaletteKey = keyof typeof PALETTE;
export const PALETTE_ENTRIES = Object.entries(PALETTE) as Array<[PaletteKey, number]>;

/** Per-room-type default fill color, picked from the palette. */
export const ROOM_PALETTE: Record<string, { primary: number; secondary: number; accent: number }> = {
  lobby:          { primary: PALETTE.cream,   secondary: PALETTE.brass,    accent: PALETTE.bone     },
  box_office:     { primary: PALETTE.brass,   secondary: PALETTE.ink,      accent: PALETTE.cream    },
  seating:        { primary: PALETTE.crimson, secondary: PALETTE.burgundy, accent: PALETTE.ink      },
  stage:          { primary: PALETTE.coal,    secondary: PALETTE.velvet,   accent: PALETTE.brass    },
  backstage:      { primary: PALETTE.slate,   secondary: PALETTE.dust,     accent: PALETTE.ink      },
  dressing_room:  { primary: PALETTE.bone,    secondary: PALETTE.velvet,   accent: PALETTE.brass    },
  orchestra_pit:  { primary: PALETTE.midnight,secondary: PALETTE.slate,    accent: PALETTE.brass    },
  rehearsal_hall: { primary: PALETTE.bone,    secondary: PALETTE.sage,     accent: PALETTE.brass    },
  vip_lounge:     { primary: PALETTE.velvet,  secondary: PALETTE.brass,    accent: PALETTE.filament },
  concession:     { primary: PALETTE.amber,   secondary: PALETTE.brick,    accent: PALETTE.cream    },
  storage:        { primary: PALETTE.brick,   secondary: PALETTE.coal,     accent: PALETTE.dust     },
  office:         { primary: PALETTE.slate,   secondary: PALETTE.bone,     accent: PALETTE.brass    },
  tech_booth:     { primary: PALETTE.dust,    secondary: PALETTE.midnight, accent: PALETTE.filament },
  green_room:     { primary: PALETTE.sage,    secondary: PALETTE.cream,    accent: PALETTE.brass    },
  restrooms:      { primary: PALETTE.bone,    secondary: PALETTE.slate,    accent: PALETTE.brass    },
};

/** Empty / ground tile palette (legacy iso build-view). */
export const GROUND_PALETTE = {
  tile:    PALETTE.dust,
  tileAlt: 0x3a3340,            // a half-step toward ink for checker variation
  outline: PALETTE.ink,
  grid:    0x2a2540,
} as const;

/** Street-layer ground tiles. Sidewalk, road, empty lot. */
export const STREET_PALETTE = {
  sidewalk:    PALETTE.sidewalk,       // concrete walkway
  sidewalkAlt: 0x787268,               // half-step lighter for checker
  road:        PALETTE.slate,          // asphalt center
  roadAlt:     0x46525e,               // half-step lighter
  emptyLot:    0x3a3340,               // dirt / undeveloped
  outline:     PALETTE.ink,
  grid:        0x2a2540,
} as const;

/** Street-level building tints (theatre, amenities). Sub-types pick from here. */
export const BUILDING_PALETTE: Record<string, { wall: number; roof: number; trim: number }> = {
  theatre:    { wall: PALETTE.brick,    roof: PALETTE.coal,    trim: PALETTE.brass    },
  restaurant: { wall: PALETTE.bone,     roof: PALETTE.sage,    trim: PALETTE.crimson  },
  cart:       { wall: PALETTE.cream,    roof: PALETTE.crimson, trim: PALETTE.brass    },
  placeholder:{ wall: PALETTE.dust,     roof: PALETTE.coal,    trim: PALETTE.bone     },
};

/** Decoration tints (lamps, trees, fountains, benches). */
export const DECOR_PALETTE: Record<string, { primary: number; accent: number }> = {
  lamp:     { primary: PALETTE.ink,      accent: PALETTE.filament },
  tree:     { primary: PALETTE.sage,     accent: PALETTE.coal     },
  fountain: { primary: PALETTE.bone,     accent: PALETTE.slate    },
  bench:    { primary: PALETTE.coal,     accent: PALETTE.brass    },
  poster:   { primary: PALETTE.crimson,  accent: PALETTE.bone     },
  string_lights: { primary: PALETTE.filament, accent: PALETTE.brass },
};
