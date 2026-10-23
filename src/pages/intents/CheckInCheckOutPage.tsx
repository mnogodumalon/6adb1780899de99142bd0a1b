/**
 * Check-in und Check-out — 3-Schritt-Wizard.
 * Steps: 1) Buchung wählen → 2) Check-in oder Check-out wählen → 3) Status speichern (Prüfen).
 * Reads: buchungen (inkl. Besitzer, Hund, Platz über ctx.ref). Writes: buchungen.status (Update über useCheckInCheckOutFlow).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldDate, fieldLookup } from '@/lib/journey';
import { useCheckInCheckOutFlow } from '@/lib/journey/flows/CheckInCheckOut';
import { tx } from '@/i18n';

function day(iso: string | null): string {
  return iso ? format(parseISO(iso), 'dd.MM.yyyy') : '?';
}

export default function CheckInCheckOutPage() {
  const [step, setStep] = useState(1);
  const flow = useCheckInCheckOutFlow({
    steps: { buchungen: 1, status: 2 },
    items: {
      buchungen: (b, ctx) => {
        const status = fieldLookup(b, 'status');
        return {
          id: b.id,
          title: ctx.ref('besitzer') ?? tx('Ohne Besitzer'),
          subtitle: `${ctx.ref('hund') ?? ''} · ${ctx.ref('platz') ?? ''} · ${day(fieldDate(b, 'anreise'))} – ${day(fieldDate(b, 'abreise'))}`,
          status: status ?? undefined,
        };
      },
    },
  });
  const picked = flow.pick('buchungen');

  return (
    <IntentWizardShell
      title={tx('Check-in und Check-out')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Eine Buchung auswählen und ihren Status setzen.'),
        needs: [tx('Die Buchung des Gastes')],
      }}
    >
      <WizardStep label={tx('Buchung')} description={tx('Welche Buchung soll ein- oder ausgecheckt werden?')}>
        <EntitySelectStep
          {...flow.picks.buchungen.select}
          {...picked}
          avatar="initials"
          searchPlaceholder={tx('Buchung suchen …')}
        />
      </WizardStep>
      <WizardStep label={tx('Status')} description={tx('Check-in oder Check-out wählen.')}>
        {picked.selectedId ? (
          <div className="space-y-4">
            <Bound form={flow.forms.buchungen} name="status" />
            <StepNav
              onBack={() => setStep(1)}
              onNext={() => flow.validateStep(2)}
              nextStepLabel={tx('Prüfen')}
            />
          </div>
        ) : (
          <StepNav onBack={() => setStep(1)} nextDisabled>
            {tx('Dieser Schritt braucht die Auswahl aus Schritt 1.')}
          </StepNav>
        )}
      </WizardStep>
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Der Status der Buchung wird sofort aktualisiert.')}
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
            { label: tx('Neue Buchung'), href: '#/intents/neue-buchung' },
            { label: tx('Aufenthaltsporträt erstellen'), href: '#/intents/aufenthaltsportraet-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
