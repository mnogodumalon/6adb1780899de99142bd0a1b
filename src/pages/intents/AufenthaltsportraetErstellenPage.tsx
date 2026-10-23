/**
 * Aufenthaltsporträt erstellen — 5-Schritt-Wizard.
 * Steps: 1) Hund wählen → 2) Besitzer wählen → 3) Titel, Beschreibung, Lieblingsaktivität, besondere Momente → 4) Porträtfoto → 5) Prüfen & speichern.
 * Reads: hunde, besitzer. Writes: aufenthaltsportraets (Erstellungsdatum = heute, vom Flow gesetzt).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, formatFieldValue, todayIso } from '@/lib/journey';
import { useAufenthaltsportraetErstellenFlow } from '@/lib/journey/flows/AufenthaltsportraetErstellen';
import { tx } from '@/i18n';

export default function AufenthaltsportraetErstellenPage() {
  const [step, setStep] = useState(1);
  const flow = useAufenthaltsportraetErstellenFlow({
    steps: {
      hund: 1,
      besitzer: 2,
      titel: 3,
      charakterbeschreibung: 3,
      lieblingsaktivitaet: 3,
      besondere_momente: 3,
      portraetfoto: 4,
    },
    items: {
      hund: r => ({ id: r.id, title: fieldText(r, 'hundename'), subtitle: fieldText(r, 'rasse') }),
      besitzer: r => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
      }),
    },
  });
  const f = flow.forms.aufenthaltsportraets;

  return (
    <IntentWizardShell
      title={tx('Aufenthaltsporträt erstellen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Ein persönliches Porträt für den Aufenthalt eines Hundes anlegen.'),
        needs: [tx('Hund und Besitzer'), tx('Ein paar Worte zum Charakter'), tx('Optional: ein Foto')],
      }}
    >
      <WizardStep label={tx('Hund')} description={tx('Für welchen Hund entsteht das Porträt?')}>
        <EntitySelectStep
          {...flow.picks.hund.select}
          {...flow.pick('hund')}
          avatar="initials"
          searchPlaceholder={tx('Name oder Rasse …')}
        />
      </WizardStep>

      <WizardStep label={tx('Besitzer')} description={tx('Wem gehört der Hund?')}>
        <EntitySelectStep
          {...flow.picks.besitzer.select}
          {...flow.pick('besitzer')}
          avatar="initials"
          searchPlaceholder={tx('Vor- oder Nachname …')}
        />
      </WizardStep>

      <WizardStep label={tx('Porträt')} description={tx('Beschreibe den Hund in deinen eigenen Worten.')}>
        <div className="space-y-4">
          <Bound form={f} name="titel" />
          <Bound form={f} name="charakterbeschreibung" rows={4} />
          <Bound form={f} name="lieblingsaktivitaet" />
          <Bound form={f} name="besondere_momente" rows={4} />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => flow.validateStep(3)}
            nextStepLabel={tx('Foto')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Foto')} description={tx('Lade ein Porträtfoto hoch.')}>
        <div className="space-y-4">
          <Bound form={f} name="portraetfoto" />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => flow.validateStep(4)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[
              {
                key: 'erstellungsdatum',
                label: tx('Erstellungsdatum'),
                value: formatFieldValue('aufenthaltsportraets', 'erstellungsdatum', todayIso()),
              },
            ]}
            whatHappensNext={tx('Das Porträt wird sofort gespeichert und dem Hund zugeordnet.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          restartLabel={tx('Weiteres Porträt')}
          next={[
            { label: tx('Neue Buchung'), href: '#/intents/neue-buchung' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
