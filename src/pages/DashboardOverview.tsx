import { useMemo, useState } from 'react';
import { format, addDays, parseISO } from 'date-fns';
import { IconBellRinging, IconDog, IconPlus, IconPaw } from '@tabler/icons-react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { flowActionFor } from '@/config/plan';
import type { EnrichedBuchungen } from '@/types/enriched';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { formatDate, lookupKey } from '@/lib/formatters';
import { dateFnsLocale, tx, appLabel } from '@/i18n';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { Button } from '@/components/ui/button';
import {
  ResourceTimeline,
  type ResourceEvent,
  type ResourceGroup,
  type ResourceTone,
} from '@/components/widgets/ResourceTimeline';

type Filter = 'all' | 'anreise' | 'abreise' | 'haus';

const day = (s?: string) => (s ? s.slice(0, 10) : '');

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const { plaetze, buchungen, reservierungsanfrage, setBuchungen, fetchAll } = data;
  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type === 'buchungen') return nextStepFor(top.record);
      if (top.type === 'reservierungsanfrage') {
        const go = flowActionFor('reservierungsanfrage', 'status', top.record.record_id, 'angenommen');
        return go && lookupKey(top.record.fields.status) === 'neu' ? { label: tx('Anfrage bearbeiten'), onClick: go } : undefined;
      }
      return undefined;
    },
  });
  const enrichedBuchungen = crud.enriched.buchungen;
  const clock = useClock();
  const today = format(clock, 'yyyy-MM-dd');
  const [filter, setFilter] = useState<Filter>('all');

  // The next workflow step belongs to the check-in/out flow — we only open it.
  function nextStepFor(b: { record_id: string; fields: { status?: { key: string; label: string } } }) {
    const st = lookupKey(b.fields.status);
    const target = st === 'reserviert' ? 'eingecheckt' : st === 'eingecheckt' ? 'ausgecheckt' : null;
    if (!target) return undefined;
    const go = flowActionFor('buchungen', 'status', b.record_id, target);
    if (!go) return undefined;
    return { label: target === 'eingecheckt' ? tx('Einchecken') : tx('Auschecken'), onClick: go };
  }

  const stat = (b: EnrichedBuchungen) => lookupKey(b.fields.status);
  const arrivals = enrichedBuchungen.filter(b => stat(b) === 'reserviert' && day(b.fields.anreise) === today);
  const departures = enrichedBuchungen.filter(b => stat(b) === 'eingecheckt' && day(b.fields.abreise) !== '' && day(b.fields.abreise) <= today);
  const inHouse = enrichedBuchungen.filter(b => stat(b) === 'eingecheckt');
  const occupiedPlaces = new Set(
    inHouse.map(b => extractRecordId(b.fields.platz)).filter((x): x is string => !!x),
  ).size;
  const occupancyPct = plaetze.length > 0 ? Math.round((occupiedPlaces / plaetze.length) * 100) : 0;

  const neueAnfragen = useMemo(
    () => reservierungsanfrage.filter(r => lookupKey(r.fields.status) === 'neu'),
    [reservierungsanfrage],
  );

  const groups = useMemo<ResourceGroup[]>(
    () => plaetze.map(p => ({ key: p.record_id, label: p.fields.bezeichnung ?? p.record_id })),
    [plaetze],
  );

  const events = useMemo<ResourceEvent[]>(() => {
    const keep = (b: EnrichedBuchungen) => {
      const s = lookupKey(b.fields.status);
      if (filter === 'anreise') return s === 'reserviert' && day(b.fields.anreise) === today;
      if (filter === 'abreise') return s === 'eingecheckt' && day(b.fields.abreise) !== '' && day(b.fields.abreise) <= today;
      if (filter === 'haus') return s === 'eingecheckt';
      return true;
    };
    return enrichedBuchungen
      .filter(b => !!b.fields.anreise && !!extractRecordId(b.fields.platz) && keep(b))
      .map(b => {
        const s = lookupKey(b.fields.status);
        const tone: ResourceTone = s === 'eingecheckt' ? 'success' : s === 'ausgecheckt' ? 'default' : 'primary';
        return {
          id: `buchung:${b.record_id}`,
          start: day(b.fields.anreise),
          end: b.fields.abreise ? day(b.fields.abreise) : undefined,
          allDay: true,
          title: b.hundName || tx('Buchung'),
          subtitle: b.besitzerName || undefined,
          tone,
          group: extractRecordId(b.fields.platz) ?? '',
        };
      });
  }, [enrichedBuchungen, filter, today]);

  // No double-booking: a place may not hold two stays in the same period
  // (same-day turnover is allowed: departure day == next arrival day).
  const ruleViolation = (id: string, start: string, end: string | undefined, platzId: string | undefined): string | null => {
    const rid = id.split(':')[1];
    const s = day(start);
    const e = day(end) || s;
    if (e < s) return tx('Die Abreise darf nicht vor der Anreise liegen.');
    const clash = buchungen.find(o => {
      if (o.record_id === rid) return false;
      if (extractRecordId(o.fields.platz) !== platzId) return false;
      const os = day(o.fields.anreise);
      const oe = day(o.fields.abreise) || os;
      return s < oe && e > os;
    });
    return clash ? tx('Dieser Platz ist im gewählten Zeitraum bereits belegt.') : null;
  };

  const patchBooking = async (id: string, start: string, end: string | undefined, newGroup?: string): Promise<string | void> => {
    const rid = id.split(':')[1];
    const before = buchungen.find(b => b.record_id === rid);
    if (!before) return;
    const platzId = newGroup ?? extractRecordId(before.fields.platz) ?? undefined;
    const violation = ruleViolation(id, start, end, platzId);
    if (violation) return violation;
    const platzUrl = newGroup ? createRecordUrl(APP_IDS.PLAETZE, newGroup) : before.fields.platz;
    const prev = { anreise: before.fields.anreise, abreise: before.fields.abreise, platz: before.fields.platz };
    setBuchungen(list => list.map(b => b.record_id === rid
      ? { ...b, fields: { ...b.fields, anreise: day(start), ...(end ? { abreise: day(end) } : {}), platz: platzUrl } }
      : b));
    try {
      await LivingAppsService.updateBuchungenEntry(rid, {
        anreise: day(start), ...(end ? { abreise: day(end) } : {}), platz: platzUrl,
      });
      undoToast(tx('Buchung verschoben'), async () => {
        setBuchungen(list => list.map(b => b.record_id === rid ? { ...b, fields: { ...b.fields, ...prev } } : b));
        await LivingAppsService.updateBuchungenEntry(rid, prev);
      });
    } catch {
      await fetchAll();
    }
  };

  const openBooking = (id: string) => {
    const rec = buchungen.find(b => b.record_id === id.split(':')[1]);
    if (rec) crud.buchungen.openDetail(rec);
  };

  const rowFor = (b: EnrichedBuchungen, secondTail: React.ReactNode) => {
    const step = nextStepFor(b);
    return {
      id: b.record_id,
      title: b.hundName || tx('Hund'),
      secondLine: (
        <>
          <span className="text-muted-foreground">{b.platzName || tx('ohne Platz')}</span>
          {secondTail}
        </>
      ),
      action: step,
    };
  };

  const firstAnfrage = neueAnfragen[0];
  const acceptFirst = firstAnfrage ? flowActionFor('reservierungsanfrage', 'status', firstAnfrage.record_id, 'angenommen') : null;

  const nextArrival = enrichedBuchungen
    .filter(b => stat(b) === 'reserviert' && day(b.fields.anreise) > today)
    .sort((a, b) => day(a.fields.anreise).localeCompare(day(b.fields.anreise)))[0];

  const context = (() => {
    if (arrivals.length > 0 && departures.length > 0)
      return tx`Heute reisen ${namen(arrivals.map(b => b.hundName))} an — ${namen(departures.map(b => b.hundName))} ${departures.length === 1 ? 'geht' : 'gehen'} nach Hause.`;
    if (arrivals.length > 0) return tx`Heute reisen ${namen(arrivals.map(b => b.hundName))} an.`;
    if (departures.length > 0) return tx`Heute werden ${namen(departures.map(b => b.hundName))} abgeholt.`;
    if (inHouse.length > 0) return tx`Zu Gast sind aktuell ${namen(inHouse.map(b => b.hundName))}.`;
    if (nextArrival) return tx`Ruhiger Tag — als Nächstes kommt ${nextArrival.hundName} am ${formatDate(nextArrival.fields.anreise)}.`;
    return tx`Noch keine Buchungen — leg die erste an.`;
  })();

  const toggle = (f: Filter) => setFilter(cur => (cur === f ? 'all' : f));
  const weekEnd = format(addDays(parseISO(today), 7), 'yyyy-MM-dd');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{gruss(clock)}</h1>
          <p className="text-sm text-muted-foreground">{context}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {format(clock, 'EEEE, d. MMMM', { locale: dateFnsLocale() })}
          </p>
        </div>
        {crud.buchungen.canWrite && (
          <Button onClick={() => crud.buchungen.openCreate({ status: 'reserviert', anreise: today, abreise: weekEnd })}>
            <IconPlus size={16} className="shrink-0" />
            <span className="ml-1">{tx('Neue Buchung')}</span>
          </Button>
        )}
      </div>

      <DashboardGrid
        variant="wide"
        hero={firstAnfrage ? (
          <HeroBanner
            icon={<IconBellRinging size={18} />}
            tone="warning"
            action={acceptFirst
              ? { label: tx('Anfrage bearbeiten'), onClick: acceptFirst }
              : { label: tx('Anfrage öffnen'), onClick: () => crud.reservierungsanfrage.openDetail(firstAnfrage) }}
          >
            <b>{namen(neueAnfragen.map(r => r.fields.hundename ?? r.fields.nachname ?? ''))}</b>{' '}
            {neueAnfragen.length === 1
              ? tx`wartet auf eine Antwort — Wunsch ab ${formatDate(firstAnfrage.fields.wunsch_anreise)}.`
              : tx`warten auf eine Antwort — zuerst ab ${formatDate(firstAnfrage.fields.wunsch_anreise)}.`}
          </HeroBanner>
        ) : undefined}
        kpis={(
          <StatStrip>
            <StatStripItem
              title={tx('Anreisen heute')}
              value={arrivals.length}
              icon={<IconPaw size={16} className="text-muted-foreground" />}
              onClick={() => toggle('anreise')}
              active={filter === 'anreise'}
            />
            <StatStripItem
              title={tx('Abreisen heute')}
              value={departures.length}
              icon={<IconPaw size={16} className="text-muted-foreground" />}
              onClick={() => toggle('abreise')}
              active={filter === 'abreise'}
            />
            <StatStripItem
              title={tx('Eingecheckt')}
              value={inHouse.length}
              icon={<IconDog size={16} className="text-muted-foreground" />}
              onClick={() => toggle('haus')}
              active={filter === 'haus'}
            />
            <StatStripItem
              title={tx('Plätze belegt')}
              value={`${occupiedPlaces}/${plaetze.length} · ${occupancyPct}%`}
              tone={occupancyPct >= 90 ? 'warning' : 'default'}
            />
          </StatStrip>
        )}
        primary={(
          <ResourceTimeline
            events={events}
            groups={groups}
            axis="day"
            defaultRange="2weeks"
            locale={dateFnsLocale()}
            onEventClick={ev => openBooking(ev.id)}
            onEventDrop={(id, s, e, g) => patchBooking(id, s, e, g)}
            onEventResize={(id, s, e) => patchBooking(id, s, e)}
            onEmptyClick={crud.buchungen.canWrite ? (date, group) => {
              crud.buchungen.openCreate({ status: 'reserviert', anreise: format(date, 'yyyy-MM-dd'), platz: group });
            } : undefined}
            onRangeCreate={crud.buchungen.canWrite ? (start, end, group) => {
              crud.buchungen.openCreate({
                status: 'reserviert',
                anreise: format(start, 'yyyy-MM-dd'),
                abreise: format(end, 'yyyy-MM-dd'),
                platz: group,
              });
            } : undefined}
          />
        )}
        aside={(
          <>
            <WorkList
              title={tx('Heute anstehend')}
              items={[
                ...arrivals.map(b => rowFor(b, <span className="font-medium text-primary"> · {tx('Anreise')}</span>)),
                ...departures.map(b => rowFor(b, <span className="font-medium text-amber-600"> · {tx('Abreise')} {formatDate(b.fields.abreise)}</span>)),
              ]}
              onItemClick={id => openBooking(id)}
              empty={{
                text: nextArrival
                  ? tx`Heute nichts offen — nächste Anreise: ${nextArrival.hundName} am ${formatDate(nextArrival.fields.anreise)}`
                  : tx('Heute nichts offen.'),
              }}
            />
            <WorkList
              title={tx('Neue Anfragen')}
              items={neueAnfragen.map(r => {
                const go = flowActionFor('reservierungsanfrage', 'status', r.record_id, 'angenommen');
                return {
                  id: r.record_id,
                  title: `${r.fields.hundename ?? ''} · ${r.fields.nachname ?? ''}`,
                  secondLine: (
                    <span className="text-muted-foreground">
                      {formatDate(r.fields.wunsch_anreise)} – {formatDate(r.fields.wunsch_abreise)}
                    </span>
                  ),
                  action: go ? { label: tx('Bearbeiten'), onClick: go } : undefined,
                };
              })}
              onItemClick={id => {
                const rec = reservierungsanfrage.find(r => r.record_id === id);
                if (rec) crud.reservierungsanfrage.openDetail(rec);
              }}
              empty={{ text: tx('Keine offenen Anfragen — alles beantwortet.') }}
            />
          </>
        )}
      />
      <p className="sr-only">{appLabel('buchungen')}</p>
      {crud.surfaces}
    </div>
  );
}
