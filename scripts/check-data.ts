import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Catalog } from '../src/api/types';
import {
  DATA_DIRECTORY, dataDirectoryPathOf, openRecords, openedIndexes, readAnnotations, readRunFile, readTaskFile, readTrajectory, runDirectoryOf, taskDirectoryOf,
  type BenchmarkIndexes,
} from '../src/mocks/records';
import { dataReaderAt } from './dataReader';

/*
 * Checks a data directory against spec/data.tsp: every file against the JSON Schema of its kind, and what files say of
 * each other. The runs and task files a benchmark keeps on Hugging Face are checked too when --hugging-face is given.
 *
 *   npm run check:data                                  the site's own data directory, public/data
 *   npm run check:data -- path/to/data                  another directory laid out the same way
 *   npm run check:data -- --hugging-face                and the files kept on Hugging Face
 */

/** The JSON Schema npm run gen emits from spec/data.tsp. */
export const SCHEMA_URL = new URL('../public/schema/data-files.json', import.meta.url);

/** The flag that adds the files kept on Hugging Face. */
export const HUGGING_FACE_FLAG = '--hugging-face';

/** Files are read this many at a time, which keeps reads from Hugging Face within its rate limit. */
export const READS_AT_ONCE = 16;

const args = process.argv.slice(2);
const withHuggingFace = args.includes(HUGGING_FACE_FLAG);
const directoryArgument = args.find(arg => !arg.startsWith('--'));
const directory = directoryArgument ? pathToFileURL(`${resolve(directoryArgument)}/`) : new URL(`../public/${DATA_DIRECTORY}/`, import.meta.url);

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(JSON.parse(await readFile(SCHEMA_URL, 'utf8')) as object);

const problems: string[] = [];

/** Notes every way a file's value departs from the schema of its kind, the model of that name in spec/data.tsp. */
export function checkAgainst(kind: string, file: string, value: unknown) {
  const validate = ajv.getSchema(`${kind}.json`);
  if (!validate) {
    throw new Error(`spec/data.tsp declares no ${kind}`);
  }
  if (!validate(value)) {
    problems.push(...(validate.errors ?? []).map(error => `${file}#${error.instancePath}: ${error.message}`));
  }
}

/** Notes a problem of a file when a condition between files does not hold. */
export function expect(holds: boolean, file: string, problem: string) {
  if (!holds) {
    problems.push(`${file}: ${problem}`);
  }
}

/** What one benchmark's indexes say of each other and of the catalog. */
export function checkIndexes(catalog: Catalog, benchmark: BenchmarkIndexes, directoryName: string) {
  const { record, tasks, runs, hunts, releases } = benchmark;
  const at = (file: string) => dataDirectoryPathOf(directoryName, file);
  checkAgainst('BenchmarkFile', at('benchmark.json'), record);
  checkAgainst('TaskListFile', at('tasks.json'), tasks);
  checkAgainst('RunIndexFile', at('runs.json'), runs);
  checkAgainst('HuntListFile', at('hunts.json'), hunts);
  checkAgainst('ReleaseListFile', at('releases.json'), releases);
  expect(record.id === directoryName, at('benchmark.json'), `id ${record.id} is not the directory's name`);
  expect(catalog.stages.some(stage => stage.id === record.stageId), at('benchmark.json'), `stage ${record.stageId} is not in catalog.json`);
  const categoryIds = record.annotationCategories?.map(category => category.id) ?? [];
  expect(new Set(categoryIds).size === categoryIds.length, at('benchmark.json'), 'an annotation category id appears twice');
  const taskIds = new Set(tasks.map(task => task.id));
  expect(taskIds.size === tasks.length, at('tasks.json'), 'a task id appears twice');
  for (const task of tasks) {
    const paths = new Set(task.files.map(file => file.path));
    task.checks.filter(check => !paths.has(check.path)).forEach(check => expect(false, at('tasks.json'), `${task.id} check ${check.id} names ${check.path}, which its files do not list`));
  }
  const runIds = new Set(runs.map(fact => fact.id));
  expect(runIds.size === runs.length, at('runs.json'), 'a run id appears twice');
  for (const fact of runs) {
    const task = tasks.find(candidate => candidate.id === fact.taskId);
    expect(task !== undefined, at('runs.json'), `${fact.id} answers task ${fact.taskId}, which tasks.json does not list`);
    expect(catalog.models.some(model => model.id === fact.modelId), at('runs.json'), `${fact.id} names model ${fact.modelId}, which catalog.json does not list`);
    expect(catalog.harnesses.some(harness => harness.id === fact.harnessId), at('runs.json'), `${fact.id} names harness ${fact.harnessId}, which catalog.json does not list`);
    expect(!task || fact.failedChecks.every(id => task.checks.some(check => check.id === id)), at('runs.json'), `${fact.id} failed a check its task does not have`);
    expect(!task || task.revisions.some(revision => revision.version === fact.taskVersion), at('runs.json'), `${fact.id} answered version ${fact.taskVersion}, which its task never had`);
  }
  for (const hunt of hunts) {
    const facetIds = new Set(hunt.facets.map(facet => facet.id));
    for (const trial of hunt.trials) {
      const fact = runs.find(candidate => candidate.id === trial.runId);
      expect(fact !== undefined, at('hunts.json'), `hunt ${hunt.id} names run ${trial.runId}, which runs.json does not list`);
      expect([...trial.markedFacets, ...trial.confirmedFacets, ...trial.marks.map(mark => mark.facetId)].every(id => facetIds.has(id)), at('hunts.json'), `hunt ${hunt.id} names a facet it does not have in ${trial.runId}`);
      expect(!fact || trial.marks.every(mark => mark.step <= fact.steps), at('hunts.json'), `hunt ${hunt.id} marks a step past the end of ${trial.runId}`);
    }
  }
  expect(releases.filter(release => release.status === 'current').length === 1, at('releases.json'), 'exactly one release must be current');
  for (const release of releases) {
    expect(release.content.entrants.every(entrant => runs.some(fact => fact.modelId === entrant.modelId && fact.harnessId === entrant.harnessId)), at('releases.json'), `version ${release.version} ranks a combination with no runs`);
    expect(release.content.replays.every(runId => runIds.has(runId)), at('releases.json'), `version ${release.version} shows a run runs.json does not list`);
  }
}

/**
 * Reads of every run's and task's files, each noting what it finds, and how many files are left unread: the runs and
 * published task files a benchmark keeps on Hugging Face, unless the flag asks for them.
 */
export function fileReadsOf(benchmark: BenchmarkIndexes): { reads: (() => Promise<void>)[]; unread: number } {
  const { record, tasks, runs } = benchmark;
  const leaveKept = record.huggingFace !== undefined && !withHuggingFace;
  const named = (path: string) => `${dataDirectoryPathOf(record.id, path)}${record.huggingFace ? ' (Hugging Face)' : ''}`;
  const categories = new Set(record.annotationCategories?.map(category => category.id));
  const runReads = runs.map(fact => async () => {
    const [run, trajectory, annotations] = await Promise.all([
      readRunFile(record, fact.id), readTrajectory(record, fact.id), record.annotationCategories ? readAnnotations(record, fact.id) : [],
    ]);
    checkAgainst('RunFile', named(`${runDirectoryOf(fact.id)}/run.json`), run);
    checkAgainst('TrajectoryFile', named(`${runDirectoryOf(fact.id)}/trajectory.json`), trajectory);
    expect(trajectory.steps.length === fact.steps, named(`${runDirectoryOf(fact.id)}/trajectory.json`), `has ${trajectory.steps.length} steps, runs.json says ${fact.steps}`);
    if (record.annotationCategories) {
      const file = named(`${runDirectoryOf(fact.id)}/annotations.json`);
      const steps = new Set(trajectory.steps.map(step => step.step_id));
      checkAgainst('AnnotationListFile', file, annotations);
      expect(annotations.every(annotation => categories.has(annotation.category)), file, 'labels a step with a category benchmark.json does not declare');
      expect(annotations.every(annotation => steps.has(annotation.step)), file, 'labels a step the trajectory does not have');
      expect(annotations.every((annotation, index) => index === 0 || annotations[index - 1].step <= annotation.step), file, 'is not in step order');
    }
  });
  const taskFiles = tasks.flatMap(task => task.files.map(file => ({ task, file })));
  const readable = taskFiles.filter(({ file }) => file.withheld || !leaveKept);
  const taskReads = readable.map(({ task, file }) => async () => {
    const text = await readTaskFile(record, task.id, file);
    expect(new TextEncoder().encode(text).length === file.size, named(`${taskDirectoryOf(task.id)}/${file.path}`), `is not the ${file.size} bytes tasks.json says`);
  });
  const filesPerRun = record.annotationCategories ? 3 : 2;
  return { reads: [...(leaveKept ? [] : runReads), ...taskReads], unread: (leaveKept ? runs.length * filesPerRun : 0) + taskFiles.length - readable.length };
}

await openRecords(dataReaderAt(directory));
const { catalog, benchmarks } = openedIndexes();
checkAgainst('Catalog', 'catalog.json', catalog);
benchmarks.forEach((benchmark, index) => checkIndexes(catalog, benchmark, catalog.benchmarks[index]));
const fileReads = benchmarks.map(fileReadsOf);
const reads = fileReads.flatMap(benchmark => benchmark.reads);
for (let start = 0; start < reads.length; start += READS_AT_ONCE) {
  await Promise.all(reads.slice(start, start + READS_AT_ONCE).map(read => read().catch((error: unknown) => {
    problems.push(error instanceof Error ? `${error.message}${error.cause instanceof Error ? `: ${error.cause.message}` : ''}` : String(error));
  })));
}
const unread = fileReads.reduce((sum, benchmark) => sum + benchmark.unread, 0);
console.log(`Checked ${directory.pathname} against spec/data.tsp: ${benchmarks.length} benchmarks, ${reads.length} runs and task files.`);
if (unread > 0) {
  console.log(`${unread} files are kept on Hugging Face and were not read; add ${HUGGING_FACE_FLAG} to check them too.`);
}
problems.forEach(problem => console.error(problem));
if (problems.length > 0) {
  console.error(`${problems.length} problems.`);
  process.exitCode = 1;
}
