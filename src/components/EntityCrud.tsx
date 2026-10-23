/**
 * EntityCrud — pre-generated CRUD + overlay plumbing for the dashboard.
 * Compose it; NEVER re-roll dialog state, submit handlers, an overlay stack
 * or a RecordOverlayHost in the page — this file owns all of it.
 *
 * API at a glance:
 *   const data = useDashboardData();
 *   const crud = useEntityCrud(data, {
 *     // optional — the ONE semantic slot on the overlay: the record's next
 *     // workflow step. Return undefined for types without one.
 *     footer: (top) => top.type === 'besitzer'
 *       ? { label: …, onClick: () => … }
 *       : undefined,
 *   });
 *
 *   `top.type` is the SAME camelCase key as `crud.<entity>` — one spelling
 *   per entity, everywhere in this API.
 *   …
 *   crud.besitzer.openCreate({ …defaults })   // create dialog, prefilled — defaults are
 *                                       // shape-tolerant: bare lookup keys / record ids are fine
 *   crud.besitzer.openEdit(record)            // edit dialog (recordId + defaults wired)
 *   crud.besitzer.openDetail(record)          // record overlay — pass the RAW record,
 *                                       // enrichment is resolved inside
 *   crud.overlay                         // RecordOverlayStack<OverlayItem> for drills:
 *                                       // push / pop / replace / close
 *   crud.enriched.besitzer              // the display-ready array for EVERY entity —
 *                                       // Enriched* where relations exist, the raw array
 *                                       // otherwise. Reuse these; never call enrich*()
 *                                       // in the page, and never guess which entity has
 *                                       // one: they all do.
 *   {crud.surfaces}                      // render ONCE at the end of the page JSX:
 *                                       // all entity dialogs + the overlay host
 *
 * Built in (do NOT re-implement): optimistic update + Rückgängig counter-write
 * on edit, fetchAll-on-error, edit-from-overlay, and per-entity overlay bodies
 * (RecordHeader + <{Entity}Details> with every relation reachable and the
 * contextual "+" prefilled; list-field back-references additionally get a
 * "choose existing" picker that links an EXISTING record — built in, do not
 * re-roll). Drag writes (onEventDrop/onCardMove) stay YOURS:
 * optimistic setter first, PATCH in background, undoToast with counter-write.
 *
 * Overlay content per entity (the host renders these — you never compose
 * Details blocks yourself):
 *   besitzer: vorname, nachname, email, telefon, strasse, hausnummer, plz, ort  ·  ← hunde (list + contextual +) · ← buchungen (list + contextual +) · ← aufenthaltsportraets (list + contextual +)
 *   hunde: hundename, rasse, groesse, geburtsdatum, besonderheiten, besitzer  ·  → besitzer · ← buchungen (list + contextual +) · ← aufenthaltsportraets (list + contextual +)
 *   plaetze: bezeichnung, platzart, hinweise  ·  ← buchungen (list + contextual +)
 *   buchungen: besitzer, hund, anreise, abreise, platz, status  ·  → besitzer · → hunde · → plaetze
 *   aufenthaltsportraets: hund, besitzer, titel, charakterbeschreibung, lieblingsaktivitaet, besondere_momente, portraetfoto, erstellungsdatum  ·  → hunde · → besitzer
 *   reservierungsanfrage: vorname, nachname, email, telefon, hundename, rasse, groesse, wunsch_anreise, …
 */
import { useState, useMemo, type ReactNode } from 'react';
import type { Besitzer, Hunde, Plaetze, Buchungen, Aufenthaltsportraets, Reservierungsanfrage } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { enrichHunde, enrichBuchungen, enrichAufenthaltsportraets } from '@/lib/enrich';
import type { EnrichedHunde, EnrichedBuchungen, EnrichedAufenthaltsportraets } from '@/types/enriched';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  useRecordOverlayStack, RecordOverlayHost, RecordHeader,
  type RecordOverlayStack,
} from '@/components/widgets/RecordView';
import { BesitzerDialog, type BesitzerDialogDefaults } from '@/components/dialogs/BesitzerDialog';
import { BesitzerDetails } from '@/components/details/BesitzerDetails';
import { HundeDialog, type HundeDialogDefaults } from '@/components/dialogs/HundeDialog';
import { HundeDetails } from '@/components/details/HundeDetails';
import { PlaetzeDialog, type PlaetzeDialogDefaults } from '@/components/dialogs/PlaetzeDialog';
import { PlaetzeDetails } from '@/components/details/PlaetzeDetails';
import { BuchungenDialog, type BuchungenDialogDefaults } from '@/components/dialogs/BuchungenDialog';
import { BuchungenDetails } from '@/components/details/BuchungenDetails';
import { AufenthaltsportraetsDialog, type AufenthaltsportraetsDialogDefaults } from '@/components/dialogs/AufenthaltsportraetsDialog';
import { AufenthaltsportraetsDetails } from '@/components/details/AufenthaltsportraetsDetails';
import { ReservierungsanfrageDialog, type ReservierungsanfrageDialogDefaults } from '@/components/dialogs/ReservierungsanfrageDialog';
import { ReservierungsanfrageDetails } from '@/components/details/ReservierungsanfrageDetails';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { t, appLabel } from '@/i18n';
import { undoToast } from '@/lib/polish';
import { usePermissions } from '@/lib/permissions';
import { toast } from 'sonner';
import { formatDate } from '@/lib/formatters';

// The overlay union — one branch per entity, `record` typed the way the data
// flows: Enriched* where enrichment exists, the raw record type otherwise.
// The host resolves enrichment itself; pages pass raw records everywhere.
export type OverlayItem =
  | { type: 'besitzer'; record: Besitzer }
  | { type: 'hunde'; record: EnrichedHunde }
  | { type: 'plaetze'; record: Plaetze }
  | { type: 'buchungen'; record: EnrichedBuchungen }
  | { type: 'aufenthaltsportraets'; record: EnrichedAufenthaltsportraets }
  | { type: 'reservierungsanfrage'; record: Reservierungsanfrage };

/** The useDashboardData() return — pass it in, never re-fetch inside. */
export type EntityCrudData = ReturnType<typeof useDashboardData>;

export interface EntityCrudOptions {
  /** Per-type overlay footer — the record's next workflow step. */
  footer?: (top: OverlayItem) => ReactNode | { label: ReactNode; onClick: () => void } | undefined;
  placement?: 'side' | 'center';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface EntityCrudApi<TRecord, TDefaults> {
  /** Open the create dialog, optionally prefilled (shape-tolerant defaults). */
  openCreate: (defaults?: TDefaults) => void;
  /** Open the edit dialog for a record (recordId + defaults are wired). */
  openEdit: (record: TRecord) => void;
  /** Open the record overlay (raw record is fine — enrichment resolved inside). */
  openDetail: (record: TRecord) => void;
  /** May the signed-in user create/change records of this list? (the
   *  platform's rights — show a „+ Neu“ only when true; openCreate/openEdit
   *  refuse with a notice otherwise). */
  canWrite: boolean;
}

export interface EntityCrud {
  /** The overlay stack for drills: push / pop / replace / close. */
  overlay: RecordOverlayStack<OverlayItem>;
  /** Render ONCE at the end of the page JSX — all dialogs + the overlay host. */
  surfaces: ReactNode;
  besitzer: EntityCrudApi<Besitzer, BesitzerDialogDefaults>;
  hunde: EntityCrudApi<Hunde, HundeDialogDefaults>;
  plaetze: EntityCrudApi<Plaetze, PlaetzeDialogDefaults>;
  buchungen: EntityCrudApi<Buchungen, BuchungenDialogDefaults>;
  aufenthaltsportraets: EntityCrudApi<Aufenthaltsportraets, AufenthaltsportraetsDialogDefaults>;
  reservierungsanfrage: EntityCrudApi<Reservierungsanfrage, ReservierungsanfrageDialogDefaults>;
  /** The display-ready array per entity: Enriched* where an enrich function
   *  exists, the raw array otherwise. One key per entity so no page has to
   *  know which is which. Reuse these; never re-enrich in the page. */
  enriched: { besitzer: Besitzer[]; hunde: EnrichedHunde[]; plaetze: Plaetze[]; buchungen: EnrichedBuchungen[]; aufenthaltsportraets: EnrichedAufenthaltsportraets[]; reservierungsanfrage: Reservierungsanfrage[] };
}

export function useEntityCrud(data: EntityCrudData, options?: EntityCrudOptions): EntityCrud {
  const overlay = useRecordOverlayStack<OverlayItem>();
  // the platform's rights of the signed-in user (lib/permissions.ts) — unknown = allowed
  const perms = usePermissions();
  const refuse = () => { toast.error(t('perm_denied_title'), { description: t('perm_denied_desc') }); };
  const [besitzerDialog, setBesitzerDialog] = useState<{ defaults?: BesitzerDialogDefaults; editing?: Besitzer } | null>(null);
  const [hundeDialog, setHundeDialog] = useState<{ defaults?: HundeDialogDefaults; editing?: Hunde } | null>(null);
  const [plaetzeDialog, setPlaetzeDialog] = useState<{ defaults?: PlaetzeDialogDefaults; editing?: Plaetze } | null>(null);
  const [buchungenDialog, setBuchungenDialog] = useState<{ defaults?: BuchungenDialogDefaults; editing?: Buchungen } | null>(null);
  const [aufenthaltsportraetsDialog, setAufenthaltsportraetsDialog] = useState<{ defaults?: AufenthaltsportraetsDialogDefaults; editing?: Aufenthaltsportraets } | null>(null);
  const [reservierungsanfrageDialog, setReservierungsanfrageDialog] = useState<{ defaults?: ReservierungsanfrageDialogDefaults; editing?: Reservierungsanfrage } | null>(null);
  const enrichedHunde = useMemo(() => enrichHunde(data.hunde, { besitzerMap: data.besitzerMap }), [data.hunde, data.besitzerMap]);
  const enrichedBuchungen = useMemo(() => enrichBuchungen(data.buchungen, { besitzerMap: data.besitzerMap, hundeMap: data.hundeMap, plaetzeMap: data.plaetzeMap }), [data.buchungen, data.besitzerMap, data.hundeMap, data.plaetzeMap]);
  const enrichedAufenthaltsportraets = useMemo(() => enrichAufenthaltsportraets(data.aufenthaltsportraets, { hundeMap: data.hundeMap, besitzerMap: data.besitzerMap }), [data.aufenthaltsportraets, data.hundeMap, data.besitzerMap]);

  function detailBesitzer(record: Besitzer, push = false) {
    const item: OverlayItem = { type: 'besitzer', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitBesitzer(fields: Besitzer['fields']) {
    const editing = besitzerDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setBesitzer(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateBesitzerEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('besitzer')} — ${t('crud_updated')}`, async () => {
        data.setBesitzer(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateBesitzerEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createBesitzerEntry(fields);
      undoToast(`${appLabel('besitzer')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailHunde(record: Hunde, push = false) {
    const rec = enrichedHunde.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'hunde', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitHunde(fields: Hunde['fields']) {
    const editing = hundeDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setHunde(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateHundeEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('hunde')} — ${t('crud_updated')}`, async () => {
        data.setHunde(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateHundeEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createHundeEntry(fields);
      undoToast(`${appLabel('hunde')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailPlaetze(record: Plaetze, push = false) {
    const item: OverlayItem = { type: 'plaetze', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitPlaetze(fields: Plaetze['fields']) {
    const editing = plaetzeDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setPlaetze(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updatePlaetzeEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('plaetze')} — ${t('crud_updated')}`, async () => {
        data.setPlaetze(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updatePlaetzeEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createPlaetzeEntry(fields);
      undoToast(`${appLabel('plaetze')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailBuchungen(record: Buchungen, push = false) {
    const rec = enrichedBuchungen.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'buchungen', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitBuchungen(fields: Buchungen['fields']) {
    const editing = buchungenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setBuchungen(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateBuchungenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('buchungen')} — ${t('crud_updated')}`, async () => {
        data.setBuchungen(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateBuchungenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createBuchungenEntry(fields);
      undoToast(`${appLabel('buchungen')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailAufenthaltsportraets(record: Aufenthaltsportraets, push = false) {
    const rec = enrichedAufenthaltsportraets.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'aufenthaltsportraets', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitAufenthaltsportraets(fields: Aufenthaltsportraets['fields']) {
    const editing = aufenthaltsportraetsDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setAufenthaltsportraets(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateAufenthaltsportraet(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('aufenthaltsportraets')} — ${t('crud_updated')}`, async () => {
        data.setAufenthaltsportraets(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateAufenthaltsportraet(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createAufenthaltsportraet(fields);
      undoToast(`${appLabel('aufenthaltsportraets')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailReservierungsanfrage(record: Reservierungsanfrage, push = false) {
    const item: OverlayItem = { type: 'reservierungsanfrage', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitReservierungsanfrage(fields: Reservierungsanfrage['fields']) {
    const editing = reservierungsanfrageDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setReservierungsanfrage(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateReservierungsanfrageEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('reservierungsanfrage')} — ${t('crud_updated')}`, async () => {
        data.setReservierungsanfrage(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateReservierungsanfrageEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createReservierungsanfrageEntry(fields);
      undoToast(`${appLabel('reservierungsanfrage')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  const surfaces = (
    <>
      <BesitzerDialog
        open={besitzerDialog !== null}
        onClose={() => setBesitzerDialog(null)}
        onSubmit={submitBesitzer}
        defaultValues={besitzerDialog?.defaults}
        recordId={besitzerDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Besitzer']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Besitzer']}
      />
      <HundeDialog
        open={hundeDialog !== null}
        onClose={() => setHundeDialog(null)}
        onSubmit={submitHunde}
        defaultValues={hundeDialog?.defaults}
        recordId={hundeDialog?.editing?.record_id}
        besitzerList={data.besitzer}
        enablePhotoScan={AI_PHOTO_SCAN['Hunde']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Hunde']}
      />
      <PlaetzeDialog
        open={plaetzeDialog !== null}
        onClose={() => setPlaetzeDialog(null)}
        onSubmit={submitPlaetze}
        defaultValues={plaetzeDialog?.defaults}
        recordId={plaetzeDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Plaetze']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Plaetze']}
      />
      <BuchungenDialog
        open={buchungenDialog !== null}
        onClose={() => setBuchungenDialog(null)}
        onSubmit={submitBuchungen}
        defaultValues={buchungenDialog?.defaults}
        recordId={buchungenDialog?.editing?.record_id}
        besitzerList={data.besitzer}
        hundeList={data.hunde}
        plaetzeList={data.plaetze}
        enablePhotoScan={AI_PHOTO_SCAN['Buchungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Buchungen']}
      />
      <AufenthaltsportraetsDialog
        open={aufenthaltsportraetsDialog !== null}
        onClose={() => setAufenthaltsportraetsDialog(null)}
        onSubmit={submitAufenthaltsportraets}
        defaultValues={aufenthaltsportraetsDialog?.defaults}
        recordId={aufenthaltsportraetsDialog?.editing?.record_id}
        hundeList={data.hunde}
        besitzerList={data.besitzer}
        enablePhotoScan={AI_PHOTO_SCAN['Aufenthaltsportraets']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Aufenthaltsportraets']}
      />
      <ReservierungsanfrageDialog
        open={reservierungsanfrageDialog !== null}
        onClose={() => setReservierungsanfrageDialog(null)}
        onSubmit={submitReservierungsanfrage}
        defaultValues={reservierungsanfrageDialog?.defaults}
        recordId={reservierungsanfrageDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Reservierungsanfrage']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Reservierungsanfrage']}
      />
      <RecordOverlayHost
        overlay={overlay}
        placement={options?.placement}
        size={options?.size}
        footer={options?.footer}
        render={(top) => {
          if (top.type === 'besitzer') {
            return (
              <>
                <RecordHeader title={top.record.fields.vorname ?? appLabel('besitzer')} subtitle={undefined} />
                <BesitzerDetails
                  record={top.record}
                  hundeList={data.hunde}
                  onOpenHunde={(r) => detailHunde(r, true)}
                  onAddHunde={perms.canWrite('hunde') ? () => setHundeDialog({ defaults: { besitzer: createRecordUrl(APP_IDS.BESITZER, top.record.record_id) } }) : undefined}
                  buchungenList={data.buchungen}
                  onOpenBuchungen={(r) => detailBuchungen(r, true)}
                  onAddBuchungen={perms.canWrite('buchungen') ? () => setBuchungenDialog({ defaults: { besitzer: createRecordUrl(APP_IDS.BESITZER, top.record.record_id) } }) : undefined}
                  aufenthaltsportraetsList={data.aufenthaltsportraets}
                  onOpenAufenthaltsportraets={(r) => detailAufenthaltsportraets(r, true)}
                  onAddAufenthaltsportraets={perms.canWrite('aufenthaltsportraets') ? () => setAufenthaltsportraetsDialog({ defaults: { besitzer: createRecordUrl(APP_IDS.BESITZER, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'hunde') {
            return (
              <>
                <RecordHeader title={top.record.fields.hundename ?? appLabel('hunde')} subtitle={top.record.fields.geburtsdatum ? formatDate(top.record.fields.geburtsdatum) : undefined} />
                <HundeDetails
                  record={top.record}
                  besitzerList={data.besitzer}
                  onOpenBesitzer={(r) => detailBesitzer(r, true)}
                  buchungenList={data.buchungen}
                  onOpenBuchungen={(r) => detailBuchungen(r, true)}
                  onAddBuchungen={perms.canWrite('buchungen') ? () => setBuchungenDialog({ defaults: { hund: createRecordUrl(APP_IDS.HUNDE, top.record.record_id) } }) : undefined}
                  aufenthaltsportraetsList={data.aufenthaltsportraets}
                  onOpenAufenthaltsportraets={(r) => detailAufenthaltsportraets(r, true)}
                  onAddAufenthaltsportraets={perms.canWrite('aufenthaltsportraets') ? () => setAufenthaltsportraetsDialog({ defaults: { hund: createRecordUrl(APP_IDS.HUNDE, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'plaetze') {
            return (
              <>
                <RecordHeader title={top.record.fields.bezeichnung ?? appLabel('plaetze')} subtitle={undefined} />
                <PlaetzeDetails
                  record={top.record}
                  buchungenList={data.buchungen}
                  onOpenBuchungen={(r) => detailBuchungen(r, true)}
                  onAddBuchungen={perms.canWrite('buchungen') ? () => setBuchungenDialog({ defaults: { platz: createRecordUrl(APP_IDS.PLAETZE, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'buchungen') {
            return (
              <>
                <RecordHeader title={appLabel('buchungen')} subtitle={top.record.fields.anreise ? formatDate(top.record.fields.anreise) : undefined} />
                <BuchungenDetails
                  record={top.record}
                  besitzerList={data.besitzer}
                  onOpenBesitzer={(r) => detailBesitzer(r, true)}
                  hundeList={data.hunde}
                  onOpenHunde={(r) => detailHunde(r, true)}
                  plaetzeList={data.plaetze}
                  onOpenPlaetze={(r) => detailPlaetze(r, true)}
                />
              </>
            );
          }
          if (top.type === 'aufenthaltsportraets') {
            return (
              <>
                <RecordHeader title={top.record.fields.titel ?? appLabel('aufenthaltsportraets')} subtitle={top.record.fields.erstellungsdatum ? formatDate(top.record.fields.erstellungsdatum) : undefined} />
                <AufenthaltsportraetsDetails
                  record={top.record}
                  hundeList={data.hunde}
                  onOpenHunde={(r) => detailHunde(r, true)}
                  besitzerList={data.besitzer}
                  onOpenBesitzer={(r) => detailBesitzer(r, true)}
                />
              </>
            );
          }
          if (top.type === 'reservierungsanfrage') {
            return (
              <>
                <RecordHeader title={top.record.fields.vorname ?? appLabel('reservierungsanfrage')} subtitle={top.record.fields.wunsch_anreise ? formatDate(top.record.fields.wunsch_anreise) : undefined} />
                <ReservierungsanfrageDetails
                  record={top.record}
                />
              </>
            );
          }
          return null;
        }}
        canEdit={(top) => {
          if (top.type === 'besitzer') return perms.canWrite('besitzer');
          if (top.type === 'hunde') return perms.canWrite('hunde');
          if (top.type === 'plaetze') return perms.canWrite('plaetze');
          if (top.type === 'buchungen') return perms.canWrite('buchungen');
          if (top.type === 'aufenthaltsportraets') return perms.canWrite('aufenthaltsportraets');
          if (top.type === 'reservierungsanfrage') return perms.canWrite('reservierungsanfrage');
          return true;
        }}
        onEdit={(top) => {
          overlay.close();
          if (top.type === 'besitzer') setBesitzerDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'hunde') setHundeDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'plaetze') setPlaetzeDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'buchungen') setBuchungenDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'aufenthaltsportraets') setAufenthaltsportraetsDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'reservierungsanfrage') setReservierungsanfrageDialog({ editing: top.record, defaults: top.record.fields });
        }}
      />
    </>
  );

  return {
    overlay,
    surfaces,
    besitzer: {
      openCreate: (defaults?: BesitzerDialogDefaults) => (perms.canWrite('besitzer') ? setBesitzerDialog({ defaults }) : refuse()),
      openEdit: (record: Besitzer) => (perms.canWrite('besitzer') ? setBesitzerDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Besitzer) => detailBesitzer(record, false),
      canWrite: perms.canWrite('besitzer'),
    },
    hunde: {
      openCreate: (defaults?: HundeDialogDefaults) => (perms.canWrite('hunde') ? setHundeDialog({ defaults }) : refuse()),
      openEdit: (record: Hunde) => (perms.canWrite('hunde') ? setHundeDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Hunde) => detailHunde(record, false),
      canWrite: perms.canWrite('hunde'),
    },
    plaetze: {
      openCreate: (defaults?: PlaetzeDialogDefaults) => (perms.canWrite('plaetze') ? setPlaetzeDialog({ defaults }) : refuse()),
      openEdit: (record: Plaetze) => (perms.canWrite('plaetze') ? setPlaetzeDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Plaetze) => detailPlaetze(record, false),
      canWrite: perms.canWrite('plaetze'),
    },
    buchungen: {
      openCreate: (defaults?: BuchungenDialogDefaults) => (perms.canWrite('buchungen') ? setBuchungenDialog({ defaults }) : refuse()),
      openEdit: (record: Buchungen) => (perms.canWrite('buchungen') ? setBuchungenDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Buchungen) => detailBuchungen(record, false),
      canWrite: perms.canWrite('buchungen'),
    },
    aufenthaltsportraets: {
      openCreate: (defaults?: AufenthaltsportraetsDialogDefaults) => (perms.canWrite('aufenthaltsportraets') ? setAufenthaltsportraetsDialog({ defaults }) : refuse()),
      openEdit: (record: Aufenthaltsportraets) => (perms.canWrite('aufenthaltsportraets') ? setAufenthaltsportraetsDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Aufenthaltsportraets) => detailAufenthaltsportraets(record, false),
      canWrite: perms.canWrite('aufenthaltsportraets'),
    },
    reservierungsanfrage: {
      openCreate: (defaults?: ReservierungsanfrageDialogDefaults) => (perms.canWrite('reservierungsanfrage') ? setReservierungsanfrageDialog({ defaults }) : refuse()),
      openEdit: (record: Reservierungsanfrage) => (perms.canWrite('reservierungsanfrage') ? setReservierungsanfrageDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Reservierungsanfrage) => detailReservierungsanfrage(record, false),
      canWrite: perms.canWrite('reservierungsanfrage'),
    },
    enriched: { besitzer: data.besitzer, hunde: enrichedHunde, plaetze: data.plaetze, buchungen: enrichedBuchungen, aufenthaltsportraets: enrichedAufenthaltsportraets, reservierungsanfrage: data.reservierungsanfrage },
  };
}
