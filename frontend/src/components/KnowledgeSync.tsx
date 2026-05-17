import { useState, useRef, useEffect, useId } from "react";
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
import type { KBFile, KBFolder, WorkflowStatusResponse } from "../types/api";

interface Step {
  name: string;
  status: string;
  output?: string | any;
}

export function KnowledgeSync() {
  type SortOption = "name-asc" | "name-desc" | "date-newest" | "size-largest";

  const [syncStatus, setSyncStatus] = useState<
    "IDLE" | "UPLOADING" | "SYNCING" | "SUCCESS" | "ERROR"
  >("IDLE");
  const [steps, setSteps] = useState<Step[]>([]);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(
    () => new Set(),
  );
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [deletingFilename, setDeletingFilename] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>("name-asc");
  const [sortAnnouncement, setSortAnnouncement] = useState(
    "Files sorted by Name A-Z.",
  );
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const dropZoneHintId = useId();
  const sortSelectLabelId = useId();
  const sortStatusId = useId();

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

  const toggleFolder = (folderName: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderName)) {
        next.delete(folderName);
      } else {
        next.add(folderName);
      }
      return next;
    });
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

  const uploadFiles = (files: FileList | File[]) => {
    const selectedFiles = Array.from(files);
    if (selectedFiles.length === 0) return;

    const pdfFiles = selectedFiles.filter((file) =>
      file.name.toLowerCase().endsWith(".pdf"),
    );

    if (pdfFiles.length === 0) {
      setSyncStatus("ERROR");
      setSyncNotice(null);
      setSyncError("Only PDF files are supported.");
      return;
    }

    setSyncStatus("UPLOADING");
    setSyncNotice(null);
    setSyncError(null);

    const formData = new FormData();
    for (const file of pdfFiles) {
      formData.append("files", file);
    }

    uploadMutation.mutate(formData);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    uploadFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isFileDrag = (e: React.DragEvent<HTMLDivElement>) =>
    Array.from(e.dataTransfer.types).includes("Files");

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (!canUpload || !isFileDrag(e)) return;
    e.preventDefault();
    dragDepthRef.current += 1;
    setIsDragActive(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!canUpload || !isFileDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!canUpload || !isFileDrag(e)) return;
    e.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!canUpload) return;
    e.preventDefault();
    dragDepthRef.current = 0;
    setIsDragActive(false);
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    uploadFiles(e.dataTransfer.files);
  };

  const handleDropZoneKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!canUpload) return;
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    fileInputRef.current?.click();
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

  const parseSizeInBytes = (size: string): number => {
    const match = size.match(/^\s*([\d.]+)\s*([A-Za-z]+)\s*$/);
    if (!match) return 0;

    const value = Number.parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    if (Number.isNaN(value)) return 0;

    const unitMap: Record<string, number> = {
      B: 1,
      KB: 1024,
      MB: 1024 ** 2,
      GB: 1024 ** 3,
      TB: 1024 ** 4,
    };

    return value * (unitMap[unit] ?? 1);
  };

  const parseDate = (value: string): number => {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const sortFiles = (files: KBFile[]) => {
    const sorted = [...files];

    switch (sortOption) {
      case "name-asc":
        sorted.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
        );
        break;
      case "name-desc":
        sorted.sort((a, b) =>
          b.name.localeCompare(a.name, undefined, { sensitivity: "base" }),
        );
        break;
      case "date-newest":
        sorted.sort((a, b) => parseDate(b.modified) - parseDate(a.modified));
        break;
      case "size-largest":
        sorted.sort(
          (a, b) => parseSizeInBytes(b.size) - parseSizeInBytes(a.size),
        );
        break;
      default:
        break;
    }

    return sorted;
  };

  const getSortLabel = (value: SortOption): string => {
    switch (value) {
      case "name-asc":
        return "Name A-Z";
      case "name-desc":
        return "Name Z-A";
      case "date-newest":
        return "Date newest first";
      case "size-largest":
        return "File size largest first";
      default:
        return "Name A-Z";
    }
  };

  useEffect(() => {
    setSortAnnouncement(`Files sorted by ${getSortLabel(sortOption)}.`);
  }, [sortOption]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto flex flex-col gap-6 sm:gap-8">
        {/* Upload Panel + Drag-and-Drop Zone */}
        <div className="bg-[#eceef0] dark:bg-[#1d2027] border border-[#c2c6d6] dark:border-[#424754] rounded-2xl p-4 sm:p-6 lg:p-8 flex flex-col gap-5 transition-colors duration-300">
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
            aria-hidden="true"
          />

          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onKeyDown={handleDropZoneKeyDown}
            tabIndex={0}
            role="group"
            aria-label="File upload drop zone"
            aria-describedby={dropZoneHintId}
            aria-disabled={!canUpload}
            className={`rounded-2xl border-2 border-dashed px-4 py-8 sm:px-6 sm:py-10 text-center transition-all duration-300 ${
              isDragActive
                ? "border-[#a855f7] bg-[#d9c1f3]/45 dark:bg-[#3d2f4b]/55"
                : "border-[#727785] dark:border-[#8c909f] bg-[#f2f4f6] dark:bg-[#191b23]"
            }`}>
            <div className="mx-auto max-w-md flex flex-col items-center gap-3 sm:gap-4">
              {syncStatus === "UPLOADING" ? (
                <Loader2
                  className="animate-spin text-[#0058be] dark:text-[#adc6ff]"
                  size={46}
                />
              ) : (
                <UploadCloud
                  className="text-[#727785] dark:text-[#8c909f]"
                  size={46}
                />
              )}

              <p className="text-2xl sm:text-3xl font-semibold text-[#727785] dark:text-[#8c909f] tracking-tight">
                {isDragActive
                  ? "Drop PDFs to Upload"
                  : "Drag & Drop Files Here"}
              </p>

              <p className="text-sm sm:text-base text-[#727785] dark:text-[#8c909f]">
                or
              </p>

              <Tooltip
                content="Select PDF files to add to your knowledge base"
                position="top">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!canUpload}
                  className="inline-flex items-center justify-center gap-2 border border-[#0058be] dark:border-[#adc6ff] text-[#0058be] dark:text-[#adc6ff] bg-transparent hover:bg-[#d0e1fb] dark:hover:bg-[#32353c] disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 rounded-lg font-semibold transition-colors">
                  {syncStatus === "UPLOADING" ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : null}
                  {syncStatus === "UPLOADING" ? "Uploading..." : "Browse Files"}
                </button>
              </Tooltip>

              <p
                id={dropZoneHintId}
                className="text-xs sm:text-sm text-[#727785] dark:text-[#8c909f]">
                PDF files only
              </p>
            </div>
          </div>
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-xl sm:text-2xl font-semibold text-[#191c1e] dark:text-[#e1e2ec]">
                Current Libraries
              </h3>

              <label className="inline-flex items-center gap-2 text-sm font-medium text-[#424754] dark:text-[#8c909f]">
                <span id={sortSelectLabelId}>Sort files</span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  aria-labelledby={sortSelectLabelId}
                  aria-describedby={sortStatusId}
                  className="min-w-[220px] rounded-lg border border-[#c2c6d6] dark:border-[#424754] bg-white dark:bg-[#272a31] px-3 py-2 text-sm text-[#191c1e] dark:text-[#e1e2ec] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20 dark:focus:ring-[#a855f7]/30">
                  <option value="name-asc">Name A-Z</option>
                  <option value="name-desc">Name Z-A</option>
                  <option value="date-newest">Date newest first</option>
                  <option value="size-largest">File size largest first</option>
                </select>
              </label>
              <p id={sortStatusId} className="sr-only" aria-live="polite">
                {sortAnnouncement}
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:gap-6">
              {kbFolders.map((f, i) => {
                const allFiles = f.subfolders?.flatMap((s) => s.files) || [];
                const sortedFiles = sortFiles(allFiles);
                const isExpanded = !collapsedFolders.has(f.name);
                const folderPanelId = `folder-files-${i}`;
                return (
                  <div
                    key={i}
                    className="bg-[#ffffff] dark:bg-[#1d2027] border border-[#c2c6d6] dark:border-[#424754] rounded-2xl p-4 sm:p-6 transition-all hover:border-[#a855f7] dark:hover:border-[#a855f7] flex flex-col">
                    <button
                      type="button"
                      onClick={() => toggleFolder(f.name)}
                      aria-expanded={isExpanded}
                      aria-controls={folderPanelId}
                      className="w-full text-left">
                      <div className="flex items-start justify-between mb-4 gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#d0e1fb] dark:bg-[#32353c] flex items-center justify-center text-[#0058be] dark:text-[#adc6ff] shrink-0">
                          <Database size={24} />
                        </div>
                        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-[#eceef0] dark:bg-[#272a31] text-[#424754] dark:text-[#c2c6d6]">
                          {isExpanded ? "Hide files" : "Show files"}
                        </span>
                      </div>
                      <h4 className="text-lg sm:text-xl font-bold mb-2 text-[#191c1e] dark:text-[#e1e2ec]">
                        {f.name}
                      </h4>
                      <p className="text-sm sm:text-base text-[#424754] dark:text-[#8c909f] mb-4 sm:mb-5">
                        {f.description}
                      </p>
                      <div className="flex items-center justify-between text-sm text-[#727785] dark:text-[#8c909f] font-medium">
                        <span>{allFiles.length} Documents</span>
                        <span>{f.updated}</span>
                      </div>
                    </button>
                    {isExpanded && allFiles.length > 0 && (
                      <div
                        id={folderPanelId}
                        role="region"
                        aria-label={`${f.name} files`}
                        className="mt-4 pt-4 border-t border-[#c2c6d6] dark:border-[#424754]">
                        <div
                          role="list"
                          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                          {sortedFiles.map((file, fileIdx) => (
                            <div
                              key={fileIdx}
                              role="listitem"
                              className="bg-[#f2f4f6] dark:bg-[#272a31] p-3 rounded-xl border border-[#c2c6d6] dark:border-[#424754] flex flex-col gap-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 min-w-0">
                                  <span className="text-[#0058be] dark:text-[#adc6ff] bg-[#d0e1fb] dark:bg-[#32353c] p-1.5 rounded-md shrink-0">
                                    📄
                                  </span>
                                  <span className="text-sm sm:text-base text-[#191c1e] dark:text-[#c2c6d6] break-words">
                                    {file.name}
                                  </span>
                                </div>
                                <Tooltip
                                  content="Remove this document from knowledge base"
                                  position="top">
                                  <button
                                    onClick={(e) => handleDelete(e, file.name)}
                                    disabled={deletingFilename === file.name}
                                    className="text-[#8c909f] hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors p-1 shrink-0"
                                    aria-label={`Delete ${file.name}`}>
                                    <Trash2 size={16} />
                                  </button>
                                </Tooltip>
                              </div>
                              <div className="flex items-center justify-between text-xs text-[#727785] dark:text-[#8c909f]">
                                <span>
                                  {deletingFilename === file.name
                                    ? "Removing..."
                                    : file.size}
                                </span>
                                <span>{file.modified}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {isExpanded && allFiles.length === 0 && (
                      <div
                        id={folderPanelId}
                        role="region"
                        aria-label={`${f.name} files`}
                        className="mt-4 pt-4 border-t border-[#c2c6d6] dark:border-[#424754]">
                        <p className="text-sm text-[#727785] dark:text-[#8c909f]">
                          No files in this library yet.
                        </p>
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
