// Auto-generated. Per-entity form-enhancements config for "Reservierungsanfrage".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [{"row": ["vorname", "nachname"]}, "email", "telefon", {"row": ["hundename", "rasse"], "cols": "1fr 1fr"}, "groesse", {"row": ["wunsch_anreise", "wunsch_abreise"]}, "status", "nachricht"],
  defaults: {
    'wunsch_anreise': { kind: 'today' },
    'wunsch_abreise': { kind: 'todayOffset', days: 3 },
    'status': { kind: 'lookup', key: 'neu', label: 'Neu' },
  },
  computed: {
    '_reservierungsanfrage_dauer_tage': { kind: 'dateDiff', from: 'wunsch_anreise', to: 'wunsch_abreise', unit: 'days' },
  },
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
