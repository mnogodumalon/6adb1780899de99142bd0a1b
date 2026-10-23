/**
 * Required-field messages — WRITTEN BY THE BUILD AGENT, never by a heuristic.
 *
 * The layer knows two things about an empty required field: that it is
 * required and what its label is. Out of that it can only say „„Anreise" ist
 * ein Pflichtfeld". What the person should do instead („Bitte einen Gast
 * auswählen.") is meaning, and meaning is the agent's: the Phase-2 orchestrator
 * writes one short instruction per required field — what is needed, not why — to
 * `.intents-staging/messages.json`, the integration step validates it against
 * the app metadata and renders it into the block below. Scaffold updates keep
 * the block. Do not edit outside the markers.
 *
 * Every door reads this and nothing else: `useStepForm` (flows and public
 * pages), the generated {Entity}Dialog and the public form's server-error line.
 * A field without a sentence falls back to the label sentence — never to a
 * bare „Dieses Feld ist erforderlich".
 *
 * Required fields per entity (from the base view):
 *   - besitzer: vorname (Vorname), nachname (Nachname)
 *   - hunde: hundename (Name des Hundes), besitzer (Besitzer)
 *   - plaetze: bezeichnung (Bezeichnung)
 *   - buchungen: besitzer (Besitzer), hund (Hund), anreise (Anreise), abreise (Abreise), platz (Platz), status (Status)
 *   - aufenthaltsportraets: hund (Hund), besitzer (Besitzer), titel (Titel), erstellungsdatum (Erstellungsdatum (heute))
 *   - reservierungsanfrage: vorname (Vorname), nachname (Nachname), email (E-Mail), telefon (Telefon), hundename (Name des Hundes), rasse (Rasse des Hundes), groesse (Größe), wunsch_anreise (Wunsch-Anreise), wunsch_abreise (Wunsch-Abreise), status (Status)
 */
import { t, tx } from '@/i18n';
import { labelOf, type EntityKey } from './rules';

/** The writable fields of each entity — the keys a message may address (generated). */
export interface MessageFields {
  "besitzer": "vorname" | "nachname" | "email" | "telefon" | "strasse" | "hausnummer" | "plz" | "ort";
  "hunde": "hundename" | "rasse" | "groesse" | "geburtsdatum" | "besonderheiten" | "besitzer";
  "plaetze": "bezeichnung" | "platzart" | "hinweise";
  "buchungen": "besitzer" | "hund" | "anreise" | "abreise" | "platz" | "status";
  "aufenthaltsportraets": "hund" | "besitzer" | "titel" | "charakterbeschreibung" | "lieblingsaktivitaet" | "besondere_momente" | "erstellungsdatum";
  "reservierungsanfrage": "vorname" | "nachname" | "email" | "telefon" | "hundename" | "rasse" | "groesse" | "wunsch_anreise" | "wunsch_abreise" | "nachricht" | "status";
}
export type MessageFieldKey<E extends EntityKey> = E extends keyof MessageFields ? MessageFields[E] : never;

export const REQUIRED_MESSAGES: { [E in EntityKey]?: Partial<Record<MessageFieldKey<E>, string>> } = {
  // <custom:messages>
  besitzer: { vorname: "Bitte den Vornamen eingeben.", nachname: "Bitte den Nachnamen eingeben." },
  hunde: { hundename: "Bitte den Namen des Hundes eingeben.", besitzer: "Bitte einen Besitzer auswählen." },
  plaetze: { bezeichnung: "Bitte eine Bezeichnung eingeben." },
  buchungen: { besitzer: "Bitte einen Besitzer auswählen.", hund: "Bitte einen Hund auswählen.", anreise: "Bitte das Anreisedatum wählen.", abreise: "Bitte das Abreisedatum wählen.", platz: "Bitte einen Platz auswählen.", status: "Bitte einen Status wählen." },
  aufenthaltsportraets: { hund: "Bitte einen Hund auswählen.", besitzer: "Bitte einen Besitzer auswählen.", titel: "Bitte einen Titel eingeben.", erstellungsdatum: "Bitte das Erstellungsdatum wählen." },
  reservierungsanfrage: { vorname: "Bitte den Vornamen eingeben.", nachname: "Bitte den Nachnamen eingeben.", email: "Bitte die E-Mail-Adresse eingeben.", telefon: "Bitte die Telefonnummer eingeben.", hundename: "Bitte den Namen des Hundes eingeben.", rasse: "Bitte die Rasse des Hundes eingeben.", groesse: "Bitte die Größe des Hundes wählen.", wunsch_anreise: "Bitte die Wunsch-Anreise wählen.", wunsch_abreise: "Bitte die Wunsch-Abreise wählen.", status: "Bitte einen Status wählen." },
  // </custom:messages>
};

/** The sentence shown when `key` of `entity` is required and empty — the
 *  agent's own text (translated at runtime like every page string), else the
 *  label sentence. Call it while rendering, not at module scope. */
export function requiredMessage(entity: EntityKey, key: string): string {
  const own = (REQUIRED_MESSAGES as Record<string, Record<string, string | undefined> | undefined>)[entity]?.[key];
  if (own && own.trim()) return tx(own);
  return t('v_required', { label: labelOf(entity, key) });
}

/** True when the agent wrote a sentence for the field. */
export function hasOwnMessage(entity: EntityKey, key: string): boolean {
  const own = (REQUIRED_MESSAGES as Record<string, Record<string, string | undefined> | undefined>)[entity]?.[key];
  return Boolean(own && own.trim());
}
