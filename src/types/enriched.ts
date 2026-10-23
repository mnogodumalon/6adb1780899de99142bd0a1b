import type { Aufenthaltsportraets, Buchungen, Hunde } from './app';

export type EnrichedHunde = Hunde & {
  besitzerName: string;
};

export type EnrichedBuchungen = Buchungen & {
  besitzerName: string;
  hundName: string;
  platzName: string;
};

export type EnrichedAufenthaltsportraets = Aufenthaltsportraets & {
  hundName: string;
  besitzerName: string;
};
