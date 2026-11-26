import "@typespec/http";
import "./session.tsp";
import "./runs.tsp";
import "./results.tsp";

using Http;

namespace AegisBench.Console;

/** How a task's counted runs fall: all passed (saturated), none passed (unsolved), or some of each (discriminating). */
enum TaskSpread {
  saturated,
  unsolved,
  discriminating,
}

/** Whether a combination passed a task at least once. */
model EntrantMark {
  ...Combination;
  solved: boolean;
}

model ConsoleTaskRow {
  ...TaskRef;

  /** Tags are records, in the language they were written in */
  tags: string[];

  /** The task's current version, a short content hash */
  version: string;

  result: ResultCounts;

  /** Absent while no run counts */
  spread?: TaskSpread;

  /** Every combination, in ranking order */
  entrants: EntrantMark[];
}

model TagCount {
  tag: string;
  tasks: int32;
}

/** A page of the matching tasks; the tag counts cover every task of the benchmark, whatever the filters. */
model ConsoleTaskPage is Page<ConsoleTaskRow> {
  tags: TagCount[];
}

enum TaskOrder {
  /** Lowest pass rate first; tasks without a counted run last */
  hardest,

  easiest,

  /** By task id */
  id,
}

/** One thing the task must achieve, as its grading checks it. */
model AcceptancePoint {
  /** The check that enforces it */
  checkId: string;

  requirement: string;
}

model TaskSizes {
  checks: int32;
  files: int32;
  revisions: int32;
}

model ConsoleTaskDetail {
  ...TaskRef;
  benchmark: BenchmarkRef;
  tags: string[];
  version: string;

  /** The task text exactly as the agent receives it, instruction.md */
  instruction: string;

  /** The JSON shape of the report the task asks for */
  reportSchema?: string;

  environment: LabeledValue[];

  /** The tools the harness offers the agent on this task */
  tools: string[];

  acceptance: AcceptancePoint[];

  /** What the runs of the combinations the request keeps to come to */
  result: ResultCounts;

  /** How those runs fall; absent while none counts */
  spread?: TaskSpread;

  /** The combinations the request keeps to, in ranking order */
  entrants: EntrantMark[];

  /** How much each of the task's other views holds */
  sizes: TaskSizes;

  /** The task's Harbor directory on Hugging Face, when its files are kept there */
  huggingFaceUrl?: url;
}

/** A check as the task defines it, with the file that holds its code or, for a model review, its rubric. */
model TaskCheck {
  id: string;
  title: string;
  method: CheckMethod;

  /** Number of judge samples whose median decides a model-review check */
  samples?: int32;

  code: CheckCode;
}

model TaskGrading {
  /** How the checks decide the verdict, in words */
  passRule: string;

  checks: TaskCheck[];

  /** How the verifier runs: its entry script, time limit and environment */
  verifier: LabeledValue[];
}

/** A file the public site withholds, which the console shows whole. */
model ReferenceFile {
  reason: WithheldReason;
  file: TaskFile;
}

/** A combination's runs on a task and what they come to. */
model TaskEntrantRuns {
  ...Combination;

  /** In attempt order */
  runs: RunRow[];

  result: ResultCounts;
}

/** The agents that check a task itself: the oracle answers with the reference solution, the no-op agent does nothing. */
enum ValidationAgent {
  oracle,
  nop,
}

/** A run that checks the task rather than a model; it never counts toward a model's result. */
model ValidationRun {
  agent: ValidationAgent;
  outcome: RunOutcome;

  /** Whether the outcome is the one the agent should get: the oracle passes, the no-op agent fails */
  expected: boolean;

  version: string;
  finishedAt: utcDateTime;
}

model TaskResults {
  /** The combinations the request keeps to that ran the task, best pass rate first */
  entrants: TaskEntrantRuns[];

  validations: ValidationRun[];
}

/** How many of a combination's counted runs passed one check. */
model CheckPassCount {
  passed: int32;
  counted: int32;
}

model CheckResultRow {
  id: string;
  title: string;
  method: CheckMethod;

  /** One count per combination, in the order of TaskCheckResults.entrants */
  byEntrant: CheckPassCount[];
}

/** Each check against each combination: which requirements the models miss. */
model TaskCheckResults {
  /** The combinations the request keeps to, in ranking order */
  entrants: Combination[];

  checks: CheckResultRow[];
}

/** How a version of a task came from the one before it; the first version was created. */
enum RevisionChange {
  created,

  /** The task's text, environment or checks changed; runs on earlier versions no longer count */
  edit,

  /** Only the grading changed; runs on earlier versions count once regraded */
  reviseGrading,
}

model TaskRevision {
  version: string;
  change: RevisionChange;

  /** What changed and why, as the author recorded it */
  note: string;

  author: string;
  registeredAt: utcDateTime;
  current: boolean;

  /** Runs that ran on this version */
  runs: int32;

  /** Of those, the runs the task's results count */
  counted: int32;
}

/** One entry of a task's Harbor directory in the console: every file can be read, and the ones the public site withholds say why. */
model ConsoleTaskEntry {
  path: string;
  kind: TaskEntryKind;

  /** Bytes in a file */
  size?: int32;

  /** Why the public site withholds the entry; absent for what it publishes */
  withheldFromPublic?: WithheldReason;
}

model ConsoleTaskEntryPage is Page<ConsoleTaskEntry>;

@route("/console/benchmarks/{benchmarkId}/tasks")
@useAuth(SessionCookie)
interface ConsoleTasks {
  /** The benchmark's tasks a page at a time, with what their counted runs come to */
  @get list(
    @path benchmarkId: string,

    /** Matches the task id or title */
    @query(#{ explode: true }) q?: string = "",

    /** Only tasks carrying this tag; every task when empty */
    @query(#{ explode: true }) tag?: string = "",

    /** Only tasks whose runs fall this way */
    @query(#{ explode: true }) spread?: TaskSpread,

    @query(#{ explode: true }) order?: TaskOrder = TaskOrder.hardest,
    ...PageQuery<20>,
    ...LanguageHeader,
  ): Localized<ConsoleTaskPage> | SignInRequiredError | NotFoundError;

  /** The task, with what the runs of the combinations a scope keeps to come to; a scope that keeps to none of the benchmark's combinations is not found */
  @get
  @route("/{taskId}")
  read(@path benchmarkId: string, @path taskId: string, ...CombinationScopeQuery, ...LanguageHeader): Localized<ConsoleTaskDetail> | SignInRequiredError | NotFoundError;

  @get
  @route("/{taskId}/grading")
  grading(@path benchmarkId: string, @path taskId: string): TaskGrading | SignInRequiredError | NotFoundError | HuggingFaceUnreachableError;

  /** The reference solution and reference answers, which the public site withholds */
  @get
  @route("/{taskId}/reference")
  reference(@path benchmarkId: string, @path taskId: string): ReferenceFile[] | SignInRequiredError | NotFoundError;

  /** The runs on the task of each combination a scope keeps to, and the runs that check the task itself */
  @get
  @route("/{taskId}/results")
  results(@path benchmarkId: string, @path taskId: string, ...CombinationScopeQuery, ...LanguageHeader): Localized<TaskResults> | SignInRequiredError | NotFoundError;

  /** Each check against each combination a scope keeps to */
  @get
  @route("/{taskId}/check-results")
  checkResults(@path benchmarkId: string, @path taskId: string, ...CombinationScopeQuery, ...LanguageHeader): Localized<TaskCheckResults> | SignInRequiredError | NotFoundError;

  /** The versions that led to the task's current one, newest first */
  @get
  @route("/{taskId}/revisions")
  revisions(@path benchmarkId: string, @path taskId: string): TaskRevision[] | SignInRequiredError | NotFoundError;

  /** One directory of the task's Harbor directory, a page of entries at a time, directories first */
  @get
  @route("/{taskId}/files")
  entries(
    @path benchmarkId: string,
    @path taskId: string,

    /** Path of the directory from the task's root; the root itself when empty */
    @query(#{ explode: true }) dir?: string = "",

    ...PageQuery<50>,
  ): ConsoleTaskEntryPage | SignInRequiredError | NotFoundError;

  @get
  @route("/{taskId}/file")
  file(
    @path benchmarkId: string,
    @path taskId: string,

    /** Path of the file from the task's root */
    @query(#{ explode: true }) path: string,
  ): TaskFile | SignInRequiredError | NotFoundError | HuggingFaceUnreachableError;
}
