/**
 * useNeueBuchungFlow — the plumbing of the flow « Neue Buchung », generated from the plan.
 *
 * Writes `besitzer` (only when the person fills it): asks `vorname`, `nachname`, `email`, `telefon`, `strasse`, `hausnummer`, `plz`, `ort`.
Writes `hunde` (only when the person fills it): asks `hundename`, `rasse`, `groesse`, `geburtsdatum`, `besonderheiten`, `besitzer`; links `besitzer` ← the created `besitzer`.
Writes `buchungen`: asks `besitzer`, `hund`, `anreise`, `abreise`, `platz`; sets `status` itself; links `besitzer` ← the created `besitzer`, `hund` ← the created `hunde`.
 * The hook OWNS: the form(s) with exactly these fields and the plan's required
 * ingredients, one record search per picked field (columns and filter from
 * the plan), and the submit plan with its fixed and derived values. A page
 * that only calls `flow.submit.run()` cannot write a field the plan does not
 * know — there is no way to spell it.
 *
 * YOU decide what a person notices, through the options:
 *   steps     which wizard step asks which field (default: one step per pick,
 *             then one for the typed fields, then "Prüfen" = step 6)
 *   items     how a search hit is displayed per pick (title, subtitle, status …)
 *   initial   prefills for typed fields
 *   messages  the sentence for an empty required field, per field
 *
 *   const flow = useNeueBuchungFlow({
 *     steps: { besitzer: 2, hund: 3, platz: 4, vorname: 5, nachname: 5, email: 5, telefon: 5, strasse: 5, hausnummer: 5, plz: 5, ort: 5, hundename: 5, rasse: 5, groesse: 5, geburtsdatum: 5, besonderheiten: 5, anreise: 5, abreise: 5 },
 *     items: { besitzer: r => ({ id: r.id, title: fieldText(r, 'vorname') }) },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     <EntitySelectStep {...flow.picks.besitzer.select} {...flow.pick('besitzer')} />
 *     <EntitySelectStep {...flow.picks.buchungen_besitzer.select} {...flow.pick('besitzer')} />
 *     <EntitySelectStep {...flow.picks.hund.select} {...flow.pick('hund')} />
 *     <EntitySelectStep {...flow.picks.platz.select} {...flow.pick('platz')} />
 *     <Bound form={flow.forms.besitzer} name="vorname" />
 *     <Bound form={flow.forms.besitzer} name="nachname" />
 *     <Bound form={flow.forms.besitzer} name="email" />
 *     <Bound form={flow.forms.besitzer} name="telefon" />
 *     <Bound form={flow.forms.besitzer} name="strasse" />
 *     <Bound form={flow.forms.besitzer} name="hausnummer" />
 *     <Bound form={flow.forms.besitzer} name="plz" />
 *     <Bound form={flow.forms.besitzer} name="ort" />
 *     <Bound form={flow.forms.hunde} name="hundename" />
 *     <Bound form={flow.forms.hunde} name="rasse" />
 *     <Bound form={flow.forms.hunde} name="groesse" />
 *     <Bound form={flow.forms.hunde} name="geburtsdatum" />
 *     <Bound form={flow.forms.hunde} name="besonderheiten" />
 *     <Bound form={flow.forms.buchungen} name="anreise" />
 *     <Bound form={flow.forms.buchungen} name="abreise" />
 *     <StepNav onNext={() => flow.validateStep(n)} />
 *     {!flow.submit.done && <SummaryStep forms={flow.formList} submit={flow.submit} />}
 *     {flow.submit.result && <SuccessStep result={flow.submit.result} forms={flow.formList} submit={flow.submit} />}
 *   </IntentWizardShell>
 */
import {
  useStepForm, useJourneySubmit, useRecordSearch,
  fieldText, fieldLookup, fieldLookups, fieldNumber, fieldDate, fieldRef,
  todayIso, nowIso, isEmptyValue, policyFixedValue, withPickPolicy, usePolicyVersion,
  type StepForm, type JourneyRecord, type RefContext, type SelectItemLike, type FormValues, type PlanStep, type SummaryItem,} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { pickHint, whereSentence, type PickWhere } from '@/lib/journey/policy';
import { labelOf, optionsOf, type EntityKey } from '@/lib/journey/rules';
export type NeueBuchungFieldKey = 'abreise' | 'anreise' | 'besitzer' | 'besonderheiten' | 'email' | 'geburtsdatum' | 'groesse' | 'hausnummer' | 'hund' | 'hundename' | 'nachname' | 'ort' | 'platz' | 'plz' | 'rasse' | 'strasse' | 'telefon' | 'vorname';

export interface NeueBuchungForms {
  besitzer: StepForm<'besitzer'>;
  hunde: StepForm<'hunde'>;
  buchungen: StepForm<'buchungen'>;
}

// Alias so the option generics stay readable.
type Key = NeueBuchungFieldKey;

export interface NeueBuchungFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** How a search hit reads — the card's title/subtitle/status per pick. */
  items?: {
    besitzer?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    buchungen_besitzer?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    hund?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    platz?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
}

const DEFAULT_STEPS: Record<string, number> = {"abreise": 5, "anreise": 5, "besitzer": 2, "besonderheiten": 5, "email": 5, "geburtsdatum": 5, "groesse": 5, "hausnummer": 5, "hund": 3, "hundename": 5, "nachname": 5, "ort": 5, "platz": 4, "plz": 5, "rasse": 5, "strasse": 5, "telefon": 5, "vorname": 5};
export const NEUEBUCHUNG_REVIEW_STEP = 6;

function fromPick<T>(pick: { recordOf(id: string): JourneyRecord | undefined }, form: StepForm, field: string, read: (r: JourneyRecord) => T): T | undefined {
  const id = form.get(field);
  const rec = typeof id === 'string' && id ? pick.recordOf(id) : undefined;
  return rec ? read(rec) : undefined;
}
function isoDaysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Returns T, not Partial<T>: a Record's index signature is already "maybe
// absent", and Partial<Record<string, string>> does not assign to the
// Record<string, string> useStepForm wants (tsc, live 23.09.2026 — eight
// errors, one per hook, caught only in the sandbox build).
function only<T extends Record<string, unknown>>(obj: T | undefined, keys: string[]): T | undefined {
  if (!obj) return undefined;
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out as T;
}

function hasValues(form: StepForm): boolean {
  return form.keys.some(k => !isEmptyValue(form.values[k]));
}

export function useNeueBuchungFlow(options: NeueBuchungFlowOptions = {}) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const besitzer = useStepForm('besitzer', {
    fields: ["vorname", "nachname", "email", "telefon", "strasse", "hausnummer", "plz", "ort"],
    steps: only(steps, ["vorname", "nachname", "email", "telefon", "strasse", "hausnummer", "plz", "ort"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["vorname", "nachname", "email", "telefon", "strasse", "hausnummer", "plz", "ort"]),
    messages: only(options.messages as Record<string, string> | undefined, ["vorname", "nachname", "email", "telefon", "strasse", "hausnummer", "plz", "ort"]),
  });
  const hunde = useStepForm('hunde', {
    fields: ["hundename", "rasse", "groesse", "geburtsdatum", "besonderheiten", "besitzer"],
    steps: only(steps, ["hundename", "rasse", "groesse", "geburtsdatum", "besonderheiten", "besitzer"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["hundename", "rasse", "groesse", "geburtsdatum", "besonderheiten", "besitzer"]),
    messages: only(options.messages as Record<string, string> | undefined, ["hundename", "rasse", "groesse", "geburtsdatum", "besonderheiten", "besitzer"]),
  });
  const buchungen = useStepForm('buchungen', {
    fields: ["besitzer", "hund", "anreise", "abreise", "platz"],
    steps: only(steps, ["besitzer", "hund", "anreise", "abreise", "platz"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["besitzer", "hund", "anreise", "abreise", "platz"]),
    messages: only(options.messages as Record<string, string> | undefined, ["besitzer", "hund", "anreise", "abreise", "platz"]),
  });
  const forms: NeueBuchungForms = { besitzer, hunde, buchungen };
  const formList: StepForm[] = [besitzer, hunde, buchungen];

  // The owner's rules after the build (intent-policies.json): a fixed value
  // for a field this flow sets itself, a narrower or wider pick — read at
  // render time, so a change works on the running application.
  usePolicyVersion();
  const searches = {
    besitzer: useRecordSearch(servicePort, 'besitzer', withPickPolicy('besitzer', {
      searchFields: ["vorname", "nachname", "ort"] as never,
      toItem: options.items?.besitzer as never,
    })),
    buchungen_besitzer: useRecordSearch(servicePort, 'besitzer', withPickPolicy('buchungen_besitzer', {
      searchFields: ["vorname", "nachname", "ort"] as never,
      toItem: options.items?.buchungen_besitzer as never,
    })),
    hund: useRecordSearch(servicePort, 'hunde', withPickPolicy('hund', {
      searchFields: ["hundename", "rasse"] as never,
      toItem: options.items?.hund as never,
    })),
    platz: useRecordSearch(servicePort, 'plaetze', withPickPolicy('platz', {
      searchFields: ["bezeichnung", "hinweise"] as never,
      toItem: options.items?.platz as never,
    })),
  };
  // Whether a pick offers „Neu anlegen“ is the plan's call: off for the record
  // this flow changes, for multi picks, for a catalogue entity and for an
  // entity with its own flow. The page spreads `.select` and writes no `create=`.
  // what the person sees under the search field: the rule that narrows the
  // pick (the owner's, else the plan's) — and the link that changes it
  const hintFor = (key: string, entity: EntityKey, planned: PickWhere | null) => pickHint(key, planned,
    w => whereSentence(w, f => labelOf(entity, f), (f, v) => optionsOf(entity, f).find(o => o.key === String(v))?.label ?? String(v)),
    `#/verwaltung/anwendung?line=intent:neue-buchung:read:${entity}`);
  // a fixed value the flow sets itself, as a review row with the link that changes it
  const setting = (entity: EntityKey, field: string, value: unknown): SummaryItem => ({
    key: `setting:${entity}.${field}`, label: labelOf(entity, field),
    value: optionsOf(entity, field).find(o => o.key === String(value))?.label ?? String(value ?? ''),
    href: `#/verwaltung/anwendung?line=intent:neue-buchung:write:${entity}.${field}`,
  });
  const picks = {
    besitzer: { ...searches.besitzer, select: { ...searches.besitzer.select, create: false as boolean, hint: hintFor('besitzer', 'besitzer', null as PickWhere | null) } },
    buchungen_besitzer: { ...searches.buchungen_besitzer, select: { ...searches.buchungen_besitzer.select, create: false as boolean, hint: hintFor('buchungen_besitzer', 'besitzer', null as PickWhere | null) } },
    hund: { ...searches.hund, select: { ...searches.hund.select, create: false as boolean, hint: hintFor('hund', 'hunde', null as PickWhere | null) } },
    platz: { ...searches.platz, select: { ...searches.platz.select, create: false as boolean, hint: hintFor('platz', 'plaetze', null as PickWhere | null) } },
  };

  const besitzerFilled = hasValues(besitzer);
  const hundeFilled = hasValues(hunde);
  const plan: PlanStep[] = [
    ...(besitzerFilled ? [{
      key: 'besitzer', entity: 'besitzer', form: besitzer,    } as PlanStep] : []),
    ...(hundeFilled ? [{
      key: 'hunde', entity: 'hunde', form: hunde,      needs: [besitzerFilled ? 'besitzer' : null].filter((x): x is string => !!x),
      link: { ...(besitzerFilled ? { besitzer: 'besitzer' } : {}) },
    } as PlanStep] : []),
    {
      key: 'buchungen', entity: 'buchungen', form: buchungen, primary: true,      needs: [besitzerFilled ? 'besitzer' : null, hundeFilled ? 'hunde' : null].filter((x): x is string => !!x),
      link: { ...(besitzerFilled ? { besitzer: 'besitzer' } : {}), ...(hundeFilled ? { hund: 'hunde' } : {}) },

      values: (): FormValues => ({
        status: policyFixedValue('buchungen', 'status') ?? "reserviert",
      }),

      // the review shows what this step sets itself — changeable on „Deine Anwendung“, not here
      settings: () => [setting('buchungen', 'status', policyFixedValue('buchungen', 'status') ?? "reserviert")],
    },
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'neue-buchung' });

  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: NeueBuchungFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return {
      selectedId: (typeof owner.get(field) === 'string' ? (owner.get(field) as string) : null) || null,
      // `field as never` collapsed the conditional SetArgs<E, never> to never and
      // no argument was assignable any more (tsc, live 23.09.2026); widen `set`
      // itself instead — the label stays a required third argument.
      onSelect: (id: string) => (owner.set as (k: string, v: unknown, l?: string) => void)(field, id, search?.labelOf(id)),
    };
  };
  /** Props for a multi-record pick step: {...flow.picks.x.select} {...flow.pickMany('x')} */
  const pickMany = (field: NeueBuchungFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)));
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); };

  return {
    slug: 'neue-buchung' as const,
    draftKey: 'neue-buchung' as const,
    entity: 'buchungen' as const,
    form: buchungen,
    forms, formList, picks, submit, steps,    reviewStep: NEUEBUCHUNG_REVIEW_STEP,
    pick, pickMany, validateStep, reset,
    // the door the hook reads through — for what it does not own: availability
    // (useOccupancy(flow.port, …)), a count (useRecordCount(flow.port, …)). A page
    // importing servicePort next to the hook fails gate 3 (fewo 05.10.2026: the
    // gate taught useOccupancy(servicePort, …) and forbade servicePort at once)
    port: servicePort,
  };
}

export type NeueBuchungFlow = ReturnType<typeof useNeueBuchungFlow>;
