import type { EnrichedAufenthaltsportraets, EnrichedBuchungen, EnrichedHunde } from '@/types/enriched';
import type { Aufenthaltsportraets, Besitzer, Buchungen, Hunde, Plaetze } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface HundeMaps {
  besitzerMap: Map<string, Besitzer>;
}

export function enrichHunde(
  hunde: Hunde[],
  maps: HundeMaps
): EnrichedHunde[] {
  return hunde.map(r => ({
    ...r,
    besitzerName: resolveDisplay(r.fields.besitzer, maps.besitzerMap, 'vorname', 'nachname'),
  }));
}

interface BuchungenMaps {
  besitzerMap: Map<string, Besitzer>;
  hundeMap: Map<string, Hunde>;
  plaetzeMap: Map<string, Plaetze>;
}

export function enrichBuchungen(
  buchungen: Buchungen[],
  maps: BuchungenMaps
): EnrichedBuchungen[] {
  return buchungen.map(r => ({
    ...r,
    besitzerName: resolveDisplay(r.fields.besitzer, maps.besitzerMap, 'vorname', 'nachname'),
    hundName: resolveDisplay(r.fields.hund, maps.hundeMap, 'hundename'),
    platzName: resolveDisplay(r.fields.platz, maps.plaetzeMap, 'bezeichnung'),
  }));
}

interface AufenthaltsportraetsMaps {
  hundeMap: Map<string, Hunde>;
  besitzerMap: Map<string, Besitzer>;
}

export function enrichAufenthaltsportraets(
  aufenthaltsportraets: Aufenthaltsportraets[],
  maps: AufenthaltsportraetsMaps
): EnrichedAufenthaltsportraets[] {
  return aufenthaltsportraets.map(r => ({
    ...r,
    hundName: resolveDisplay(r.fields.hund, maps.hundeMap, 'hundename'),
    besitzerName: resolveDisplay(r.fields.besitzer, maps.besitzerMap, 'vorname', 'nachname'),
  }));
}
