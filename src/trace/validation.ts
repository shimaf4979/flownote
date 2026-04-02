import Ajv from "ajv";

import type { CodeFlowTraceDocument } from "./schema";
import traceSchema from "./trace.schema.json";

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile<CodeFlowTraceDocument>(traceSchema);

function formatAjvError(instancePath: string, message?: string): string {
  const path = instancePath ? instancePath.slice(1).replaceAll("/", ".") : "root";
  return `${path}: ${message ?? "Invalid value."}`;
}

function validateReferenceIntegrity(document: CodeFlowTraceDocument): void {
  const errors: string[] = [];
  const seenStepIds = new Set<string>();
  const duplicateStepIds = new Set<string>();

  for (const step of document.steps) {
    if (seenStepIds.has(step.id)) {
      duplicateStepIds.add(step.id);
    }
    seenStepIds.add(step.id);

    if (
      step.range?.startColumn !== undefined &&
      step.range?.endColumn !== undefined &&
      step.range.startLine === step.range.endLine &&
      step.range.startColumn > step.range.endColumn
    ) {
      errors.push(
        `steps["${step.id}"].range must use startColumn <= endColumn when startLine and endLine are equal.`,
      );
    }

    if ((step.range?.startColumn === undefined) !== (step.range?.endColumn === undefined)) {
      errors.push(
        `steps["${step.id}"].range.startColumn and steps["${step.id}"].range.endColumn must be provided together.`,
      );
    }
  }

  for (const duplicateId of duplicateStepIds) {
    errors.push(`steps contain duplicate id "${duplicateId}".`);
  }

  for (const step of document.steps) {
    if (step.parentStepId && !seenStepIds.has(step.parentStepId)) {
      errors.push(`steps["${step.id}"].parentStepId references missing step "${step.parentStepId}".`);
    }

    if (step.next && !seenStepIds.has(step.next)) {
      errors.push(`steps["${step.id}"].next references missing step "${step.next}".`);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
}

export function validateTraceDocument(input: unknown): CodeFlowTraceDocument {
  if (!validate(input)) {
    const errors =
      validate.errors?.map((error) => formatAjvError(error.instancePath, error.message)).join("\n") ??
      "Invalid trace document.";
    throw new Error(errors);
  }

  validateReferenceIntegrity(input);
  return input;
}
