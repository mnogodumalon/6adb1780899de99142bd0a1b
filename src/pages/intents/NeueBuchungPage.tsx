/**
 * Neue Buchung — 5-Schritt-Wizard.
 * Steps: 1) Besitzer wählen oder neu anlegen → 2) Hund wählen oder neu anlegen → 3) Anreise/Abreise
 *        → 4) Platz wählen (Belegung wird geprüft) → 5) Prüfen & speichern. Status startet als „reserviert“.
 * Reads: besitzer, hunde, plaetze, buchungen (Belegung). Writes: besitzer (optional), hunde (optional), buchungen.
 * Composes: IntentWizardShell, EntitySelectStep, Bound, AvailabilityRangePicker, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { AvailabilityRangePicker } from '@/components/blocks/AvailabilityRangePicker';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldLookup, fieldRef, useOccupancy } from '@/lib/journey';
import { useNeueBuchungFlow } from '@/lib/journey/flows/NeueBuchung';
import { tx } from '@/i18n';

type Mode = 'pick' | 'new';
type SetLoose = (key: string, value: unknown, label?: string) => void;

function ModeSwitch({ mode, onChange, pickLabel, newLabel }: {
  mode: Mode; onChange: (m: Mode) => void; pickLabel: string; newLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <Button type="button" variant={mode === 'pick' ? 'default' : 'outline'} onClick={() => onChange('pick')}>{pickLabel}</Button>
      <Button type="button" variant={mode === 'new' ? 'default' : 'outline'} onClick={() => onChange('new')}>{newLabel}</Button>
    </div>
  );
}

export default function NeueBuchungPage() {
  const [step, setStep] = useState(1);
  const [ownerMode, setOwnerMode] = useState<Mode>('pick');
  const [dogMode, setDogMode] = useState<Mode>('pick');

  const flow = useNeueBuchungFlow({
    steps: {
      besitzer: 1, vorname: 1, nachname: 1, email: 1, telefon: 1, strasse: 1, hausnummer: 1, plz: 1, ort: 1,
      hund: 2, hundename: 2, rasse: 2, groesse: 2, geburtsdatum: 2, besonderheiten: 2,
      anreise: 3, abreise: 3, platz: 4,
    },
    items: {
      besitzer: r => ({ id: r.id, title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(), subtitle: fieldText(r, 'ort') }),
      hund: (r, ctx) => ({
        id: r.id,
        title: fieldText(r, 'hundename'),
        subtitle: [fieldText(r, 'rasse'), ctx.ref('besitzer')].filter(Boolean).join(' · '),
      }),
      platz: r => ({ id: r.id, title: fieldText(r, 'bezeichnung'), subtitle: fieldLookup(r, 'platzart')?.label ?? fieldText(r, 'hinweise') }),
    },
  });

  const { besitzer, hunde, buchungen } = flow.forms;
  const anreise = (buchungen.get('anreise') as string | null) ?? null;
  const abreise = (buchungen.get('abreise') as string | null) ?? null;
  const platzId = (buchungen.get('platz') as string | null) ?? null;
  const ownerId = (buchungen.get('besitzer') as string | null) ?? null;
  const occupancy = useOccupancy(flow.port, 'buchungen', { resource: platzId });

  const ownerPick = flow.picks.besitzer;
  const dogPick = flow.picks.hund;

  const changeOwnerMode = (m: Mode) => {
    setOwnerMode(m);
    if (m === 'new') {
      (buchungen.set as SetLoose)('besitzer', null);
      (hunde.set as SetLoose)('besitzer', null);
    } else {
      besitzer.reset();
    }
  };

  const changeDogMode = (m: Mode) => {
    setDogMode(m);
    if (m === 'new') {
      (buchungen.set as SetLoose)('hund', null);
    } else {
      const keepOwner = ownerMode === 'pick' ? ownerId : null;
      hunde.reset();
      if (keepOwner) (hunde.set as SetLoose)('besitzer', keepOwner, ownerPick.labelOf(keepOwner));
    }
  };

  const onOwnerSelect = (id: string) => {
    const label = ownerPick.labelOf(id);
    (buchungen.set as SetLoose)('besitzer', id, label);
    (hunde.set as SetLoose)('besitzer', id, label);
    // an already picked dog belongs to the previous owner
    (buchungen.set as SetLoose)('hund', null);
  };

  // existing dogs of the picked owner only
  const dogItems = dogPick.select.items.filter(item => {
    if (ownerMode !== 'pick' || !ownerId) return true;
    const rec = dogPick.recordOf(item.id);
    return !rec || fieldRef(rec, 'besitzer') === ownerId;
  });

  // no existing dog to pick → the new-dog form is the step
  const effDogMode: Mode = dogMode === 'pick' && !dogPick.select.loading && dogItems.length === 0 ? 'new' : dogMode;

  const platzItems = flow.picks.platz.select.items.map(item => (
    anreise && abreise && !occupancy.isFree(anreise, abreise, item.id)
      ? { ...item, status: { key: 'belegt', label: tx('Im Zeitraum belegt') } }
      : item
  ));

  const checkOwner = () => {
    if (ownerMode === 'new') {
      if (!besitzer.validate(['vorname', 'nachname', 'email', 'telefon', 'strasse', 'hausnummer', 'plz', 'ort'])) return false;
      return true;
    }
    return buchungen.validate(['besitzer']);
  };

  const checkDog = () => {
    if (effDogMode === 'new') {
      if (ownerMode === 'pick' && ownerId) (hunde.set as SetLoose)('besitzer', ownerId, ownerPick.labelOf(ownerId));
      return hunde.validate(['hundename', 'rasse', 'groesse', 'geburtsdatum', 'besonderheiten']);
    }
    return buchungen.validate(['hund']);
  };

  const checkPlatz = (): boolean | string => {
    if (!buchungen.validate(['platz'])) return false;
    if (!platzId || !occupancy.isFree(anreise, abreise, platzId)) {
      return tx('Dieser Platz ist im gewählten Zeitraum bereits belegt.');
    }
    return true;
  };

  return (
    <IntentWizardShell
      title={tx('Neue Buchung')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Besitzer, Hund, Zeitraum und Platz festlegen — der Status startet als reserviert.'),
        needs: [tx('Name des Besitzers'), tx('Name des Hundes'), tx('Anreise und Abreise')],
      }}
    >
      <WizardStep label={tx('Besitzer')} description={tx('Wähle einen bestehenden Besitzer oder lege einen neuen an.')}>
        <ModeSwitch mode={ownerMode} onChange={changeOwnerMode}
          pickLabel={tx('Bestehender Besitzer')} newLabel={tx('Neuer Besitzer')} />
        {ownerMode === 'pick' ? (
          <EntitySelectStep
            {...ownerPick.select}
            create={false}
            avatar="initials"
            selectedId={ownerId}
            onSelect={onOwnerSelect}
            searchPlaceholder={tx('Name oder Ort suchen …')}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Bound form={besitzer} name="vorname" />
            <Bound form={besitzer} name="nachname" />
            <Bound form={besitzer} name="email" />
            <Bound form={besitzer} name="telefon" />
            <Bound form={besitzer} name="strasse" />
            <Bound form={besitzer} name="hausnummer" />
            <Bound form={besitzer} name="plz" />
            <Bound form={besitzer} name="ort" />
          </div>
        )}
        <StepNav onNext={checkOwner} nextStepLabel={tx('Hund')} />
      </WizardStep>

      <WizardStep label={tx('Hund')} description={tx('Wähle den Hund des Besitzers oder lege einen neuen an.')}>
        <ModeSwitch mode={effDogMode} onChange={changeDogMode}
          pickLabel={tx('Bestehender Hund')} newLabel={tx('Neuer Hund')} />
        {effDogMode === 'pick' ? (
          <EntitySelectStep
            {...dogPick.select}
            items={dogItems}
            create={false}
            avatar="initials"
            selectedId={(buchungen.get('hund') as string | null) ?? null}
            onSelect={id => (buchungen.set as SetLoose)('hund', id, dogPick.labelOf(id))}
            searchPlaceholder={tx('Name oder Rasse suchen …')}
            emptyText={tx('Für diesen Besitzer ist noch kein Hund erfasst — lege oben einen neuen an.')}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Bound form={hunde} name="hundename" />
            <Bound form={hunde} name="rasse" />
            <Bound form={hunde} name="groesse" />
            <Bound form={hunde} name="geburtsdatum" />
            <Bound form={hunde} name="besonderheiten" className="sm:col-span-2" />
          </div>
        )}
        <StepNav onBack={() => setStep(1)} onNext={checkDog} nextStepLabel={tx('Zeitraum')} />
      </WizardStep>

      <WizardStep label={tx('Zeitraum')} description={tx('Anreise und Abreise im Kalender wählen.')}>
        <AvailabilityRangePicker {...buchungen.range('anreise', 'abreise', { blocked: [] })} />
        <StepNav
          onBack={() => setStep(2)}
          onNext={() => buchungen.validate(['anreise', 'abreise'])}
          nextStepLabel={tx('Platz')}
        />
      </WizardStep>

      <WizardStep label={tx('Platz')} description={tx('Wähle einen Platz — belegte Plätze im Zeitraum sind markiert.')} needs={['anreise', 'abreise']}>
        <EntitySelectStep
          {...flow.picks.platz.select}
          items={platzItems}
          create={false}
          avatar="none"
          selectedId={platzId}
          onSelect={id => (buchungen.set as SetLoose)('platz', id, flow.picks.platz.labelOf(id))}
          searchPlaceholder={tx('Platz suchen …')}
        />
        <StepNav onBack={() => setStep(3)} onNext={checkPlatz} nextStepLabel={tx('Prüfen')} />
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Die Buchung wird als reserviert angelegt. Neue Besitzer und Hunde werden dabei mit angelegt.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          next={[
            { label: tx('Check-in und Check-out'), href: '#/intents/check-in-check-out' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
