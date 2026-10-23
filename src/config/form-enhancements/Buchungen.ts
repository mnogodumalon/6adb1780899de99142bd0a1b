// Auto-generated. Per-entity form-enhancements config for "Buchungen".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [{"row": ["besitzer", "hund"], "cols": "1fr 1fr"}, {"row": ["anreise", "abreise"]}, "platz", "status"],
  defaults: {
    'anreise': { kind: 'today' },
    'abreise': { kind: 'todayOffset', days: 3 },
    'status': { kind: 'lookup', key: 'reserviert', label: 'Reserviert' },
  },
  computed: {
    '_buchung_dauer_tage': { kind: 'dateDiff', from: 'anreise', to: 'abreise', unit: 'days' },
  },
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
