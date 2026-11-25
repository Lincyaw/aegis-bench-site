import type {
  FacetEdge, FailureClass, GradingCheck, Half, HarnessRef, Hunt, LabeledValue, Metric, ReleaseContent, ReleaseStatus, RunDetail, RunOutcome,
  TaskRevision, TextByLocale, TimelineLegend, Trajectory, ValidationRun, VendorSlot, WithheldReason,
} from '../api/types';

/*
 * The data directory the mock server answers from, public/data in the repository and data/ next to the published site:
 * what each file holds and how it is read. The indexes are read once when the server opens the directory; a run, its
 * trajectory and a task's files are read when a request first needs them, from the data directory or, for a benchmark
 * that keeps them there, from a dataset repository on Hugging Face. Records keep the language they were made in, and
 * display names carry a string for each locale.
 */

/** The data directory's path under the site's root. */
export const DATA_DIRECTORY = 'data';

/** Where Hugging Face serves dataset repositories, their files and their pages. */
export const HUGGING_FACE_ORIGIN = 'https://huggingface.co';

/** Reads the text of a file, given its path in the data directory or its URL elsewhere; it fails when the file cannot be read. */
export type DataReader = (path: string) => Promise<string>;

/** A directory of a dataset repository on Hugging Face, at one commit. */
export interface HuggingFaceDirectory {
  repo: string;
  revision: string;
  directory: string;
}

/** catalog.json: the lifecycle stages, every model and harness, and the benchmarks in the order the site lists them. */
export interface Catalog {
  stages: { id: string; half: Half; position: number; name: TextByLocale; summary: TextByLocale }[];
  models: { id: string; slot: VendorSlot; name: TextByLocale; vendor: TextByLocale }[];
  harnesses: { id: string; name: TextByLocale }[];

  /** The directories under benchmarks/ */
  benchmarks: string[];
}

/** benchmarks/<id>/benchmark.json */
export interface BenchmarkRecord {
  id: string;
  name: string;
  shortName: string;
  version: string;
  stageId: string;
  summary: TextByLocale;

  /** The day its results were last published, and the month its runs were evaluated in */
  updatedOn: string;
  evaluatedIn: string;

  runsPerTask: number;
  metric: Omit<Metric, 'name'> & { name: TextByLocale };
  timelineLegend: Record<keyof TimelineLegend, TextByLocale>;

  /** The tools whose calls the timeline marks as the benchmark's key action */
  changeTools: string[];

  /** How grading decides that a run passed */
  passRule: string;

  /**
   * Where the benchmark keeps its runs/ and tasks/ directories when they are not in the data directory. The task files
   * the public site withholds stay in the data directory, so the published directory holds only what is published.
   */
  huggingFace?: HuggingFaceDirectory;
}

/** A check of a task's grading, with the path of its code (or, for a model review, its rubric) in the task's directory. */
export type CheckRecord = Omit<GradingCheck, 'passed' | 'code' | 'observed'> & { path: string };

/** A file of a task's Harbor directory, and why the public site withholds it, if it does. */
export interface TaskFileEntry {
  path: string;
  size: number;
  withheld?: WithheldReason;
}

/** benchmarks/<id>/tasks.json lists these; each task's Harbor directory is at benchmarks/<id>/tasks/<task id>/. */
export interface TaskRecord {
  id: string;
  title: string;

  /** Labels the task's authors gave it, for choosing tasks to compare models on */
  tags: string[];

  /** The task's current version */
  version: string;

  instruction: string;
  reportSchema: string;
  environment: LabeledValue[];
  tools: string[];
  checks: CheckRecord[];
  verifier: LabeledValue[];
  files: TaskFileEntry[];

  /** Every version the task went through, newest first */
  revisions: Omit<TaskRevision, 'current' | 'runs' | 'counted'>[];

  validations: ValidationRun[];
}

/** benchmarks/<id>/runs.json lists every run of the benchmark with what lists and totals read of it. */
export interface RunFact {
  id: string;
  taskId: string;
  modelId: string;
  harnessId: string;
  attempt: number;
  outcome: RunOutcome;

  /** The run's result in the benchmark's metric, from 0 to 1 */
  score: number;

  steps: number;
  costUsd: number;
  finishedAt: string;

  /** The task version the run answered, and the evaluation batch it ran in */
  taskVersion: string;
  batch: string;

  /** The class a review gave a failed run; absent while the failure is unreviewed and for other outcomes */
  failureClass?: FailureClass;

  /** The checks the run failed */
  failedChecks: string[];
}

/** benchmarks/<id>/runs/<run id>/run.json: the rest of a run's record, beside its trajectory.json in ATIF. */
export interface RunRecord {
  startedAt: string;

  /** Who reviewed the run's failure */
  reviewer?: string;

  /** The run's result in the benchmark's own words, such as 检出 3/5 */
  resultLabel: TextByLocale;

  metrics: Omit<RunDetail['metrics'], 'steps' | 'costUsd'>;
  input: Omit<RunDetail['input'], 'harness'> & { harness: Omit<RunDetail['input']['harness'], keyof HarnessRef> };
  output: RunDetail['output'];
  grading: RunDetail['grading'];
  failure?: RunDetail['failure'];
}

/** A position a probe marked: the facet, the step and the probes that hit it. */
export interface MarkRecord {
  facetId: string;
  step: number;
  probes: string[];
}

/** A trajectory a hunt marked or read; a reader who read it says why the verdict is what it is. */
export interface TrialRecord {
  runId: string;
  read: boolean;
  markedFacets: string[];
  confirmedFacets: string[];
  marks: MarkRecord[];
  why?: string;
}

/** benchmarks/<id>/hunts.json lists the hunts recorded over the benchmark's trajectories. */
export interface HuntRecord {
  id: string;
  title: string;
  need: string;
  rounds: number;
  converged: boolean;
  recordedAt: string;
  calibration: Hunt['calibration'];
  facets: { id: string; name: string; edge?: FacetEdge; definition: string; excludes: string; probes: { name: string; kind: string }[] }[];
  trials: TrialRecord[];
}

/** benchmarks/<id>/releases.json lists the versions the benchmark published, the current one among them. */
export interface PublishedRelease {
  version: number;
  status: Exclude<ReleaseStatus, 'draft'>;
  note?: string;
  author: string;
  updatedAt: string;
  restoresVersion?: number;
  content: ReleaseContent;
}

/** One benchmark's indexes. */
export interface BenchmarkIndexes {
  record: BenchmarkRecord;
  tasks: TaskRecord[];
  runs: RunFact[];
  hunts: HuntRecord[];
  releases: PublishedRelease[];
}

/** A run's facts and the benchmark it belongs to. */
export interface LocatedRun {
  benchmarkId: string;
  fact: RunFact;
}

/** The indexes of the whole directory, and every run by its id. */
export interface Indexes {
  catalog: Catalog;
  benchmarks: BenchmarkIndexes[];
  runs: Map<string, LocatedRun>;
}

let reader: DataReader | undefined;
let indexes: Indexes | undefined;

/* The directory's files do not change while the server runs, so each is read once. */
const texts = new Map<string, Promise<string>>();
const values = new Map<string, Promise<unknown>>();

export function openedReader(): DataReader {
  if (!reader) {
    throw new Error('the data directory is not open');
  }
  return reader;
}

export function readText(path: string): Promise<string> {
  const text = texts.get(path) ?? openedReader()(path);
  texts.set(path, text);
  return text;
}

/** A JSON file's value; its type is the one this module declares for the file. */
export function readJson<Value>(path: string): Promise<Value> {
  const value = values.get(path) ?? openedReader()(path).then(text => JSON.parse(text) as unknown);
  values.set(path, value);
  return value as Promise<Value>;
}

/** Reads the catalog and every benchmark's indexes; the server answers no request before this has finished. */
export async function openRecords(read: DataReader): Promise<void> {
  reader = read;
  const catalog = await readJson<Catalog>('catalog.json');
  const benchmarks = await Promise.all(catalog.benchmarks.map(async id => {
    const [record, tasks, runs, hunts, releases] = await Promise.all([
      readJson<BenchmarkRecord>(dataDirectoryPathOf(id, 'benchmark.json')), readJson<TaskRecord[]>(dataDirectoryPathOf(id, 'tasks.json')),
      readJson<RunFact[]>(dataDirectoryPathOf(id, 'runs.json')), readJson<HuntRecord[]>(dataDirectoryPathOf(id, 'hunts.json')),
      readJson<PublishedRelease[]>(dataDirectoryPathOf(id, 'releases.json')),
    ]);
    return { record, tasks, runs, hunts, releases };
  }));
  const runs = new Map(benchmarks.flatMap(benchmark => benchmark.runs.map(fact => [fact.id, { benchmarkId: benchmark.record.id, fact }] as const)));
  indexes = { catalog, benchmarks, runs };
}

export function openedIndexes(): Indexes {
  if (!indexes) {
    throw new Error('the data directory is not open');
  }
  return indexes;
}

/** A run an index names, such as a release's example or a hunt's trial, which the directory must have. */
export function recordedRunOf(runId: string): LocatedRun {
  const located = openedIndexes().runs.get(runId);
  if (!located) {
    throw new Error(`the data directory names run ${runId} but has no record of it`);
  }
  return located;
}

/** A file of a benchmark's directory in the data directory. */
export function dataDirectoryPathOf(benchmarkId: string, path: string): string {
  return `benchmarks/${benchmarkId}/${path}`;
}

/** Where a file of a benchmark's runs/ or tasks/ is read: the benchmark's directory on Hugging Face, or the data directory. */
export function benchmarkFileLocation(record: BenchmarkRecord, path: string): string {
  const { huggingFace } = record;
  return huggingFace
    ? `${HUGGING_FACE_ORIGIN}/datasets/${huggingFace.repo}/resolve/${huggingFace.revision}/${huggingFace.directory}/${path}`
    : dataDirectoryPathOf(record.id, path);
}

/** The Hugging Face page that shows a directory of a benchmark's runs/ or tasks/, when the benchmark keeps them there. */
export function huggingFacePageOf(record: BenchmarkRecord, path: string): string | undefined {
  const { huggingFace } = record;
  return huggingFace && `${HUGGING_FACE_ORIGIN}/datasets/${huggingFace.repo}/tree/${huggingFace.revision}/${huggingFace.directory}/${path}`;
}

export function runDirectoryOf(runId: string): string {
  return `runs/${runId}`;
}

export function taskDirectoryOf(taskId: string): string {
  return `tasks/${taskId}`;
}

export function readRunRecord(record: BenchmarkRecord, runId: string): Promise<RunRecord> {
  return readJson<RunRecord>(benchmarkFileLocation(record, `${runDirectoryOf(runId)}/run.json`));
}

export function readTrajectory(record: BenchmarkRecord, runId: string): Promise<Trajectory> {
  return readJson<Trajectory>(benchmarkFileLocation(record, `${runDirectoryOf(runId)}/trajectory.json`));
}

/** A task file's text: a withheld file from the data directory, any other from where the benchmark keeps its tasks. */
export function readTaskFile(record: BenchmarkRecord, taskId: string, file: TaskFileEntry): Promise<string> {
  const path = `${taskDirectoryOf(taskId)}/${file.path}`;
  return readText(file.withheld ? dataDirectoryPathOf(record.id, path) : benchmarkFileLocation(record, path));
}
