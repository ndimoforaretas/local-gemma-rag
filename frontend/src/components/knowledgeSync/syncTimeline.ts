import type { WorkflowStatusResponse } from "../../types/api";

export type SyncStatus = "IDLE" | "UPLOADING" | "SYNCING" | "SUCCESS" | "ERROR";

export interface TimelineDef {
  id: string;
  label: string;
}

export const timelineDefs: TimelineDef[] = [
  { id: "list_document_files", label: "Scanning Library" },
  { id: "process_single_document", label: "Gathering Document" },
  { id: "embed_batch", label: "Calibrating Neural Embeddings" },
  { id: "save_vector_store", label: "Committing Knowledge Store" },
];

export interface StepInfo {
  stepData: WorkflowStatusResponse["steps"][number] | undefined;
  isComp: boolean;
  isActive: boolean;
  allSteps: WorkflowStatusResponse["steps"];
}

export function getStepInfo(
  stepName: string,
  steps: WorkflowStatusResponse["steps"],
  syncStatus: SyncStatus,
): StepInfo {
  const expectedStepsOrder = timelineDefs.map((d) => d.id);
  const filtered = steps.filter((s) => s.name === stepName);
  const stepData =
    filtered.find((s) => s.status === "RUNNING") || filtered[filtered.length - 1];

  let isComp = false;
  let isActive = false;

  if (stepData) {
    isComp = stepData.status === "COMPLETED" || stepData.status === "SUCCESS";
    isActive = stepData.status === "RUNNING";

    const stepIdx = expectedStepsOrder.indexOf(stepName);
    const currentOverallIdx = expectedStepsOrder.findIndex((name) => {
      const s =
        steps.filter((x) => x.name === name).find((x) => x.status === "RUNNING") ||
        steps.filter((x) => x.name === name).pop();
      return s && s.status === "RUNNING";
    });
    if (currentOverallIdx > stepIdx) isComp = true;
  }

  if (syncStatus === "SUCCESS") {
    isComp = true;
    isActive = false;
  }

  return { stepData, isComp, isActive, allSteps: filtered };
}
