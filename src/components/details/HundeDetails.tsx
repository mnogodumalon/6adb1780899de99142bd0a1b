import type { Hunde, Besitzer, Buchungen, Aufenthaltsportraets } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface HundeDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Hunde;
  /** N:1-Ziel „Besitzer": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  besitzerList: Besitzer[];
  /** Klick auf die Besitzer-Relation → overlay.push auf dessen Detail. */
  onOpenBesitzer?: (record: Besitzer) => void;
  /** 1:N „Buchungen" (hund): VOLLE Liste — der Block filtert auf diesen Record. */
  buchungenList: Buchungen[];
  /** Zeilen-Klick → overlay.push auf das Buchungen-Detail (nie der Edit-Dialog). */
  onOpenBuchungen: (record: Buchungen) => void;
  /** Kontextuelles „+": öffnet den Buchungen-Dialog mit diesem Record vorgesetzt. */
  onAddBuchungen?: () => void;
  /** 1:N „Aufenthaltsporträts" (hund): VOLLE Liste — der Block filtert auf diesen Record. */
  aufenthaltsportraetsList: Aufenthaltsportraets[];
  /** Zeilen-Klick → overlay.push auf das Aufenthaltsportraets-Detail (nie der Edit-Dialog). */
  onOpenAufenthaltsportraets: (record: Aufenthaltsportraets) => void;
  /** Kontextuelles „+": öffnet den Aufenthaltsportraets-Dialog mit diesem Record vorgesetzt. */
  onAddAufenthaltsportraets?: () => void;
}

export function HundeDetails({
  record,
  besitzerList,
  onOpenBesitzer,
  buchungenList,
  onOpenBuchungen,
  onAddBuchungen,
  aufenthaltsportraetsList,
  onOpenAufenthaltsportraets,
  onAddAufenthaltsportraets,
}: HundeDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const besitzerTarget = besitzerList.find(r => r.record_id === extractRecordId(record.fields.besitzer));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('hunde', 'hundename')} value={record.fields.hundename} format="text" />
        <RecordField label={fieldLabel('hunde', 'rasse')} value={record.fields.rasse} format="text" />
        <RecordField label={fieldLabel('hunde', 'groesse')} value={record.fields.groesse} format="pill" />
        <RecordField label={fieldLabel('hunde', 'geburtsdatum')} value={record.fields.geburtsdatum} format="date" />
        <RecordField label={fieldLabel('hunde', 'besonderheiten')} value={record.fields.besonderheiten} format="longtext" className="md:col-span-2" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('hunde', 'besitzer')}
          name={besitzerTarget?.fields.vorname ?? '—'}
          meta={[besitzerTarget?.fields.email, besitzerTarget?.fields.telefon].filter(Boolean).join(' · ') || undefined}
          onClick={besitzerTarget && onOpenBesitzer ? () => onOpenBesitzer!(besitzerTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={appLabel('buchungen')}
        items={buchungenList.filter(r => extractRecordId(r.fields.hund) === record.record_id)}
        map={r => ({ name: appLabel('buchungen'), meta: r.fields.anreise })}
        onOpen={onOpenBuchungen}
        onAdd={onAddBuchungen}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('aufenthaltsportraets')}
        items={aufenthaltsportraetsList.filter(r => extractRecordId(r.fields.hund) === record.record_id)}
        map={r => ({ name: r.fields.titel ?? appLabel('aufenthaltsportraets'), meta: r.fields.erstellungsdatum })}
        onOpen={onOpenAufenthaltsportraets}
        onAdd={onAddAufenthaltsportraets}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.HUNDE} recordId={record.record_id} readOnly={!perms.canWrite('hunde')} />
    </>
  );
}
