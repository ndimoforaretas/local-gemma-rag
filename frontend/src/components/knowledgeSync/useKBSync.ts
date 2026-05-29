/**
 * useKBSync — owns all upload/ingest/delete mutations, the workflow polling
 * effect, and the derived status state for KnowledgeSync.tsx.
 */

import { useRef, useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { WorkflowStatusResponse } from "../../types/api";
import type { SyncStatus } from "./syncTimeline";

const ALLOWED_EXTS = [".pdf", ".txt", ".md", ".csv", ".docx", ".pptx", ".xlsx", ".html", ".htm"];

export function useKBSync(refetchKB: () => void) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("IDLE");
  const [steps, setSteps] = useState<WorkflowStatusResponse["steps"]>([]);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [deletingFilename, setDeletingFilename] = useState<string | null>(null);
  const [largeFileWarning, setLargeFileWarning] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);

  // ── Workflow polling ─────────────────────────────────────────────────────
  const { data: workflowStatus } = useQuery<WorkflowStatusResponse | null>({
    queryKey: ["workflow", workflowId],
    queryFn: async () => (workflowId ? api.ingestStatus(workflowId) : null),
    enabled: !!workflowId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 1500;
      if (data.status === "SUCCESS" || data.status === "ERROR" || data.status === "not_found") return false;
      return 1500;
    },
  });

  useEffect(() => {
    if (!workflowStatus) return;
    setSteps(workflowStatus.steps || []);
    if (workflowStatus.status === "SUCCESS") {
      setLargeFileWarning(false);
      setSyncStatus("SUCCESS");
      setSyncError(null);
      setSyncNotice("Knowledge base sync completed successfully.");
      refetchKB();
      setTimeout(() => { setSyncStatus("IDLE"); setSteps([]); setWorkflowId(null); }, 5000);
    } else if (workflowStatus.status === "ERROR") {
      setSyncStatus("ERROR");
      setSyncError("Ingestion workflow failed. Please retry upload and sync.");
      setWorkflowId(null);
    }
  }, [workflowStatus, refetchKB]);

  // ── Mutations ────────────────────────────────────────────────────────────
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
      setSyncError(err instanceof Error ? err.message : "Failed to start ingestion workflow.");
    },
  });

  const uploadMutation = useMutation({
    mutationFn: ({ formData, category }: { formData: FormData; category: string }) =>
      api.upload(formData, category),
    onSuccess: () => { setSyncNotice("Upload complete. Preparing ingestion..."); setSyncError(null); startSyncMutation.mutate(); },
    onError: (err) => {
      setSyncStatus("ERROR");
      setSyncError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (filename: string) => api.deleteDoc(filename),
    onMutate: (filename) => { setDeletingFilename(filename); setSyncError(null); },
    onSuccess: (_, filename) => { setSyncNotice(`Removed ${filename} from the knowledge base.`); refetchKB(); },
    onError: (err) => { setSyncError(err instanceof Error ? err.message : "Failed to delete document."); },
    onSettled: () => setDeletingFilename(null),
  });

  // ── Handlers ─────────────────────────────────────────────────────────────
  const canUpload = syncStatus === "IDLE" || syncStatus === "SUCCESS" || syncStatus === "ERROR";

  const stageFiles = (files: FileList | File[]) => {
    const valid = Array.from(files).filter((f) => ALLOWED_EXTS.some((ext) => f.name.toLowerCase().endsWith(ext)));
    if (valid.length === 0) {
      setSyncStatus("ERROR"); setSyncNotice(null);
      setSyncError("Supported formats: PDF, DOCX, PPTX, XLSX, MD, CSV, TXT, HTML.");
      return;
    }
    setPendingFiles(valid);
    setIsCategoryModalOpen(true);
  };

  const handleCategoryConfirm = (category: string) => {
    setIsCategoryModalOpen(false);
    setSyncStatus("UPLOADING"); setSyncNotice(null); setSyncError(null);
    setLargeFileWarning(Math.max(...pendingFiles.map((f) => f.size)) > 50 * 1024 * 1024);
    const formData = new FormData();
    for (const file of pendingFiles) formData.append("files", file);
    uploadMutation.mutate({ formData, category });
    setPendingFiles([]);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    stageFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = (e: React.MouseEvent, filename: string) => {
    e.stopPropagation();
    setFileToDelete(filename);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteFile = () => {
    if (fileToDelete) deleteMutation.mutate(fileToDelete);
    setIsDeleteModalOpen(false);
    setFileToDelete(null);
  };

  const isFileDrag = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes("Files");

  const dragHandlers = {
    onDragEnter: (e: React.DragEvent<HTMLDivElement>) => {
      if (!canUpload || !isFileDrag(e)) return;
      e.preventDefault(); dragDepthRef.current += 1; setIsDragActive(true);
    },
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => {
      if (!canUpload || !isFileDrag(e)) return;
      e.preventDefault(); e.dataTransfer.dropEffect = "copy";
    },
    onDragLeave: (e: React.DragEvent<HTMLDivElement>) => {
      if (!canUpload || !isFileDrag(e)) return;
      e.preventDefault();
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) setIsDragActive(false);
    },
    onDrop: (e: React.DragEvent<HTMLDivElement>) => {
      if (!canUpload) return;
      e.preventDefault(); dragDepthRef.current = 0; setIsDragActive(false);
      if (e.dataTransfer.files?.length) stageFiles(e.dataTransfer.files);
    },
  };

  return {
    syncStatus, steps, syncNotice, syncError,
    deletingFilename, largeFileWarning,
    isDragActive, isCategoryModalOpen, setIsCategoryModalOpen,
    isDeleteModalOpen, fileToDelete,
    fileInputRef, canUpload,
    pendingFiles,
    dragHandlers,
    handleFileInputChange,
    handleCategoryConfirm,
    handleCategoryCancel: () => { setIsCategoryModalOpen(false); setPendingFiles([]); },
    handleDelete,
    confirmDeleteFile,
    cancelDeleteFile: () => { setIsDeleteModalOpen(false); setFileToDelete(null); },
    handleDropZoneKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!canUpload || (e.key !== "Enter" && e.key !== " ")) return;
      e.preventDefault(); fileInputRef.current?.click();
    },
  };
}
