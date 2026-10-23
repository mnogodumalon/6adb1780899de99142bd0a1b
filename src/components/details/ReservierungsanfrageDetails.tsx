import type { Reservierungsanfrage } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { usePermissions } from '@/lib/permissions';

export interface ReservierungsanfrageDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Reservierungsanfrage;
}

export function ReservierungsanfrageDetails({
  record,
}: ReservierungsanfrageDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('reservierungsanfrage', 'vorname')} value={record.fields.vorname} format="text" />
        <RecordField label={fieldLabel('reservierungsanfrage', 'nachname')} value={record.fields.nachname} format="text" />
        <RecordField label={fieldLabel('reservierungsanfrage', 'email')} value={record.fields.email} format="email" />
        <RecordField label={fieldLabel('reservierungsanfrage', 'telefon')} value={record.fields.telefon} format="text" />
        <RecordField label={fieldLabel('reservierungsanfrage', 'hundename')} value={record.fields.hundename} format="text" />
        <RecordField label={fieldLabel('reservierungsanfrage', 'rasse')} value={record.fields.rasse} format="text" />
        <RecordField label={fieldLabel('reservierungsanfrage', 'groesse')} value={record.fields.groesse} format="pill" />
        <RecordField label={fieldLabel('reservierungsanfrage', 'wunsch_anreise')} value={record.fields.wunsch_anreise} format="date" />
        <RecordField label={fieldLabel('reservierungsanfrage', 'wunsch_abreise')} value={record.fields.wunsch_abreise} format="date" />
        <RecordField label={fieldLabel('reservierungsanfrage', 'nachricht')} value={record.fields.nachricht} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('reservierungsanfrage', 'status')} value={record.fields.status} format="pill" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.RESERVIERUNGSANFRAGE} recordId={record.record_id} readOnly={!perms.canWrite('reservierungsanfrage')} />
    </>
  );
}
