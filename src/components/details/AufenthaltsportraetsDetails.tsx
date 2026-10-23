import type { Aufenthaltsportraets, Hunde, Besitzer } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';
import { usePermissions } from '@/lib/permissions';

export interface AufenthaltsportraetsDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Aufenthaltsportraets;
  /** N:1-Ziel „Hunde": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  hundeList: Hunde[];
  /** Klick auf die Hunde-Relation → overlay.push auf dessen Detail. */
  onOpenHunde?: (record: Hunde) => void;
  /** N:1-Ziel „Besitzer": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  besitzerList: Besitzer[];
  /** Klick auf die Besitzer-Relation → overlay.push auf dessen Detail. */
  onOpenBesitzer?: (record: Besitzer) => void;
}

export function AufenthaltsportraetsDetails({
  record,
  hundeList,
  onOpenHunde,
  besitzerList,
  onOpenBesitzer,
}: AufenthaltsportraetsDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const hundTarget = hundeList.find(r => r.record_id === extractRecordId(record.fields.hund));
  const besitzerTarget = besitzerList.find(r => r.record_id === extractRecordId(record.fields.besitzer));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('aufenthaltsportraets', 'titel')} value={record.fields.titel} format="text" />
        <RecordField label={fieldLabel('aufenthaltsportraets', 'charakterbeschreibung')} value={record.fields.charakterbeschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('aufenthaltsportraets', 'lieblingsaktivitaet')} value={record.fields.lieblingsaktivitaet} format="text" />
        <RecordField label={fieldLabel('aufenthaltsportraets', 'besondere_momente')} value={record.fields.besondere_momente} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('aufenthaltsportraets', 'portraetfoto')} className="md:col-span-2">
          {record.fields.portraetfoto ? (
            <MediaThumbnail src={record.fields.portraetfoto as string} fit="contain" className="max-h-64 w-full rounded-lg" />
          ) : '—'}
        </RecordField>
        <RecordField label={fieldLabel('aufenthaltsportraets', 'erstellungsdatum')} value={record.fields.erstellungsdatum} format="date" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={2}>
        <RecordRelation
          label={fieldLabel('aufenthaltsportraets', 'hund')}
          name={hundTarget?.fields.hundename ?? '—'}
          meta={[hundTarget?.fields.rasse].filter(Boolean).join(' · ') || undefined}
          onClick={hundTarget && onOpenHunde ? () => onOpenHunde!(hundTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('aufenthaltsportraets', 'besitzer')}
          name={besitzerTarget?.fields.vorname ?? '—'}
          meta={[besitzerTarget?.fields.email, besitzerTarget?.fields.telefon].filter(Boolean).join(' · ') || undefined}
          onClick={besitzerTarget && onOpenBesitzer ? () => onOpenBesitzer!(besitzerTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.AUFENTHALTSPORTRAETS} recordId={record.record_id} readOnly={!perms.canWrite('aufenthaltsportraets')} />
    </>
  );
}
