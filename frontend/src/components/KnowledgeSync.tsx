import { useState, useRef, useEffect } from "react";
import {
  UploadCloud,
  CheckCircle2,
  Circle,
  Loader2,
  Database,
  Trash2,
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tooltip } from "./Tooltip";
import { api } from "../lib/api";
import type { KBFolder, WorkflowStatusResponse } from "../types/api";

interface Step {
  name: string;
  status: string;
  output?: string | any;
}

export function KnowledgeSync() {
  const [syncStatus, setSyncStatus] = useState<
    "IDLE" | "UPLOADING" | "SYNCING" | "SUCCESS" | "ERROR"
  >("IDLE");
  const [steps, setSteps] = useState<Step[]>([]);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [deletingFilename, setDeletingFilename] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: kbFolders = [], refetch: refetchKB } = useQuery<KBFolder[]>({
    queryKey: ["kbFolders"],
    queryFn: async () => {
      try {
        const data = await api.getKB();
        return data.folders || [];
      } catch {
        return [];
      }
    },
  });

  const { data: workflowStatus } = useQuery<WorkflowStatusResponse | null>({
    queryKey: ["workflow", workflowId],
    queryFn: async () => {
      if (!workflowId) return null;
      return api.ingestStatus(workflowId);
    },
    enabled: !!workflowId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 1500;
      if (
        data.status === "SUCCESS" ||
        data.status === "ERROR" ||
        data.status === "not_found"
      )
        return false;
      return 1500;
    },
  });

  useEffect(() => {
    if (workflowStatus) {
      setSteps(workflowStatus.steps || []);
      if (workflowStatus.status === "SUCCESS") {
        setSyncStatus("SUCCESS");
        setSyncError(null);
        setSyncNotice("Knowledge base sync completed successfully.");
        refetchKB();
        setTimeout(() => {
          setSyncStatus("IDLE");
          setSteps([]);
          setWorkflowId(null);
        }, 5000);
      } else if (workflowStatus.status === "ERROR") {
        setSyncStatus("ERROR");
        setSyncError(
          "Ingestion workflow failed. Please retry upload and sync.",
        );
        setWorkflowId(null);
      }
    }
  }, [workflowStatus, refetchKB]);

  const deleteMutation = useMutation({
    mutationFn: (filename: string) => api.deleteDoc(filename),
    onMutate: (filename: string) => {
      setDeletingFilename(filename);
      setSyncError(null);
    },
    onSuccess: (_, filename) => {
      setSyncNotice(`Removed ${filename} from the knowledge base.`);
      refetchKB();
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : "Failed to delete document.";
      setSyncError(message);
    },
    onSettled: () => {
      setDeletingFilename(null);
    },
  });

  const handleDelete = (e: React.MouseEvent, filename: string) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      `Remove ${filename} from the knowledge base?`,
    );
    if (!confirmed) return;
    deleteMutation.mutate(filename);
  };

  const startSyncMutation = useMutation({
    mutationFn: () => api.ingest(),
    onSuccess: (data) => {
      if (data.workflow_id) {
        setSyncStatus("SYNCING");
        setSyncError(null);
        setSyncNotice("Documents uploaded. Starting sync workflow...");
        setWorkflowId(data.workflow_id);
      } else {
        setSyncStatus("ERROR");
        setSyncError("Unable to start ingestion workflow.");
      }
    },
    onError: (err) => {
      setSyncStatus("ERROR");
      const message =
        err instanceof Error
          ? err.message
          : "Failed to start ingestion workflow.";
      setSyncError(message);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => api.upload(formData),
    onSuccess: () => {
      setSyncNotice("Upload complete. Preparing ingestion...");
      setSyncError(null);
      startSyncMutation.mutate();
    },
    onError: (err) => {
      setSyncStatus("ERROR");
      const message =
        err instanceof Error ? err.message : "Upload failed. Please try again.";
      setSyncError(message);
    },
  });

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setSyncStatus("UPLOADING");
    setSyncNotice(null);
    setSyncError(null);
    const formData = new FormData();
    for (let i = 0; i < e.target.files.length; i++) {
      formData.append("files", e.target.files[i]);
    }
    uploadMutation.mutate(formData);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Helper to determine step status
  const getStepInfo = (stepName: string) => {
    const expectedStepsOrder = [
      "list_document_files",
      "process_single_document",
      "embed_batch",
      "save_vector_store",
    ];
    const filtered = steps.filter((s) => s.name === stepName);
    const stepData =
      filtered.find((s) => s.status === "RUNNING") ||
      filtered[filtered.length - 1];

    let isComp = false;
    let isActive = false;

    if (stepData) {
      isComp = stepData.status === "COMPLETED" || stepData.status === "SUCCESS";
      isActive = stepData.status === "RUNNING";

      const stepIdx = expectedStepsOrder.indexOf(stepName);
      const currentOverallIdx = expectedStepsOrder.findIndex((name) => {
        const s =
          steps
            .filter((x) => x.name === name)
            .find((x) => x.status === "RUNNING") ||
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
  };

  const timelineDefs = [
    { id: "list_document_files", label: "Scanning Library" },
    { id: "process_single_document", label: "Gathering Document" },
    { id: "embed_batch", label: "Calibrating Neural Embeddings" },
    { id: "save_vector_store", label: "Committing Knowledge Store" },
  ];

  const canUpload =
    syncStatus === "IDLE" || syncStatus === "SUCCESS" || syncStatus === "ERROR";

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto flex flex-col gap-6 sm:gap-8">
        {/* Action Bar: surface-container bg */}
        <div className="bg-[#eceef0] dark:bg-[#1d2027] border border-[#c2c6d6] dark:border-[#424754] rounded-2xl p-4 sm:p-6 lg:p-8 flex flex-col gap-4 sm:gap-5 sm:flex-row sm:items-center sm:justify-between transition-colors duration-300">
          <div className="min-w-0">
            <h3 className="text-xl sm:text-2xl font-semibold mb-1.5 sm:mb-2 text-[#191c1e] dark:text-[#e1e2ec]">
              Knowledge Base Management
            </h3>
            <p className="text-sm sm:text-base text-[#424754] dark:text-[#8c909f]">
              Upload PDFs and sync them into your local vector store.
            </p>
            <div className="mt-3 inline-flex items-center text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#d0e1fb] dark:bg-[#32353c] text-[#0058be] dark:text-[#adc6ff]">
              Status: {syncStatus}
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            multiple
            accept=".pdf"
            className="hidden"
          />

          <Tooltip
            content="Select PDF files to add to your knowledge base"
            position="left">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!canUpload}
              className="w-full sm:w-auto flex items-center justify-center gap-3 bg-[#a855f7] hover:bg-[#9333ea] disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 sm:px-6 py-3 rounded-xl font-medium shadow-lg shadow-[#a855f7]/25 hover:shadow-[#a855f7]/40 transition-all">
              {syncStatus === "UPLOADING" ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <UploadCloud size={20} />
              )}
              {syncStatus === "UPLOADING" ? "Uploading..." : "Upload Documents"}
            </button>
          </Tooltip>
        </div>

        {syncNotice && (
          <div
            aria-live="polite"
            className="rounded-xl border border-emerald-300/70 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            {syncNotice}
          </div>
        )}

        {syncError && (
          <div
            aria-live="assertive"
            className="rounded-xl border border-red-300/70 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {syncError}
          </div>
        )}

        {/* Sync Progress */}
        {(syncStatus === "SYNCING" || syncStatus === "SUCCESS") && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#eceef0] dark:bg-[#1d2027] border border-[#c2c6d6] dark:border-[#424754] rounded-2xl p-5 sm:p-7 lg:p-10 transition-colors duration-300">
            <div className="flex items-start sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-10">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  syncStatus === "SUCCESS"
                    ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30"
                    : "bg-[#d0e1fb] dark:bg-[#32353c] text-[#0058be] dark:text-[#adc6ff] border border-[#c2c6d6] dark:border-[#424754]"
                }`}>
                <Database size={24} />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-[#191c1e] dark:text-[#e1e2ec]">
                  {syncStatus === "SUCCESS"
                    ? "Knowledge Sync Complete"
                    : "Processing Engine Active..."}
                </h3>
                <p className="text-[#424754] dark:text-[#8c909f] text-sm sm:text-base">
                  DBOS Durable Workflow is safely processing your documents.
                </p>
              </div>
            </div>

            <div className="relative pl-5 sm:pl-6 ml-2 sm:ml-4 border-l-2 border-[#c2c6d6] dark:border-[#424754] flex flex-col gap-6 sm:gap-8">
              {timelineDefs.map(({ id, label }) => {
                const { stepData, isComp, isActive, allSteps } =
                  getStepInfo(id);
                let subtext = isComp
                  ? "Process verified"
                  : isActive
                    ? "Running..."
                    : "Waiting...";
                if (id === "process_single_document" && stepData) {
                  try {
                    const output =
                      typeof stepData.output === "string"
                        ? JSON.parse(stepData.output)
                        : stepData.output;
                    const filename =
                      output && output.length > 0
                        ? output[0].source
                        : "Checking file...";
                    subtext = isComp
                      ? `Extracted ${filename}`
                      : `Reading pages... (${allSteps.indexOf(stepData) + 1} of ${allSteps.length})`;
                  } catch (e) {
                    /* ignore */
                  }
                }
                if (id === "embed_batch" && stepData && isActive) {
                  subtext = `Calibrating batch ${allSteps.indexOf(stepData) + 1} of ${allSteps.length}...`;
                }
                return (
                  <div
                    key={id}
                    className={`relative flex items-start sm:items-center gap-4 sm:gap-6 ${isComp ? "opacity-100" : isActive ? "opacity-100" : "opacity-40"}`}>
                    {/* Timeline dot: surface-container-low bg so it masks the line */}
                    <div className="absolute -left-[35px] bg-[#f2f4f6] dark:bg-[#191b23] rounded-full p-1 transition-colors duration-300">
                      {isComp ? (
                        <CheckCircle2 size={24} className="text-emerald-500" />
                      ) : isActive ? (
                        <Loader2
                          size={24}
                          className="text-[#0058be] dark:text-[#adc6ff] animate-spin"
                        />
                      ) : (
                        <Circle
                          size={24}
                          className="text-[#727785] dark:text-[#424754]"
                        />
                      )}
                    </div>
                    <div>
                      <h4
                        className={`text-base sm:text-lg lg:text-xl font-semibold ${
                          isComp
                            ? "text-[#191c1e] dark:text-[#e1e2ec]"
                            : isActive
                              ? "text-[#0058be] dark:text-[#adc6ff]"
                              : "text-[#727785] dark:text-[#8c909f]"
                        }`}>
                        {label}
                      </h4>
                      <p className="text-sm sm:text-base text-[#424754] dark:text-[#8c909f]">
                        {subtext}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>

      {/* Existing Files */}
      {kbFolders.length > 0 &&
        syncStatus !== "SYNCING" &&
        syncStatus !== "UPLOADING" && (
          <div className="max-w-5xl mx-auto mt-8 flex flex-col gap-4 sm:gap-6">
            <h3 className="text-xl sm:text-2xl font-semibold text-[#191c1e] dark:text-[#e1e2ec]">
              Current Libraries
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {kbFolders.map((f, i) => {
                const allFiles = f.subfolders?.flatMap((s) => s.files) || [];
                const isExpanded = expandedFolder === f.name;
                return (
                  <div
                    key={i}
                    onClick={() =>
                      setExpandedFolder(isExpanded ? null : f.name)
                    }
                    className="bg-[#ffffff] dark:bg-[#1d2027] border border-[#c2c6d6] dark:border-[#424754] rounded-2xl p-4 sm:p-6 transition-all hover:border-[#a855f7] dark:hover:border-[#a855f7] cursor-pointer flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-[#d0e1fb] dark:bg-[#32353c] flex items-center justify-center text-[#0058be] dark:text-[#adc6ff]">
                        <Database size={24} />
                      </div>
                    </div>
                    <h4 className="text-lg sm:text-xl font-bold mb-2 text-[#191c1e] dark:text-[#e1e2ec]">
                      {f.name}
                    </h4>
                    <p className="text-sm sm:text-base text-[#424754] dark:text-[#8c909f] mb-4 sm:mb-6">
                      {f.description}
                    </p>
                    <div className="flex items-center justify-between text-sm text-[#727785] dark:text-[#8c909f] font-medium mb-4">
                      <span>{allFiles.length} Documents</span>
                      <span>{f.updated}</span>
                    </div>
                    {isExpanded && allFiles.length > 0 && (
                      <div className="mt-2 pt-4 border-t border-[#c2c6d6] dark:border-[#424754] flex flex-col gap-3">
                        {allFiles.map((file, fileIdx) => (
                          <div
                            key={fileIdx}
                            className="flex items-center justify-between bg-[#f2f4f6] dark:bg-[#272a31] p-3 rounded-lg border border-[#c2c6d6] dark:border-[#424754]">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <span className="text-[#0058be] dark:text-[#adc6ff] bg-[#d0e1fb] dark:bg-[#32353c] p-1.5 rounded-md">
                                📄
                              </span>
                              <span className="text-base text-[#191c1e] dark:text-[#c2c6d6] truncate">
                                {file.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-[#727785] dark:text-[#8c909f] shrink-0">
                              <span>
                                {deletingFilename === file.name
                                  ? "Removing..."
                                  : file.size}
                              </span>
                              <Tooltip
                                content="Remove this document from knowledge base"
                                position="top">
                                <button
                                  onClick={(e) => handleDelete(e, file.name)}
                                  disabled={deletingFilename === file.name}
                                  className="text-[#8c909f] hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors p-1">
                                  <Trash2 size={16} />
                                </button>
                              </Tooltip>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      {kbFolders.length === 0 &&
        syncStatus !== "SYNCING" &&
        syncStatus !== "UPLOADING" && (
          <div className="max-w-5xl mx-auto mt-8">
            <div className="rounded-2xl border border-dashed border-[#c2c6d6] dark:border-[#424754] bg-[#ffffff] dark:bg-[#1d2027] p-6 sm:p-8 text-center">
              <h4 className="text-lg sm:text-xl font-semibold text-[#191c1e] dark:text-[#e1e2ec]">
                No documents yet
              </h4>
              <p className="mt-2 text-sm sm:text-base text-[#424754] dark:text-[#8c909f]">
                Upload PDFs to build your knowledge base and enable
                document-grounded answers.
              </p>
            </div>
          </div>
        )}
    </div>
  );
}
