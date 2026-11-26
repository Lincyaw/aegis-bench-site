import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Catalog, FootprintFile, SignalsFile, Trajectory, WorldFile } from '../src/api/types';
import {
  DATA_DIRECTORY, WORLD_DIRECTORY, dataDirectoryPathOf, openRecords, openedIndexes, readAnnotations, readFootprint, readRunFile, readSignals, readTaskFile,
  readTrajectory, readWorld, runDirectoryOf, taskDirectoryOf, type BenchmarkIndexes,
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
  const layerIds = record.worldLayers?.map(layer => layer.id) ?? [];
  expect(new Set(layerIds).size === layerIds.length, at('benchmark.json'), 'a world layer id appears twice');
  expect(!record.worldLayers || record.blocks.replayPanel !== undefined, at('benchmark.json'), 'declares world layers but no blocks for the replay\'s panel');
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

/** What a task's world says of itself: every node in a declared layer, parents in their child's layer, edges between nodes it has. */
export function checkWorld(world: WorldFile, layerIds: Set<string>, file: string) {
  checkAgainst('WorldFile', file, world);
  const nodes = new Map(world.nodes.map(node => [node.id, node]));
  expect(nodes.size === world.nodes.length, file, 'a node id appears twice');
  for (const node of world.nodes) {
    expect(layerIds.has(node.layer), file, `${node.id} lies in layer ${node.layer}, which benchmark.json does not declare`);
    expect(node.parent === undefined || nodes.get(node.parent)?.layer === node.layer, file, `${node.id} sits in ${node.parent}, which is not a node of its layer`);
  }
  expect(world.edges.every(edge => nodes.has(edge.from) && nodes.has(edge.to)), file, 'an edge ends at a node the world does not have');
}

/**
 * What a run's footprint says of its trajectory and its task's world: touches and events in step order, at steps and
 * tool calls the trajectory has, naming nodes the world has at that step. A step's touches may name a node the step's
 * own events add or remove.
 */
export function checkFootprint(footprint: FootprintFile, trajectory: Trajectory, world: WorldFile, file: string) {
  checkAgainst('FootprintFile', file, footprint);
  const steps = new Map(trajectory.steps.map(step => [step.step_id, step]));
  for (const entry of [...footprint.touches, ...footprint.events]) {
    const step = steps.get(entry.step);
    expect(step !== undefined, file, `names step ${entry.step}, which the trajectory does not have`);
    expect(!step || entry.toolCallId === undefined || (step.tool_calls ?? []).some(call => call.tool_call_id === entry.toolCallId), file, `names call ${entry.toolCallId}, which step ${entry.step} does not make`);
  }
  const inOrder = (list: { step: number }[]) => list.every((entry, index) => index === 0 || list[index - 1].step <= entry.step);
  expect(inOrder(footprint.touches) && inOrder(footprint.events), file, 'is not in step order');
  const present = new Set(world.nodes.map(node => node.id));
  const edges = new Set(world.edges.map(edge => `${edge.from}→${edge.to}`));
  for (const step of [...new Set([...footprint.touches, ...footprint.events].map(entry => entry.step))].toSorted((a, b) => a - b)) {
    const before = new Set(present);
    for (const { change } of footprint.events.filter(event => event.step === step)) {
      switch (change.type) {
        case 'addNode':
          expect(!present.has(change.node.id), file, `step ${step} adds ${change.node.id}, which the world has already`);
          present.add(change.node.id);
          break;
        case 'removeNode':
          expect(present.delete(change.node), file, `step ${step} removes ${change.node}, which the world does not have`);
          [...edges].filter(key => key.startsWith(`${change.node}→`) || key.endsWith(`→${change.node}`)).forEach(key => edges.delete(key));
          break;
        case 'setNode':
          expect(present.has(change.node), file, `step ${step} changes ${change.node}, which the world does not have`);
          break;
        case 'addEdge':
          expect(present.has(change.edge.from) && present.has(change.edge.to), file, `step ${step} adds an edge to a node the world does not have`);
          edges.add(`${change.edge.from}→${change.edge.to}`);
          break;
        case 'removeEdge':
          expect(edges.delete(`${change.edge.from}→${change.edge.to}`), file, `step ${step} removes an edge the world does not have`);
          break;
      }
    }
    footprint.touches.filter(touch => touch.step === step).forEach(touch => expect(before.has(touch.node) || present.has(touch.node), file, `step ${step} touches ${touch.node}, which the world does not have then`));
  }
}

/**
 * What a run's signals say of its world and its footprint: every entry from a node the world has at some point of the
 * run, every stack frame in a file the world holds when it names one, and every view of a touch naming series, entries
 * and traces the signals have for the node it touched.
 */
export function checkSignals(signals: SignalsFile, footprint: FootprintFile, world: WorldFile, file: string) {
  checkAgainst('SignalsFile', file, signals);
  const nodes = new Set([...world.nodes.map(node => node.id), ...footprint.events.flatMap(({ change }) => (change.type === 'addNode' ? [change.node.id] : []))]);
  const named = [...signals.series.map(series => series.node), ...signals.logs.map(entry => entry.node), ...signals.spans.map(span => span.node)];
  expect(named.every(node => nodes.has(node)), file, 'names a node the world never has');
  expect(signals.logs.flatMap(entry => entry.stack ?? []).every(frame => frame.node === undefined || nodes.has(frame.node)), file, 'a stack frame names a file the world never has');
  const logIds = new Set(signals.logs.map(entry => entry.id));
  expect(logIds.size === signals.logs.length, file, 'a log entry id appears twice');
  const seriesKeys = signals.series.map(series => `${series.node} ${series.name}`);
  expect(new Set(seriesKeys).size === seriesKeys.length, file, 'a node has two series of one name');
  const traceIds = new Set(signals.spans.map(span => span.traceId));
  for (const { step, node, view } of footprint.touches) {
    expect(!view?.series || view.series.every(name => seriesKeys.includes(`${node} ${name}`)), file, `step ${step} shows a series ${node} does not report`);
    expect(!view?.logs || view.logs.every(id => logIds.has(id)), file, `step ${step} shows a log entry the signals do not have`);
    expect(!view?.traces || view.traces.every(id => traceIds.has(id)), file, `step ${step} shows a trace the signals do not have`);
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
  const layerIds = new Set(record.worldLayers?.map(layer => layer.id));
  const worldFile = (taskId: string) => dataDirectoryPathOf(record.id, `${WORLD_DIRECTORY}/${taskId}.json`);
  const worldReads = record.worldLayers ? tasks.map(task => async () => checkWorld(await readWorld(record.id, task.id), layerIds, worldFile(task.id))) : [];
  const runReads = runs.map(fact => async () => {
    const [run, trajectory, annotations] = await Promise.all([
      readRunFile(record, fact.id), readTrajectory(record, fact.id), record.annotationCategories ? readAnnotations(record, fact.id) : [],
    ]);
    if (record.worldLayers) {
      const [footprint, signals, world] = await Promise.all([readFootprint(record, fact.id), readSignals(record, fact.id), readWorld(record.id, fact.taskId)]);
      checkFootprint(footprint, trajectory, world, named(`${runDirectoryOf(fact.id)}/footprint.json`));
      checkSignals(signals, footprint, world, named(`${runDirectoryOf(fact.id)}/signals.json`));
    }
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
  const filesPerRun = 2 + (record.annotationCategories ? 1 : 0) + (record.worldLayers ? 2 : 0);
  return { reads: [...worldReads, ...(leaveKept ? [] : runReads), ...taskReads], unread: (leaveKept ? runs.length * filesPerRun : 0) + taskFiles.length - readable.length };
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
