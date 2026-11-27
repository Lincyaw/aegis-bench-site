import { consoleHuntVerdictValues } from '../api/schema';
import type { Hunt, HuntFacet, HuntProbe, HuntRecord, HuntTrial, HuntVerdict, Locale, RunHuntFinding, TrialRecord } from '../api/types';
import { benchmarkOf } from './benchmarks';
import { runEventRowOf, runEventsOf, runRowOf } from './consoleRuns';
import { openedIndexes, readTrajectory, recordedRunOf } from './records';

/*
 * The hunts recorded over each benchmark's trajectories. Probes mark trajectories per facet; readers read some of the
 * marked ones and a random sample of the rest. What a hunt found, and how precise its probes are, is counted from its
 * trials.
 */

export function huntById(benchmarkId: string, huntId: string): HuntRecord | undefined {
  return benchmarkOf(benchmarkId).hunts.find(hunt => hunt.id === huntId);
}

export function verdictOf(trial: TrialRecord): HuntVerdict {
  return !trial.read ? 'unread' : trial.confirmedFacets.length > 0 ? 'confirmed' : 'cleared';
}

/** The 95% Wilson score interval of a share. */
export function wilsonInterval(successes: number, trials: number): [number, number] {
  const z = 1.96;
  const share = successes / trials;
  const denominator = 1 + (z * z) / trials;
  const centre = (share + (z * z) / (2 * trials)) / denominator;
  const margin = (z * Math.sqrt((share * (1 - share)) / trials + (z * z) / (4 * trials * trials))) / denominator;
  return [Math.max(0, centre - margin), Math.min(1, centre + margin)];
}

export function probeOf(probe: { name: string; kind: string }, facetId: string, trials: TrialRecord[]): HuntProbe {
  const hit = trials.filter(trial => trial.marks.some(mark => mark.facetId === facetId && mark.probes.includes(probe.name)));
  const read = hit.filter(trial => trial.read);
  const found = read.filter(trial => trial.confirmedFacets.includes(facetId)).length;
  return {
    name: probe.name, kind: probe.kind, hits: hit.length, read: read.length, found, unread: hit.length - read.length,
    ...(read.length > 0 && { precision: found / read.length, precisionInterval: wilsonInterval(found, read.length) }),
  };
}

export function huntOf(benchmarkId: string, hunt: HuntRecord): Hunt {
  const { trials } = hunt;
  const random = trials.filter(trial => trial.markedFacets.length === 0);
  const randomFinds = random.filter(trial => trial.confirmedFacets.length > 0).length;
  const read = trials.filter(trial => trial.read);
  const facets: HuntFacet[] = hunt.facets.map(facet => ({
    id: facet.id, name: facet.name, ...(facet.edge && { edge: facet.edge }), definition: facet.definition, excludes: facet.excludes,
    found: trials.filter(trial => trial.confirmedFacets.includes(facet.id)).length,
    marked: trials.filter(trial => trial.markedFacets.includes(facet.id)).length,
    probes: facet.probes.map(probe => probeOf(probe, facet.id, trials)),
  }));
  return {
    id: hunt.id, title: hunt.title, need: hunt.need, rounds: hunt.rounds, converged: hunt.converged, recordedAt: hunt.recordedAt,
    found: trials.filter(trial => trial.confirmedFacets.length > 0).length,
    coverage: {
      trajectories: benchmarkOf(benchmarkId).runs.length, read: read.length, marked: trials.length - random.length,
      randomReads: random.length, randomFinds, ...(random.length > 0 && { missShareUpper: wilsonInterval(randomFinds, random.length)[1] }),
    },
    calibration: hunt.calibration,
    facets,
  };
}

export function huntTrialOf(benchmarkId: string, trial: TrialRecord, locale: Locale): HuntTrial {
  return {
    run: runRowOf(benchmarkId, recordedRunOf(trial.runId).fact, locale), verdict: verdictOf(trial),
    confirmedFacets: trial.confirmedFacets, markedFacets: trial.markedFacets,
    marks: trial.marks.length, ...(trial.marks.length > 0 && { firstStep: Math.min(...trial.marks.map(mark => mark.step)) }),
  };
}

/** The trials of a hunt a filter keeps, in list order: the verdicts in the order the spec declares them, each newest first. */
export function filteredTrialsOf(hunt: HuntRecord, facet: string, verdict: HuntVerdict | undefined): TrialRecord[] {
  const finishedAt = (trial: TrialRecord) => recordedRunOf(trial.runId).fact.finishedAt;
  return hunt.trials
    .filter(trial => (!facet || trial.markedFacets.includes(facet) || trial.confirmedFacets.includes(facet)) && (!verdict || verdictOf(trial) === verdict))
    .toSorted((a, b) => consoleHuntVerdictValues.indexOf(verdictOf(a)) - consoleHuntVerdictValues.indexOf(verdictOf(b)) || finishedAt(b).localeCompare(finishedAt(a)));
}

/** What every hunt found in one run, with the marked steps as the run's trajectory records them, or nothing when there is no such run. */
export async function runHuntFindingsOf(runId: string): Promise<RunHuntFinding[] | undefined> {
  const located = openedIndexes().runs.get(runId);
  if (!located) {
    return undefined;
  }
  const { record, hunts } = benchmarkOf(located.benchmarkId);
  const events = runEventsOf(await readTrajectory(record, runId));
  return hunts.flatMap(hunt => {
    const trial = hunt.trials.find(candidate => candidate.runId === runId);
    if (!trial) {
      return [];
    }
    const verdict = verdictOf(trial);
    const facetIds = [...new Set([...trial.markedFacets, ...trial.confirmedFacets])];
    const facets = hunt.facets.filter(facet => facetIds.includes(facet.id)).map(facet => ({
      facetId: facet.id, name: facet.name, definition: facet.definition, confirmed: trial.confirmedFacets.includes(facet.id),
      marks: trial.marks.filter(mark => mark.facetId === facet.id).map(mark => {
        const stepEvents = events.filter(event => event.stepId === mark.step);
        const event = stepEvents.find(candidate => candidate.kind === 'toolCall' || candidate.kind === 'submit') ?? stepEvents[0];
        if (!event) {
          throw new Error(`hunt ${hunt.id} marks step ${mark.step}, which run ${runId} does not have`);
        }
        const { index: _index, stepId: _stepId, ...marked } = runEventRowOf(event);
        return { step: mark.step, ...marked, probes: mark.probes };
      }),
    }));
    return [{ huntId: hunt.id, title: hunt.title, need: hunt.need, verdict, ...(trial.why && { why: trial.why }), facets }];
  });
}
