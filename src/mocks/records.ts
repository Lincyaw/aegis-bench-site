import type {
  BenchmarkFile, Catalog, FootprintFile, HuntRecord, PublishedRelease, RunFact, RunFile, SignalsFile, StepAnnotation, TaskFileRecord, TaskRecord, Trajectory, WorldFile,
} from '../api/types';

/*
 * How the mock server reads the data directory, public/data in the repository and data/ next to the published site;
 * spec/data.tsp declares each file's format. The indexes are read once when the server opens the directory; a run, its
 * trajectory and a task's files are read when a request first needs them, from the data directory or, for a benchmark
 * that keeps them there, from a dataset repository on Hugging Face.
 */

/** The data directory's path under the site's root. */
export const DATA_DIRECTORY = 'data';

/** Where Hugging Face serves dataset repositories, their files and their pages. */
export const HUGGING_FACE_ORIGIN = 'https://huggingface.co';

/** Reads the text of a file, given its path in the data directory or its URL elsewhere; it fails when the file cannot be read. */
export type DataReader = (path: string) => Promise<string>;

/** One benchmark's indexes. */
export interface BenchmarkIndexes {
  record: BenchmarkFile;
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

/** Records a benchmark keeps on Hugging Face could not be read from it, as when the reader's network does not reach it. */
export class HuggingFaceReadError extends Error {
  /** The page on Hugging Face that holds the records */
  readonly page: string;

  constructor(page: string, options: ErrorOptions) {
    super(`the records at ${page} could not be read`, options);
    this.page = page;
  }
}

let reader: DataReader | undefined;
let indexes: Indexes | undefined;

/* The directory's files do not change while the server runs, so each is read once; a read that failed is tried again. */
const texts = new Map<string, Promise<string>>();
const values = new Map<string, Promise<unknown>>();

export function openedReader(): DataReader {
  if (!reader) {
    throw new Error('the data directory is not open');
  }
  return reader;
}

/** A read kept for the path until it fails. */
export function remembered<Value>(cache: Map<string, Promise<Value>>, path: string, read: () => Promise<Value>): Promise<Value> {
  const cached = cache.get(path) ?? read();
  cache.set(path, cached);
  cached.catch(() => cache.delete(path));
  return cached;
}

export function readText(path: string): Promise<string> {
  return remembered(texts, path, () => openedReader()(path));
}

/** A JSON file's value; its type is the one spec/data.tsp declares for the file. */
export function readJson<Value>(path: string): Promise<Value> {
  return remembered(values, path, () => openedReader()(path).then(text => JSON.parse(text) as unknown)) as Promise<Value>;
}

/** Reads the catalog and every benchmark's indexes; the server answers no request before this has finished. */
export async function openRecords(read: DataReader): Promise<void> {
  reader = read;
  const catalog = await readJson<Catalog>('catalog.json');
  const benchmarks = await Promise.all(catalog.benchmarks.map(async id => {
    const [record, tasks, runs, hunts, releases] = await Promise.all([
      readJson<BenchmarkFile>(dataDirectoryPathOf(id, 'benchmark.json')), readJson<TaskRecord[]>(dataDirectoryPathOf(id, 'tasks.json')),
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
export function benchmarkFileLocation(record: BenchmarkFile, path: string): string {
  const { huggingFace } = record;
  return huggingFace
    ? `${HUGGING_FACE_ORIGIN}/datasets/${huggingFace.repo}/resolve/${huggingFace.revision}/${huggingFace.directory}/${path}`
    : dataDirectoryPathOf(record.id, path);
}

/** The Hugging Face page that shows a directory of a benchmark's runs/ or tasks/, when the benchmark keeps them there. */
export function huggingFacePageOf(record: BenchmarkFile, path: string): string | undefined {
  const { huggingFace } = record;
  return huggingFace && `${HUGGING_FACE_ORIGIN}/datasets/${huggingFace.repo}/tree/${huggingFace.revision}/${huggingFace.directory}/${path}`;
}

export function runDirectoryOf(runId: string): string {
  return `runs/${runId}`;
}

export function taskDirectoryOf(taskId: string): string {
  return `tasks/${taskId}`;
}

/**
 * Reads a file of one of a benchmark's run or task directories. A file kept on Hugging Face that cannot be read is
 * reported with the page of its directory there, which the reader can still open.
 */
export function readFromDirectory<Value>(record: BenchmarkFile, directory: string, file: string, read: (location: string) => Promise<Value>): Promise<Value> {
  const page = huggingFacePageOf(record, directory);
  const reading = read(benchmarkFileLocation(record, `${directory}/${file}`));
  return page === undefined ? reading : reading.catch((cause: unknown) => {
    throw new HuggingFaceReadError(page, { cause });
  });
}

export function readRunFile(record: BenchmarkFile, runId: string): Promise<RunFile> {
  return readFromDirectory(record, runDirectoryOf(runId), 'run.json', location => readJson<RunFile>(location));
}

export function readTrajectory(record: BenchmarkFile, runId: string): Promise<Trajectory> {
  return readFromDirectory(record, runDirectoryOf(runId), 'trajectory.json', location => readJson<Trajectory>(location));
}

/** The labels annotators gave a run's steps; only a benchmark that declares annotation categories has them. */
export function readAnnotations(record: BenchmarkFile, runId: string): Promise<StepAnnotation[]> {
  return readFromDirectory(record, runDirectoryOf(runId), 'annotations.json', location => readJson<StepAnnotation[]>(location));
}

/** What a run did to its task's world; only a benchmark that declares world layers has footprints. */
export function readFootprint(record: BenchmarkFile, runId: string): Promise<FootprintFile> {
  return readFromDirectory(record, runDirectoryOf(runId), 'footprint.json', location => readJson<FootprintFile>(location));
}

/** What a run's world reported while the run went on; only a benchmark that declares world layers has signals. */
export function readSignals(record: BenchmarkFile, runId: string): Promise<SignalsFile> {
  return readFromDirectory(record, runDirectoryOf(runId), 'signals.json', location => readJson<SignalsFile>(location));
}

/** The directory of a benchmark's worlds, which stays in the data directory wherever the benchmark keeps its runs. */
export const WORLD_DIRECTORY = 'worlds';

/** A task's world before any run acts on it; only a benchmark that declares world layers has worlds. */
export function readWorld(benchmarkId: string, taskId: string): Promise<WorldFile> {
  return readJson<WorldFile>(dataDirectoryPathOf(benchmarkId, `${WORLD_DIRECTORY}/${taskId}.json`));
}

/** A task file's text: a withheld file from the data directory, any other from where the benchmark keeps its tasks. */
export function readTaskFile(record: BenchmarkFile, taskId: string, file: TaskFileRecord): Promise<string> {
  return file.withheld
    ? readText(dataDirectoryPathOf(record.id, `${taskDirectoryOf(taskId)}/${file.path}`))
    : readFromDirectory(record, taskDirectoryOf(taskId), file.path, readText);
}
