namespace AegisBench;

/**
 * A run replayed over the world it acted on. A task's world is a set of layers, such as its code, its services and
 * where they are deployed; every layer is a graph, and edges may cross layers. A run leaves a footprint on the world:
 * the nodes each step touched, and the events that changed the world. Both are prepared offline by a mapper the
 * benchmark chooses; the site only replays what they record.
 */

/** How a layer is drawn. The replay keeps one way of drawing per shape, so a new benchmark adds layers, not drawings. */
enum WorldLayerShape {
  /** Nodes nest by parent and the layer has no other edges, such as directories, files and the symbols in them */
  tree,

  /** Nodes with directed edges, laid out from sources to sinks, such as module imports or service calls */
  graph,

  /** Nodes drawn inside their parent's box, such as pods on hosts */
  groups,
}

/** A layer of a benchmark's worlds: its name and how it is drawn. */
model WorldLayer {
  /** Unique among the benchmark's layers */
  id: string;

  name: string;
  shape: WorldLayerShape;
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

  world: World;
  footprint: Footprint;
}
