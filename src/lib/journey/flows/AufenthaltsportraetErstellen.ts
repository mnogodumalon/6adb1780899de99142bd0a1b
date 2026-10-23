/**
 * useAufenthaltsportraetErstellenFlow — the plumbing of the flow « Aufenthaltsporträt erstellen », generated from the plan.
 *
 * Writes `aufenthaltsportraets`: asks `hund`, `besitzer`, `titel`, `charakterbeschreibung`, `lieblingsaktivitaet`, `besondere_momente`, `portraetfoto`; sets `erstellungsdatum` itself.
 * The hook OWNS: the form(s) with exactly these fields and the plan's required
 * ingredients, one record search per picked field (columns and filter from
 * the plan), and the submit plan with its fixed and derived values. A page
 * that only calls `flow.submit.run()` cannot write a field the plan does not
 * know — there is no way to spell it.
 *
 * YOU decide what a person notices, through the options:
 *   steps     which wizard step asks which field (default: one step per pick,
 *             then one for the typed fields, then "Prüfen" = step 4)
 *   items     how a search hit is displayed per pick (title, subtitle, status …)
 *   initial   prefills for typed fields
 *   messages  the sentence for an empty required field, per field
 *
 *   const flow = useAufenthaltsportraetErstellenFlow({
 *     steps: { hund: 1, besitzer: 2, titel: 3, charakterbeschreibung: 3, lieblingsaktivitaet: 3, besondere_momente: 3, portraetfoto: 3 },
 *     items: { hund: r => ({ id: r.id, title: fieldText(r, 'hundename') }) },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     <EntitySelectStep {...flow.picks.hund.select} {...flow.pick('hund')} />
 *     <EntitySelectStep {...flow.picks.besitzer.select} {...flow.pick('besitzer')} />
 *     <Bound form={flow.forms.aufenthaltsportraets} name="titel" />
 *     <Bound form={flow.forms.aufenthaltsportraets} name="charakterbeschreibung" />
 *     <Bound form={flow.forms.aufenthaltsportraets} name="lieblingsaktivitaet" />
 *     <Bound form={flow.forms.aufenthaltsportraets} name="besondere_momente" />
 *     <Bound form={flow.forms.aufenthaltsportraets} name="portraetfoto" />
 *     <StepNav onNext={() => flow.validateStep(n)} />
 *     {!flow.submit.done && <SummaryStep forms={flow.formList} submit={flow.submit} />}
 *     {flow.submit.result && <SuccessStep result={flow.submit.result} forms={flow.formList} submit={flow.submit} />}
 *   </IntentWizardShell>
 */
import {
  useStepForm, useJourneySubmit, useRecordSearch,
  fieldText, fieldLookup, fieldLookups, fieldNumber, fieldDate, fieldRef,
  todayIso, nowIso, isEmptyValue, policyFixedValue, withPickPolicy, usePolicyVersion,
  type StepForm, type JourneyRecord, type RefContext, type SelectItemLike, type FormValues, type PlanStep,} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { pickHint, whereSentence, type PickWhere } from '@/lib/journey/policy';
import { labelOf, optionsOf, type EntityKey } from '@/lib/journey/rules';
export type AufenthaltsportraetErstellenFieldKey = 'besitzer' | 'besondere_momente' | 'charakterbeschreibung' | 'hund' | 'lieblingsaktivitaet' | 'portraetfoto' | 'titel';

export interface AufenthaltsportraetErstellenForms {
  aufenthaltsportraets: StepForm<'aufenthaltsportraets'>;
}

// Alias so the option generics stay readable.
type Key = AufenthaltsportraetErstellenFieldKey;

export interface AufenthaltsportraetErstellenFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** How a search hit reads — the card's title/subtitle/status per pick. */
  items?: {
    hund?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    besitzer?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
}

const DEFAULT_STEPS: Record<string, number> = {"besitzer": 2, "besondere_momente": 3, "charakterbeschreibung": 3, "hund": 1, "lieblingsaktivitaet": 3, "portraetfoto": 3, "titel": 3};
export const AUFENTHALTSPORTRAETERSTELLEN_REVIEW_STEP = 4;

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

export function useAufenthaltsportraetErstellenFlow(options: AufenthaltsportraetErstellenFlowOptions = {}) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const aufenthaltsportraets = useStepForm('aufenthaltsportraets', {
    fields: ["hund", "besitzer", "titel", "charakterbeschreibung", "lieblingsaktivitaet", "besondere_momente", "portraetfoto"],
    steps: only(steps, ["hund", "besitzer", "titel", "charakterbeschreibung", "lieblingsaktivitaet", "besondere_momente", "portraetfoto"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["hund", "besitzer", "titel", "charakterbeschreibung", "lieblingsaktivitaet", "besondere_momente", "portraetfoto"]),
    messages: only(options.messages as Record<string, string> | undefined, ["hund", "besitzer", "titel", "charakterbeschreibung", "lieblingsaktivitaet", "besondere_momente", "portraetfoto"]),
  });
  const forms: AufenthaltsportraetErstellenForms = { aufenthaltsportraets };
  const formList: StepForm[] = [aufenthaltsportraets];

  // The owner's rules after the build (intent-policies.json): a fixed value
  // for a field this flow sets itself, a narrower or wider pick — read at
  // render time, so a change works on the running application.
  usePolicyVersion();
  const searches = {
    hund: useRecordSearch(servicePort, 'hunde', withPickPolicy('hund', {
      searchFields: ["hundename", "rasse"] as never,
      toItem: options.items?.hund as never,
    })),
    besitzer: useRecordSearch(servicePort, 'besitzer', withPickPolicy('besitzer', {
      searchFields: ["vorname", "nachname"] as never,
      toItem: options.items?.besitzer as never,
    })),
  };
  // Whether a pick offers „Neu anlegen“ is the plan's call: off for the record
  // this flow changes, for multi picks, for a catalogue entity and for an
  // entity with its own flow. The page spreads `.select` and writes no `create=`.
  // what the person sees under the search field: the rule that narrows the
  // pick (the owner's, else the plan's) — and the link that changes it
  const hintFor = (key: string, entity: EntityKey, planned: PickWhere | null) => pickHint(key, planned,
    w => whereSentence(w, f => labelOf(entity, f), (f, v) => optionsOf(entity, f).find(o => o.key === String(v))?.label ?? String(v)),
    `#/verwaltung/anwendung?line=intent:aufenthaltsportraet-erstellen:read:${entity}`);
  const picks = {
    hund: { ...searches.hund, select: { ...searches.hund.select, create: false as boolean, hint: hintFor('hund', 'hunde', null as PickWhere | null) } },
    besitzer: { ...searches.besitzer, select: { ...searches.besitzer.select, create: false as boolean, hint: hintFor('besitzer', 'besitzer', null as PickWhere | null) } },
  };

  const plan: PlanStep[] = [
    {
      key: 'aufenthaltsportraets', entity: 'aufenthaltsportraets', form: aufenthaltsportraets, primary: true,
      values: (): FormValues => ({
        erstellungsdatum: policyFixedValue('aufenthaltsportraets', 'erstellungsdatum') ?? todayIso(),
      }),
    },
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'aufenthaltsportraet-erstellen' });

  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: AufenthaltsportraetErstellenFieldKey) => {
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
  const pickMany = (field: AufenthaltsportraetErstellenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)));
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); };

  return {
    slug: 'aufenthaltsportraet-erstellen' as const,
    draftKey: 'aufenthaltsportraet-erstellen' as const,
    entity: 'aufenthaltsportraets' as const,
    form: aufenthaltsportraets,
    forms, formList, picks, submit, steps,    reviewStep: AUFENTHALTSPORTRAETERSTELLEN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,
    // the door the hook reads through — for what it does not own: availability
    // (useOccupancy(flow.port, …)), a count (useRecordCount(flow.port, …)). A page
    // importing servicePort next to the hook fails gate 3 (fewo 05.10.2026: the
    // gate taught useOccupancy(servicePort, …) and forbade servicePort at once)
    port: servicePort,
  };
}

export type AufenthaltsportraetErstellenFlow = ReturnType<typeof useAufenthaltsportraetErstellenFlow>;
