import type { Besitzer, Hunde, Buchungen, Aufenthaltsportraets } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface BesitzerDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Besitzer;
  /** 1:N „Hunde" (besitzer): VOLLE Liste — der Block filtert auf diesen Record. */
  hundeList: Hunde[];
  /** Zeilen-Klick → overlay.push auf das Hunde-Detail (nie der Edit-Dialog). */
  onOpenHunde: (record: Hunde) => void;
  /** Kontextuelles „+": öffnet den Hunde-Dialog mit diesem Record vorgesetzt. */
  onAddHunde?: () => void;
  /** 1:N „Buchungen" (besitzer): VOLLE Liste — der Block filtert auf diesen Record. */
  buchungenList: Buchungen[];
  /** Zeilen-Klick → overlay.push auf das Buchungen-Detail (nie der Edit-Dialog). */
  onOpenBuchungen: (record: Buchungen) => void;
  /** Kontextuelles „+": öffnet den Buchungen-Dialog mit diesem Record vorgesetzt. */
  onAddBuchungen?: () => void;
  /** 1:N „Aufenthaltsporträts" (besitzer): VOLLE Liste — der Block filtert auf diesen Record. */
  aufenthaltsportraetsList: Aufenthaltsportraets[];
  /** Zeilen-Klick → overlay.push auf das Aufenthaltsportraets-Detail (nie der Edit-Dialog). */
  onOpenAufenthaltsportraets: (record: Aufenthaltsportraets) => void;
  /** Kontextuelles „+": öffnet den Aufenthaltsportraets-Dialog mit diesem Record vorgesetzt. */
  onAddAufenthaltsportraets?: () => void;
}

export function BesitzerDetails({
  record,
  hundeList,
  onOpenHunde,
  onAddHunde,
  buchungenList,
  onOpenBuchungen,
  onAddBuchungen,
  aufenthaltsportraetsList,
  onOpenAufenthaltsportraets,
  onAddAufenthaltsportraets,
}: BesitzerDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('besitzer', 'vorname')} value={record.fields.vorname} format="text" />
        <RecordField label={fieldLabel('besitzer', 'nachname')} value={record.fields.nachname} format="text" />
        <RecordField label={fieldLabel('besitzer', 'email')} value={record.fields.email} format="email" />
        <RecordField label={fieldLabel('besitzer', 'telefon')} value={record.fields.telefon} format="text" />
        <RecordField label={fieldLabel('besitzer', 'strasse')} value={record.fields.strasse} format="text" />
        <RecordField label={fieldLabel('besitzer', 'hausnummer')} value={record.fields.hausnummer} format="text" />
        <RecordField label={fieldLabel('besitzer', 'plz')} value={record.fields.plz} format="text" />
        <RecordField label={fieldLabel('besitzer', 'ort')} value={record.fields.ort} format="text" />
      </RecordSection>

      <SatelliteSection
        title={appLabel('hunde')}
        items={hundeList.filter(r => extractRecordId(r.fields.besitzer) === record.record_id)}
        map={r => ({ name: r.fields.hundename ?? appLabel('hunde'), meta: r.fields.geburtsdatum })}
        onOpen={onOpenHunde}
        onAdd={onAddHunde}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('buchungen')}
        items={buchungenList.filter(r => extractRecordId(r.fields.besitzer) === record.record_id)}
        map={r => ({ name: appLabel('buchungen'), meta: r.fields.anreise })}
        onOpen={onOpenBuchungen}
        onAdd={onAddBuchungen}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('aufenthaltsportraets')}
        items={aufenthaltsportraetsList.filter(r => extractRecordId(r.fields.besitzer) === record.record_id)}
        map={r => ({ name: r.fields.titel ?? appLabel('aufenthaltsportraets'), meta: r.fields.erstellungsdatum })}
        onOpen={onOpenAufenthaltsportraets}
        onAdd={onAddAufenthaltsportraets}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.BESITZER} recordId={record.record_id} readOnly={!perms.canWrite('besitzer')} />
    </>
  );
}
