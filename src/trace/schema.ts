export type TraceStepKind = "call" | "enter" | "return" | "resume";

export interface TracePosition {
  file: string;
  line: number;
}

export interface TraceRange {
  startLine: number;
  endLine: number;
  startColumn?: number;
  endColumn?: number;
}

export interface CodeFlowTraceStep {
  id: string;
  file: string;
  line: number;
  title: string;
  summary: string;
  depth: number;
  next?: string;
  parentStepId?: string;
  kind?: TraceStepKind;
  range?: TraceRange;
  code?: string;
}

export interface CodeFlowTraceDocument {
  version: number;
  name: string;
  description?: string;
  entry: TracePosition;
  steps: CodeFlowTraceStep[];
}

export interface ParsedTraceFile {
  uri: string;
  document: CodeFlowTraceDocument;
}
