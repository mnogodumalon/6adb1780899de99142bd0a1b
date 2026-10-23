/**
 * Buchungsanfrage bearbeiten — 3-Schritt-Wizard.
 * Steps: 1) Offene Anfrage wählen → 2) Annehmen oder ablehnen → 3) Status speichern (Prüfen).
 * Reads: reservierungsanfrage. Writes: reservierungsanfrage (status, update of the picked record).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldLookup, fieldDate, formatRange } from '@/lib/journey';
import { useBuchungsanfrageBearbeitenFlow } from '@/lib/journey/flows/BuchungsanfrageBearbeiten';
import { tx } from '@/i18n';

export default function BuchungsanfrageBearbeitenPage() {
  const [step, setStep] = useState(1);
  const flow = useBuchungsanfrageBearbeitenFlow({
    steps: { reservierungsanfrage: 1, status: 2 },
    items: {
      reservierungsanfrage: r => {
        const von = fieldDate(r, 'wunsch_anreise');
        const bis = fieldDate(r, 'wunsch_abreise');
        return {
          id: r.id,
          title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
          subtitle: `${fieldText(r, 'hundename')} · ${formatRange(von, bis, 'nights')}`,
          status: fieldLookup(r, 'status') ?? undefined,
        };
      },
    },
  });

  const form = flow.forms.reservierungsanfrage;
  const pickedId = flow.pick('reservierungsanfrage').selectedId;
  const picked = pickedId ? flow.picks.reservierungsanfrage.recordOf(pickedId) : undefined;

  return (
    <IntentWizardShell
      title={tx('Buchungsanfrage bearbeiten')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Eine offene Anfrage prüfen und annehmen oder ablehnen.'),
        needs: [tx('Eine offene Reservierungsanfrage')],
      }}
    >
      <WizardStep label={tx('Anfrage')} description={tx('Welche offene Anfrage möchtest du bearbeiten?')}>
        <EntitySelectStep
          {...flow.picks.reservierungsanfrage.select}
          {...flow.pick('reservierungsanfrage')}
          searchPlaceholder={tx('Name oder Hund suchen …')}
          emptyText={tx('Es gibt keine offenen Anfragen.')}
          avatar="initials"
        />
      </WizardStep>
      <WizardStep
        label={tx('Entscheidung')}
        description={tx('Anfrage annehmen oder ablehnen.')}
        needs={['reservierungsanfrage']}
      >
        <div className="space-y-4">
          {picked && (
            <div className="rounded-2xl border bg-card p-4 space-y-1 text-sm overflow-hidden">
              <p className="font-medium truncate">
                {`${fieldText(picked, 'vorname')} ${fieldText(picked, 'nachname')}`.trim()}
              </p>
              <p className="text-muted-foreground">
                {tx`${fieldText(picked, 'hundename')} (${fieldText(picked, 'rasse')}, ${fieldLookup(picked, 'groesse')?.label ?? '—'})`}
              </p>
              <p className="text-muted-foreground">
                {formatRange(fieldDate(picked, 'wunsch_anreise'), fieldDate(picked, 'wunsch_abreise'), 'nights')}
              </p>
              {fieldText(picked, 'nachricht') && (
                <p className="pt-1 whitespace-pre-line">{fieldText(picked, 'nachricht')}</p>
              )}
            </div>
          )}
          <Bound form={form} name="status" />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => flow.validateStep(2)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Der Status der Anfrage wird gespeichert.')}
          />
        )}
      </WizardStep>
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          actions={{ copy: false, print: false }}
          next={[
            { label: tx('Neue Buchung anlegen'), href: '#/intents/neue-buchung' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
