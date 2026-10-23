import { useEffect, useMemo, useState } from 'react';
import { PublicShell } from '@/components/PublicShell';
import {
  loadPublicPagesConfig,
  type PublicPagesConfig,
  type PublicPageConfig,
} from '@/lib/publicClient';
import { useStepForm, useJourneySubmit, useOccupancy } from '@/lib/journey';
import { createPublicPort } from '@/lib/journey/publicPort';
import { IntentWizardShell, type WizardStep } from '@/components/blocks/IntentWizardShell';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { AvailabilityRangePicker } from '@/components/blocks/AvailabilityRangePicker';
import { Bound } from '@/components/blocks/Bound';
import { tx } from '@/i18n';

export default function Reservierungsanfrage() {
  const [cfg, setCfg] = useState<PublicPagesConfig | null>(null);
  const [page, setPage] = useState<PublicPageConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPublicPagesConfig('reservierungsanfrage').then(c => {
      setCfg(c);
      setPage(c?.pages['reservierungsanfrage'] ?? null);
      setLoading(false);
    });
  }, []);

  if (loading || !cfg || !page) {
    return <PublicShell loading={loading} unavailable={!loading} />;
  }
  return <Inner cfg={cfg} page={page} />;
}

function Inner({ cfg, page }: { cfg: PublicPagesConfig; page: PublicPageConfig }) {
  const [step, setStep] = useState(1);
  const port = useMemo(() => createPublicPort(cfg, page), [cfg, page]);
  const occupancy = useOccupancy(port, 'buchungen');

  const form = useStepForm('reservierungsanfrage', {
    fields: [
      'wunsch_anreise', 'wunsch_abreise', 'hundename', 'rasse', 'groesse',
      'vorname', 'nachname', 'email', 'telefon', 'nachricht',
    ],
    steps: {
      wunsch_anreise: 1, wunsch_abreise: 1,
      hundename: 2, rasse: 2, groesse: 2,
      vorname: 3, nachname: 3, email: 3, telefon: 3, nachricht: 3,
    },
    autoComplete: true,
  });
  const submit = useJourneySubmit(
    port,
    [{ key: 'anfrage', entity: 'reservierungsanfrage', form, primary: true }],
    { draftKey: 'reservierungsanfrage' },
  );

  const steps: WizardStep[] = [
    { label: tx('Zeitraum'), description: tx('Wähle Anreise und Abreise – belegte Nächte sind nicht wählbar.') },
    { label: tx('Dein Hund') },
    { label: tx('Kontakt') },
    { label: tx('Prüfen') },
  ];

  return (
    <PublicShell
      title={tx('Reservierungsanfrage')}
      description={tx('Sieh dir die freien Zeiträume an und sende uns deine Anfrage.')}
    >
      <IntentWizardShell
        steps={steps}
        currentStep={step}
        onStepChange={setStep}
        back={false}
        forms={[form]}
        draftKey="reservierungsanfrage"
      >
        {step === 1 && (
          <>
            <AvailabilityRangePicker
              {...form.range('wunsch_anreise', 'wunsch_abreise', { blocked: occupancy.blocked })}
            />
            <StepNav
              hideBack
              onNext={() => form.validate(['wunsch_anreise', 'wunsch_abreise'])}
              nextStepLabel={tx('Dein Hund')}
            />
          </>
        )}
        {step === 2 && (
          <>
            <div className="space-y-4">
              <Bound form={form} name="hundename" />
              <Bound form={form} name="rasse" />
              <Bound form={form} name="groesse" />
            </div>
            <StepNav
              onBack={() => setStep(1)}
              onNext={() => form.validate(['hundename', 'rasse', 'groesse'])}
              nextStepLabel={tx('Kontakt')}
            />
          </>
        )}
        {step === 3 && (
          <>
            <div className="space-y-4">
              <Bound form={form} name="vorname" />
              <Bound form={form} name="nachname" />
              <Bound form={form} name="email" />
              <Bound form={form} name="telefon" />
              <Bound form={form} name="nachricht" />
            </div>
            <StepNav
              onBack={() => setStep(2)}
              onNext={() => form.validate(['vorname', 'nachname', 'email', 'telefon'])}
              nextStepLabel={tx('Prüfen')}
            />
          </>
        )}
        {step === 4 && !submit.done && (
          <SummaryStep
            forms={[form]}
            submit={submit}
            whatHappensNext={tx('Wir prüfen deine Anfrage und melden uns per E-Mail oder Telefon bei dir.')}
          />
        )}
        {submit.result && (
          <SuccessStep
            result={submit.result}
            forms={[form]}
            submit={submit}
            whatHappensNext={tx('Wir prüfen deine Anfrage und melden uns per E-Mail oder Telefon bei dir.')}
          />
        )}
      </IntentWizardShell>
    </PublicShell>
  );
}
