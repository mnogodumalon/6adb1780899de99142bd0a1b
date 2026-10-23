import type { Buchungen, Besitzer, Hunde, Plaetze } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { usePermissions } from '@/lib/permissions';

export interface BuchungenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Buchungen;
  /** N:1-Ziel „Besitzer": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  besitzerList: Besitzer[];
  /** Klick auf die Besitzer-Relation → overlay.push auf dessen Detail. */
  onOpenBesitzer?: (record: Besitzer) => void;
  /** N:1-Ziel „Hunde": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  hundeList: Hunde[];
  /** Klick auf die Hunde-Relation → overlay.push auf dessen Detail. */
  onOpenHunde?: (record: Hunde) => void;
  /** N:1-Ziel „Plaetze": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  plaetzeList: Plaetze[];
  /** Klick auf die Plaetze-Relation → overlay.push auf dessen Detail. */
  onOpenPlaetze?: (record: Plaetze) => void;
}

export function BuchungenDetails({
  record,
  besitzerList,
  onOpenBesitzer,
  hundeList,
  onOpenHunde,
  plaetzeList,
  onOpenPlaetze,
}: BuchungenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const besitzerTarget = besitzerList.find(r => r.record_id === extractRecordId(record.fields.besitzer));
  const hundTarget = hundeList.find(r => r.record_id === extractRecordId(record.fields.hund));
  const platzTarget = plaetzeList.find(r => r.record_id === extractRecordId(record.fields.platz));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('buchungen', 'anreise')} value={record.fields.anreise} format="date" />
        <RecordField label={fieldLabel('buchungen', 'abreise')} value={record.fields.abreise} format="date" />
        <RecordField label={fieldLabel('buchungen', 'status')} value={record.fields.status} format="pill" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={2}>
        <RecordRelation
          label={fieldLabel('buchungen', 'besitzer')}
          name={besitzerTarget?.fields.vorname ?? '—'}
          meta={[besitzerTarget?.fields.email, besitzerTarget?.fields.telefon].filter(Boolean).join(' · ') || undefined}
          onClick={besitzerTarget && onOpenBesitzer ? () => onOpenBesitzer!(besitzerTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('buchungen', 'hund')}
          name={hundTarget?.fields.hundename ?? '—'}
          meta={[hundTarget?.fields.rasse].filter(Boolean).join(' · ') || undefined}
          onClick={hundTarget && onOpenHunde ? () => onOpenHunde!(hundTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('buchungen', 'platz')}
          name={platzTarget?.fields.bezeichnung ?? '—'}
          meta={undefined}
          onClick={platzTarget && onOpenPlaetze ? () => onOpenPlaetze!(platzTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.BUCHUNGEN} recordId={record.record_id} readOnly={!perms.canWrite('buchungen')} />
    </>
  );
}
