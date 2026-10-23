import { lookupLabel } from '@/i18n';

// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
/** A raw record URL (applookup reference). NEVER render this directly
 *  in JSX — it is a URL, not a display value. Show the enriched `*Name`
 *  field or resolve it via the entity map instead. Assignable to/from
 *  string everywhere; the `& {}` keeps the alias NAME visible in tsc
 *  error messages (a plain primitive alias gets normalized away). */
export type RecordUrl = string & {};
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Besitzer {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    email?: string;
    telefon?: string;
    strasse?: string;
    hausnummer?: string;
    plz?: string;
    ort?: string;
  };
}

export interface Hunde {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    hundename?: string;
    rasse?: string;
    groesse?: LookupValue;
    geburtsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    besonderheiten?: string;
    besitzer?: RecordUrl; // applookup -> URL zu 'Besitzer' Record
  };
}

export interface Plaetze {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    bezeichnung?: string;
    platzart?: LookupValue;
    hinweise?: string;
  };
}

export interface Buchungen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    besitzer?: RecordUrl; // applookup -> URL zu 'Besitzer' Record
    hund?: RecordUrl; // applookup -> URL zu 'Hunde' Record
    anreise?: string; // Format: YYYY-MM-DD oder ISO String
    abreise?: string; // Format: YYYY-MM-DD oder ISO String
    platz?: RecordUrl; // applookup -> URL zu 'Plaetze' Record
    status?: LookupValue;
  };
}

export interface Aufenthaltsportraets {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    hund?: RecordUrl; // applookup -> URL zu 'Hunde' Record
    besitzer?: RecordUrl; // applookup -> URL zu 'Besitzer' Record
    titel?: string;
    charakterbeschreibung?: string;
    lieblingsaktivitaet?: string;
    besondere_momente?: string;
    portraetfoto?: string;
    erstellungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
  };
}

export interface Reservierungsanfrage {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    email?: string;
    telefon?: string;
    hundename?: string;
    rasse?: string;
    groesse?: LookupValue;
    wunsch_anreise?: string; // Format: YYYY-MM-DD oder ISO String
    wunsch_abreise?: string; // Format: YYYY-MM-DD oder ISO String
    nachricht?: string;
    status?: LookupValue;
  };
}

export const APP_IDS = {
  BESITZER: '6adb17626739589039e9c8b5',
  HUNDE: '6adb1766348a800a4ce918bb',
  PLAETZE: '6adb17674c5f567457d8a93a',
  BUCHUNGEN: '6adb17676248dd467d4ada84',
  AUFENTHALTSPORTRAETS: '6adb176892bc9500eab18194',
  RESERVIERUNGSANFRAGE: '6adb1769a81f7fdabd36b6de',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'hunde': {
    groesse: [{ key: "klein", get label() { return lookupLabel('hunde', 'groesse', "klein") ?? "Klein"; } }, { key: "mittel", get label() { return lookupLabel('hunde', 'groesse', "mittel") ?? "Mittel"; } }, { key: "gross", get label() { return lookupLabel('hunde', 'groesse', "gross") ?? "Groß"; } }],
  },
  'plaetze': {
    platzart: [{ key: "zimmer", get label() { return lookupLabel('plaetze', 'platzart', "zimmer") ?? "Zimmer"; } }, { key: "box", get label() { return lookupLabel('plaetze', 'platzart', "box") ?? "Box"; } }, { key: "aussenbereich", get label() { return lookupLabel('plaetze', 'platzart', "aussenbereich") ?? "Außenbereich"; } }],
  },
  'buchungen': {
    status: [{ key: "reserviert", get label() { return lookupLabel('buchungen', 'status', "reserviert") ?? "Reserviert"; } }, { key: "eingecheckt", get label() { return lookupLabel('buchungen', 'status', "eingecheckt") ?? "Eingecheckt"; } }, { key: "ausgecheckt", get label() { return lookupLabel('buchungen', 'status', "ausgecheckt") ?? "Ausgecheckt"; } }],
  },
  'reservierungsanfrage': {
    groesse: [{ key: "klein", get label() { return lookupLabel('reservierungsanfrage', 'groesse', "klein") ?? "Klein"; } }, { key: "mittel", get label() { return lookupLabel('reservierungsanfrage', 'groesse', "mittel") ?? "Mittel"; } }, { key: "gross", get label() { return lookupLabel('reservierungsanfrage', 'groesse', "gross") ?? "Groß"; } }],
    status: [{ key: "neu", get label() { return lookupLabel('reservierungsanfrage', 'status', "neu") ?? "Neu"; } }, { key: "angenommen", get label() { return lookupLabel('reservierungsanfrage', 'status', "angenommen") ?? "Angenommen"; } }, { key: "abgelehnt", get label() { return lookupLabel('reservierungsanfrage', 'status', "abgelehnt") ?? "Abgelehnt"; } }],
  },
};

// Optimistic LookupValue writes: never re-type a label — resolve the schema
// option instead (its label is a locale-aware getter; falls back to the key).
// WRONG: status: { key: 'offen', label: 'Offen' }   (frozen in one language)
// RIGHT: status: lookupOption('<appKey>', 'status', 'offen')
export function lookupOption(app: string, field: string, key: string): LookupValue {
  return LOOKUP_OPTIONS[app]?.[field]?.find(o => o.key === key) ?? { key, label: key };
}

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'besitzer': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'email': 'string/email',
    'telefon': 'string/tel',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'plz': 'string/text',
    'ort': 'string/text',
  },
  'hunde': {
    'hundename': 'string/text',
    'rasse': 'string/text',
    'groesse': 'lookup/radio',
    'geburtsdatum': 'date/date',
    'besonderheiten': 'string/textarea',
    'besitzer': 'applookup/select',
  },
  'plaetze': {
    'bezeichnung': 'string/text',
    'platzart': 'lookup/select',
    'hinweise': 'string/textarea',
  },
  'buchungen': {
    'besitzer': 'applookup/select',
    'hund': 'applookup/select',
    'anreise': 'date/date',
    'abreise': 'date/date',
    'platz': 'applookup/select',
    'status': 'lookup/select',
  },
  'aufenthaltsportraets': {
    'hund': 'applookup/select',
    'besitzer': 'applookup/select',
    'titel': 'string/text',
    'charakterbeschreibung': 'string/textarea',
    'lieblingsaktivitaet': 'string/text',
    'besondere_momente': 'string/textarea',
    'portraetfoto': 'file',
    'erstellungsdatum': 'date/date',
  },
  'reservierungsanfrage': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'email': 'string/email',
    'telefon': 'string/tel',
    'hundename': 'string/text',
    'rasse': 'string/text',
    'groesse': 'lookup/radio',
    'wunsch_anreise': 'date/date',
    'wunsch_abreise': 'date/date',
    'nachricht': 'string/textarea',
    'status': 'lookup/select',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
  'besitzer': [
    { field: 'besitzer', entity: 'hunde' },
    { field: 'besitzer', entity: 'buchungen' },
    { field: 'besitzer', entity: 'aufenthaltsportraets' },
  ],
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateBesitzer = StripLookup<Besitzer['fields']>;
export type CreateHunde = StripLookup<Hunde['fields']>;
export type CreatePlaetze = StripLookup<Plaetze['fields']>;
export type CreateBuchungen = StripLookup<Buchungen['fields']>;
export type CreateAufenthaltsportraets = StripLookup<Aufenthaltsportraets['fields']>;
export type CreateReservierungsanfrage = StripLookup<Reservierungsanfrage['fields']>;