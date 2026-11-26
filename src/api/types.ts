import type { components } from './schema';

/** The API's models under the names the spec gives them; both the site and the mock server use these. */
type Schemas = components['schemas'];
export type Locale = Schemas['Locale'];
export type Stage = Schemas['Stage'];
export type StageRef = Schemas['StageRef'];
export type Half = Schemas['Half'];
export type Metric = Schemas['Metric'];
export type LabeledValue = Schemas['LabeledValue'];
export type TimelineLegend = Schemas['TimelineLegend'];
export type VendorSlot = Schemas['VendorSlot'];
export type ModelRef = Schemas['ModelRef'];
export type HarnessRef = Schemas['HarnessRef'];
export type LeaderboardEntry = Schemas['LeaderboardEntry'];
export type LeaderboardView = Schemas['LeaderboardView'];
export type LeaderboardPage = Schemas['LeaderboardPage'];
export type Combination = Schemas['Combination'];
export type BenchmarkRef = Schemas['BenchmarkRef'];
export type BenchmarkSummary = Schemas['BenchmarkSummary'];
export type BenchmarkDetail = Schemas['BenchmarkDetail'];
export type RecentRun = Schemas['RecentRun'];
export type TimelineMark = Schemas['TimelineMark'];
export type TimelineStep = Schemas['TimelineStep'];
export type TaskRef = Schemas['TaskRef'];
export type TaskSummary = Schemas['TaskSummary'];
export type TaskPage = Schemas['TaskPage'];
export type TaskEntry = Schemas['TaskEntry'];
export type TaskEntryKind = Schemas['TaskEntryKind'];
export type TaskFile = Schemas['TaskFile'];
export type WithheldReason = Schemas['WithheldReason'];
export type TaskRuns = Schemas['TaskRuns'];
export type CombinationRuns = Schemas['CombinationRuns'];
export type RunRef = Schemas['RunRef'];
export type CombinationTaskRuns = Schemas['CombinationTaskRuns'];
export type CombinationTaskPage = Schemas['CombinationTaskPage'];
export type RunOutcome = Schemas['RunOutcome'];
export type RunEndReason = Schemas['RunEndReason'];
export type SubmissionVerdict = Schemas['SubmissionVerdict'];
export type RunDetail = Schemas['RunDetail'];
export type GradingCheck = Schemas['GradingCheck'];
export type CheckMethod = Schemas['CheckMethod'];
export type ModelProfile = Schemas['ModelProfile'];
export type Trajectory = Schemas['ATIF.Trajectory'];
export type TrajectoryStep = Schemas['ATIF.Step'];
export type TrajectoryPage = Schemas['TrajectoryPage'];

export type ConsoleUser = Schemas['Console.ConsoleUser'];
export type SessionState = Schemas['Console.SessionState'];
export type SignInRequest = Schemas['Console.SignInRequest'];
export type ConsoleBenchmark = Schemas['Console.ConsoleBenchmark'];
export type ResultCounts = Schemas['Console.ResultCounts'];
export type EntrantResult = Schemas['Console.EntrantResult'];
export type PendingKind = Schemas['Console.PendingKind'];
export type PendingWork = Schemas['Console.PendingWork'];
export type BenchmarkOverview = Schemas['Console.BenchmarkOverview'];
export type FailureClass = Schemas['FailureClass'];
export type RunRow = Schemas['Console.RunRow'];
export type RunRowPage = Schemas['Console.RunRowPage'];
export type ReviewFilter = Schemas['Console.ReviewFilter'];
export type ToolUsage = Schemas['Console.ToolUsage'];
export type RunUsage = Schemas['Console.RunUsage'];
export type ConsoleRunDetail = Schemas['Console.ConsoleRunDetail'];
export type RunEventKind = Schemas['Console.RunEventKind'];
export type RunEvent = Schemas['Console.RunEvent'];
export type AnnotationSeverity = Schemas['AnnotationSeverity'];
export type AnnotationCategory = Schemas['AnnotationCategory'];
export type StepAnnotation = Schemas['StepAnnotation'];
export type ComparisonBlock = Schemas['ComparisonBlock'];
export type ComparedRun = Schemas['ComparedRun'];
export type RunFileChange = Schemas['RunFileChange'];
export type ComparedFile = Schemas['ComparedFile'];
export type RunCheckVerdict = Schemas['RunCheckVerdict'];
export type ComparedCheck = Schemas['ComparedCheck'];
export type TaskComparison = Schemas['TaskComparison'];
export type PublicTaskComparison = Schemas['PublicTaskComparison'];
export type TaskSpread = Schemas['Console.TaskSpread'];
export type TaskOrder = Schemas['Console.TaskOrder'];
export type EntrantMark = Schemas['Console.EntrantMark'];
export type TagCount = Schemas['Console.TagCount'];
export type ConsoleTaskRow = Schemas['Console.ConsoleTaskRow'];
export type ConsoleTaskPage = Schemas['Console.ConsoleTaskPage'];
export type ConsoleTaskDetail = Schemas['Console.ConsoleTaskDetail'];
export type AcceptancePoint = Schemas['Console.AcceptancePoint'];
export type TaskCheck = Schemas['Console.TaskCheck'];
export type TaskGrading = Schemas['Console.TaskGrading'];
export type ReferenceFile = Schemas['Console.ReferenceFile'];
export type TaskEntrantRuns = Schemas['Console.TaskEntrantRuns'];
export type ValidationAgent = Schemas['Console.ValidationAgent'];
export type ValidationRun = Schemas['Console.ValidationRun'];
export type TaskResults = Schemas['Console.TaskResults'];
export type CheckPassCount = Schemas['Console.CheckPassCount'];
export type CheckResultRow = Schemas['Console.CheckResultRow'];
export type TaskCheckResults = Schemas['Console.TaskCheckResults'];
export type RevisionChange = Schemas['Console.RevisionChange'];
export type TaskRevision = Schemas['Console.TaskRevision'];
export type ConsoleTaskEntry = Schemas['Console.ConsoleTaskEntry'];
export type ConsoleModelResult = Schemas['Console.ConsoleModelResult'];
export type HarnessResult = Schemas['Console.HarnessResult'];
export type ConsoleModelDetail = Schemas['Console.ConsoleModelDetail'];
export type ModelTaskRun = Schemas['Console.ModelTaskRun'];
export type ModelTaskRow = Schemas['Console.ModelTaskRow'];
export type ModelTaskPage = Schemas['Console.ModelTaskPage'];
export type CollectionSummary = Schemas['Console.CollectionSummary'];
export type CollectionModelResult = Schemas['Console.CollectionModelResult'];
export type MatrixCell = Schemas['Console.MatrixCell'];
export type MatrixRow = Schemas['Console.MatrixRow'];
export type CollectionMatrixPage = Schemas['Console.CollectionMatrixPage'];
export type HuntProbe = Schemas['Console.HuntProbe'];
export type FacetEdge = Schemas['Console.FacetEdge'];
export type HuntFacet = Schemas['Console.HuntFacet'];
export type HuntCoverage = Schemas['Console.HuntCoverage'];
export type Hunt = Schemas['Console.Hunt'];
export type HuntVerdict = Schemas['Console.HuntVerdict'];
export type HuntTrial = Schemas['Console.HuntTrial'];
export type TrialMark = Schemas['Console.TrialMark'];
export type TrialFacetFinding = Schemas['Console.TrialFacetFinding'];
export type RunHuntFinding = Schemas['Console.RunHuntFinding'];
export type ReleaseStatus = Schemas['Console.ReleaseStatus'];
export type TextByLocale = Schemas['Console.TextByLocale'];
export type EntrantKey = Schemas['Console.EntrantKey'];
export type ReleaseContent = Schemas['Console.ReleaseContent'];
export type ReleaseChanges = Schemas['Console.ReleaseChanges'];
export type ReleaseSummary = Schemas['Console.ReleaseSummary'];
export type ReleaseDetail = Schemas['Console.ReleaseDetail'];
export type ReleaseBenchmarkRow = Schemas['Console.ReleaseBenchmarkRow'];
export type ReleaseOverview = Schemas['Console.ReleaseOverview'];
export type WorkbenchRow = Schemas['Console.WorkbenchRow'];
export type Workbench = Schemas['Console.Workbench'];
export type ChangelogEntry = Schemas['Console.ChangelogEntry'];
export type Role = Schemas['Console.Role'];
export type Member = Schemas['Console.Member'];
export type Invitation = Schemas['Console.Invitation'];
export type Settings = Schemas['Console.Settings'];
export type SettingsChange = Schemas['Console.SettingsChange'];
export type SiteInfo = Schemas['SiteInfo'];
export type ReportSources = Schemas['Console.ReportSources'];
export type ReportStatus = Schemas['Console.ReportStatus'];
export type ReviewVerdict = Schemas['Console.ReviewVerdict'];
export type ReportReview = Schemas['Console.ReportReview'];
export type ReportDraftSummary = Schemas['Console.ReportDraftSummary'];
export type ReportDraft = Schemas['Console.ReportDraft'];
export type NewReport = Schemas['Console.NewReport'];
export type ReportEdit = Schemas['Console.ReportEdit'];
export type ReviewRequest = Schemas['Console.ReviewRequest'];
export type HuggingFaceUnreachableAnswer = Schemas['HuggingFaceUnreachableError'];

/* What the console's lists ask for, as the pages' addresses keep it and the client sends it. */

/** What the console's task list asks for: the filters and the page. */
export interface ConsoleTaskQuery {
  q: string;
  tag: string;
  spread?: TaskSpread;
  order: TaskOrder;
  offset: number;
}

/** What the console's run list asks for: the filters and the page. */
export interface ConsoleRunQuery {
  q: string;

  /** A model's id; every model when empty */
  model: string;

  /** A model and harness pair as "<model id>-<harness id>"; every pair when empty */
  combination: string;

  outcome?: RunOutcome;
  review?: ReviewFilter;
  offset: number;
}

/** What the event list of a run asks for. */
export interface RunEventQuery {
  kind?: RunEventKind;
  q: string;
  offset: number;
}

/** What a model's page asks for: one harness or all, the collection it keeps to, the filters and the page. */
export interface ModelTaskQuery {
  harness: string;

  /** The tag of the collection the page keeps to; every task when empty */
  tag: string;

  /** The one task the page keeps to; every task when empty */
  task: string;

  q: string;
  spread?: TaskSpread;
  order: TaskOrder;
  offset: number;
}

/** What a hunt's trial list asks for: a facet or all, a verdict or all, and the page. */
export interface HuntTrialQuery {
  facet: string;
  verdict?: HuntVerdict;
  offset: number;
}

/** What the changelog asks for: one benchmark or all, one kind of change or all, and the page. */
export interface ChangelogQuery {
  benchmarkId: string;
  change?: RevisionChange;
  offset: number;
}

/* The data files' formats, as spec/data.tsp declares them; only the mock server reads them. */
export type Catalog = Schemas['Data.Catalog'];
export type BenchmarkFile = Schemas['Data.BenchmarkFile'];
export type AnnotationCategoryRecord = Schemas['Data.AnnotationCategoryRecord'];
export type TaskRecord = Schemas['Data.TaskRecord'];
export type TaskFileRecord = Schemas['Data.TaskFileRecord'];
export type RunFact = Schemas['Data.RunFact'];
export type RunFile = Schemas['Data.RunFile'];
export type HuntRecord = Schemas['Data.HuntRecord'];
export type TrialRecord = Schemas['Data.TrialRecord'];
export type PublishedRelease = Schemas['Data.PublishedRelease'];
