namespace AegisBench;

/**
 * A run replayed over the world it acted on. A task's world is a set of layers, such as its code, its services and
 * where they are deployed; every layer is a graph, and edges may cross layers. A run leaves a footprint on the world:
 * the nodes each step touched, and the events that changed the world. Both are prepared offline by a mapper the
 * benchmark chooses; the site only replays what they record.
 */

/** How a layer is drawn. The replay keeps one way of drawing per shape, so a new benchmark adds layers, not drawings. */
enum WorldLayerShape {
  /**
   * Nodes nested by parent as deep as the world goes, such as directories, files, classes and their methods; the
   * layer's other edges, such as calls between functions, are drawn between the nodes they join
   */
  tree,

  /** Nodes with directed edges, laid out from sources to sinks, such as module imports or service calls; a parent is a box round its children, such as a package round its modules */
  graph,

  /** Nodes drawn inside their parent's box, such as pods on hosts or test cases in their files */
  groups,
}

/** A layer of a benchmark's worlds: its name, how it is drawn, and what it calls its nodes' statuses. */
model WorldLayer {
  /** Unique among the benchmark's layers */
  id: string;

  name: string;
  shape: WorldLayerShape;

  /** The layer's own words for statuses, where the replay's would not fit, such as passed and failed for tests */
  statuses?: StatusWords;
}

/** What a layer calls each status it gives its own word; a status it leaves out keeps the replay's word. */
model StatusWords {
  healthy?: string;
  degraded?: string;
  down?: string;
}

/** How healthy a node is, where the world records it; a replay marks every status but healthy. */
enum NodeStatus {
  healthy,
  degraded,
  down,
}

/**
 * A node of the world. Its id names its kind and its place, such as file:config/payment.yaml, svc:payment or
 * pod:payment-7d9f4-x2k, so a mapper can name the node a tool call touched from the call's arguments alone.
 */
model WorldNode {
  /** Unique in the world */
  id: string;

  /** One of the benchmark's layers */
  layer: string;

  /** What the node is, such as dir, file, function, service, host or pod, in the world's own words */
  type: string;

  /** What a replay writes on the node */
  label: string;

  /** The node it sits in, in the same layer: a file's directory, a function's file, a pod's host */
  parent?: string;

  status?: NodeStatus;

  /** Everything else the world records about the node, shown as it is */
  attrs?: Record<unknown>;

  /**
   * A file's text, or the text of a part of one, such as a function's in its file. A part's lines are numbered as they
   * stand in the nearest node above it whose text holds them.
   */
  content?: string;
}

/** A directed edge. One whose ends lie in different layers links the layers, such as a config file to its service. */
model WorldEdge {
  from: string;
  to: string;

  /** What the edge means, such as calls, configures or runs, in the world's own words */
  type: string;
}

/** A task's world before any run acts on it. */
model World {
  /** Each layer's in the order a replay draws them */
  nodes: WorldNode[];

  /** Within and across layers */
  edges: WorldEdge[];
}

/** How a step touched a node, which decides how a replay marks the node from that step on. */
enum TouchKind {
  /** The node appeared in the step's observation; the agent knows of it but has not looked at it */
  seen,

  /** The agent looked at the node, such as reading a file or querying a service's metrics */
  read,

  /** The agent changed the node, such as editing a file or restarting a service */
  write,
}

/** A node a step touched. */
model Touch {
  /** The step's step_id in the trajectory */
  step: int32;

  /** The tool call's tool_call_id in the step; absent when the step's message alone touched the node */
  toolCallId?: string;

  node: string;
  kind: TouchKind;

  /** The action in the mapper's words, such as edit, query or restart, shown as it is */
  verb: string;

  /** What the touch let the agent see of the node, when the call returned part of the node's data */
  view?: TouchView;
}

/** Lines of a file, both counted from 1 and both included. */
model LineRange {
  @minValue(1) from: int32;
  @minValue(1) to: int32;
}

/**
 * What a touch let the agent see of a node: the window of time the call asked about, and the part of the node's data
 * it returned. A replay shows this beside the node's whole data, so a reader sees what the agent saw and what it missed.
 */
model TouchView {
  /** The window of time the call asked about */
  from?: utcDateTime;
  to?: utcDateTime;

  /** The node's metric series the call returned, by name */
  series?: string[];

  /** The log entries the call returned, by id */
  logs?: string[];

  /** The traces the call returned, by id */
  traces?: string[];

  /** The lines of the node's content the call returned, or the line a stack frame named */
  lines?: LineRange;
}

model AddNode {
  type: "addNode";
  node: WorldNode;
}

/** The node leaves the world with every edge that ends at it. */
model RemoveNode {
  type: "removeNode";
  node: string;
}

/** The node's status, or some of its attributes, change; the attributes named replace their old values, the rest stay. */
model SetNode {
  type: "setNode";
  node: string;
  status?: NodeStatus;
  attrs?: Record<unknown>;

  /** A file's or a part's new text, which replaces the old */
  content?: string;
}

model AddEdge {
  type: "addEdge";
  edge: WorldEdge;
}

model RemoveEdge {
  type: "removeEdge";
  edge: WorldEdge;
}

/** One change of the world. */
@discriminated(#{ envelope: "none", discriminatorPropertyName: "type" })
union WorldChange {
  addNode: AddNode,
  removeNode: RemoveNode,
  setNode: SetNode,
  addEdge: AddEdge,
  removeEdge: RemoveEdge,
}

/** A change of the world at a step: one the agent caused, or one the environment made on its own, placed by its time. */
model WorldEvent {
  /** The step after which the change holds */
  step: int32;

  /** The tool call that caused the change; absent when the environment changed on its own */
  toolCallId?: string;

  change: WorldChange;
}

/** What a run did to its task's world. */
model Footprint {
  /** Who drew the footprint from the trajectory, such as a mapper and its version */
  mappedBy: string;

  /** In step order */
  touches: Touch[];

  /** In step order; the changes of one step in the order they happened */
  events: WorldEvent[];
}

/**
 * A run's replay: the benchmark's layers, the task's world before the run, and the run's footprint on it. A replay
 * reads the run's trajectory and timeline from the run's own operations.
 */
model RunReplay {
  /** In the order a replay stacks them */
  layers: WorldLayer[];

  /** The blocks a node's panel is made of on this benchmark, in order */
  panel: ReplayPanelBlock[];

  world: World;
  footprint: Footprint;

  /** Empty when the benchmark's panel shows none of what a world reports, as for a world that is only code */
  signals: RunSignals;
}

/**
 * The blocks a node's side panel is made of. Each shows the node's part of one kind of data, both as the agent saw it
 * at a step and whole, and shows nothing for a node that has none of it. A benchmark's configuration lists the blocks
 * it uses, in order.
 */
enum ReplayPanelBlock {
  /** The node's record as the world keeps it at the step */
  record,

  /** A file's text at the step, with the lines the agent saw */
  content,

  /** The node's metric series over the run, with the step's moment marked */
  metrics,

  /** The node's log entries, and for a file the entries whose stack runs through it */
  logs,

  /** The traces that pass through the node, span by span */
  traces,

  /** Every step that touched the node */
  touches,

  /** Every event that changed the node */
  events,

  /** The node's edges within and across layers, and the nodes it holds */
  edges,
}

/** How loud a log entry is. */
enum LogLevel {
  debug,
  info,
  warn,
  error,
}

/** A frame of a stack trace, innermost last. */
model StackFrame {
  function: string;
  file: string;
  line: int32;

  /** The node of the code layer the frame lies in, when the world holds the file */
  node?: string;
}

/** A log entry a node wrote. */
model LogEntry {
  /** Unique in the run's signals */
  id: string;

  at: utcDateTime;
  node: string;
  level: LogLevel;
  message: string;
  stack?: StackFrame[];
}

/** A metric a node reported at a fixed interval. */
model MetricSeries {
  node: string;

  /** Unique among the node's series, such as p99_latency */
  name: string;

  unit: string;

  /** When the first value was taken; each next one follows the interval after */
  start: utcDateTime;

  @minValue(1) intervalSeconds: int32;
  values: float64[];
}

enum SpanStatus {
  ok,
  error,
}

/** One operation of a trace on one node. */
model Span {
  traceId: string;

  /** Unique in its trace */
  spanId: string;

  /** The span that called this one; absent for the trace's root */
  parentId?: string;

  node: string;
  name: string;
  start: utcDateTime;
  end: utcDateTime;
  status: SpanStatus;
}

/**
 * What the run's world reported while the run went on: metrics, logs and traces, each from a node. Their times are the
 * same clock as the trajectory's steps, so a replay marks a step's moment on them.
 */
model RunSignals {
  series: MetricSeries[];
  logs: LogEntry[];
  spans: Span[];
}
