import type { Plaetze, Buchungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface PlaetzeDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Plaetze;
  /** 1:N „Buchungen" (platz): VOLLE Liste — der Block filtert auf diesen Record. */
  buchungenList: Buchungen[];
  /** Zeilen-Klick → overlay.push auf das Buchungen-Detail (nie der Edit-Dialog). */
  onOpenBuchungen: (record: Buchungen) => void;
  /** Kontextuelles „+": öffnet den Buchungen-Dialog mit diesem Record vorgesetzt. */
  onAddBuchungen?: () => void;
}

export function PlaetzeDetails({
  record,
  buchungenList,
  onOpenBuchungen,
  onAddBuchungen,
}: PlaetzeDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('plaetze', 'bezeichnung')} value={record.fields.bezeichnung} format="text" />
        <RecordField label={fieldLabel('plaetze', 'platzart')} value={record.fields.platzart} format="pill" />
        <RecordField label={fieldLabel('plaetze', 'hinweise')} value={record.fields.hinweise} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <SatelliteSection
        title={appLabel('buchungen')}
        items={buchungenList.filter(r => extractRecordId(r.fields.platz) === record.record_id)}
        map={r => ({ name: appLabel('buchungen'), meta: r.fields.anreise })}
        onOpen={onOpenBuchungen}
        onAdd={onAddBuchungen}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.PLAETZE} recordId={record.record_id} readOnly={!perms.canWrite('plaetze')} />
    </>
  );
}
