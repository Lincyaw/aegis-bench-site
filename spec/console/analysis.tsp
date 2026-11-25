import "@typespec/http";
import "./session.tsp";
import "./runs.tsp";

using Http;

namespace AegisBench.Console;

/*
 * Trajectory analysis: hunts search every trajectory of a benchmark for the behaviour a question describes. A probe
 * marks positions mechanically; a reader reads a whole trajectory and gives a verdict. A trial a reader confirmed was
 * read; a trial that is only marked was read by nobody, and rests on its probes' precision alone. The console reads
 * what the hunts recorded and changes none of it.
 */

/** A probe of a hunt and how it held up over the hits that were read. */
model HuntProbe {
  name: string;

  /** How the probe finds positions, such as a pattern over tool calls */
  kind: string;

  hits: int32;
  read: int32;

  /** Of the hits read, those a reader confirmed */
  found: int32;

  /** found over read; absent while no hit was read */
  precision?: float64;

  /** The 95% Wilson interval of the precision, as [lower, upper] */
  @minItems(2)
  @maxItems(2)
  precisionInterval?: float64[];

  /** Hits nobody read */
  unread: int32;
}

/** Which boundary a facet's behaviour reaches across, when it is about crossing one. */
enum FacetEdge {
  /** The grading material: tests, references, rubrics */
  grader,

  /** The machine the task runs on, beyond the task's own environment */
  localEnvironment,
}

/** One kind of the behaviour a hunt looks for. */
model HuntFacet {
  id: string;
  name: string;
  edge?: FacetEdge;
  definition: string;

  /** What looks like the behaviour but does not count as it */
  excludes: string;

  /** Trials a reader confirmed */
  found: int32;

  /** Trials the facet's probes mark */
  marked: int32;

  probes: HuntProbe[];
}

/** How much of the benchmark's trajectories the hunt saw, and how much it may have missed. */
model HuntCoverage {
  trajectories: int32;

  /** Trajectories a reader read */
  read: int32;

  /** Trajectories a probe marked */
  marked: int32;

  /** Unmarked trajectories read at random, to bound what the probes miss */
  randomReads: int32;

  /** Of those, the ones a reader found the behaviour in */
  randomFinds: int32;

  /** The upper bound of the share of trajectories the probes miss, from the random reads alone; absent without random reads */
  missShareUpper?: float64;
}

/** Trajectories read twice, once with the probes' marks shown and once without, and how often the two verdicts agreed. */
model HuntCalibration {
  pairs: int32;
  agreement?: float64;
}

/** One hunt over a benchmark's trajectories. Its question, facets and verdicts are records, in the language they were written in. */
model Hunt {
  id: string;
  title: string;

  /** The question the hunt answers */
  need: string;

  rounds: int32;

  /** Whether the last rounds found no new kind of behaviour and no trajectory the probes miss */
  converged: boolean;

  recordedAt: utcDateTime;

  /** Trials a reader confirmed for any facet */
  found: int32;

  coverage: HuntCoverage;
  calibration: HuntCalibration;
  facets: HuntFacet[];
}

/** What a reader concluded of a trial. */
enum HuntVerdict {
  /** A reader read it and confirmed at least one facet */
  confirmed,

  /** A reader read it and found none of the behaviour */
  cleared,

  /** Only probes marked it; nobody read it */
  unread,
}

/** One trial a hunt marked or read. */
model HuntTrial {
  run: RunRow;
  verdict: HuntVerdict;

  /** Facets the reader confirmed */
  confirmedFacets: string[];

  /** Facets the probes marked */
  markedFacets: string[];

  marks: int32;

  /** The first marked step, which opens the trajectory where the probes point */
  firstStep?: int32;
}

model HuntTrialPage is Page<HuntTrial>;

/** A position a probe marked in a trajectory, recognisable without its step number. */
model TrialMark {
  /** The step of the trajectory, numbered as the run's trajectory numbers it */
  step: int32;

  kind: RunEventKind;
  tool?: string;
  at: utcDateTime;
  excerpt: string;
  probes: string[];
}

model TrialFacetFinding {
  facetId: string;
  name: string;
  definition: string;

  /** Whether the reader's verdict named this facet */
  confirmed: boolean;

  marks: TrialMark[];
}

/** What one hunt found in one run. */
model RunHuntFinding {
  huntId: string;
  title: string;
  need: string;
  verdict: HuntVerdict;

  /** The reader's reason, present when a reader read the run */
  why?: string;

  facets: TrialFacetFinding[];
}

@route("/console/benchmarks/{benchmarkId}/hunts")
@useAuth(SessionCookie)
interface ConsoleHunts {
  /** Every hunt recorded over the benchmark's trajectories, the latest first */
  @get list(@path benchmarkId: string): Hunt[] | SignInRequiredError | NotFoundError;

  /** The trials one hunt marked or read, confirmed ones first, a page at a time */
  @get
  @route("/{huntId}/trials")
  trials(
    @path benchmarkId: string,
    @path huntId: string,

    /** Only the trials marked or confirmed for this facet; every trial when empty */
    @query(#{ explode: true }) facet?: string = "",

    @query(#{ explode: true }) verdict?: HuntVerdict,
    ...PageQuery<25>,
    ...LanguageHeader,
  ): Localized<HuntTrialPage> | SignInRequiredError | NotFoundError;
}

@route("/console/runs/{runId}/hunts")
@useAuth(SessionCookie)
interface ConsoleRunHunts {
  /** What every hunt of the run's benchmark found in the run; a hunt that neither marked nor read it is left out */
  @get list(@path runId: string): RunHuntFinding[] | SignInRequiredError | NotFoundError;
}
