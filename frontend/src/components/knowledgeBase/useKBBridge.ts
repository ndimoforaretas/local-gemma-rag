/**
 * useKBBridge — manages the "Add this attachment to the Knowledge Base"
 * post-message action surfaced under the chat composer.
 *
 * Owns:
 *  - `pendingKBFiles`: text-like attachments from the last send that the
 *    user can optionally promote into the persistent KB.
 *  - `kbSaveStatus`: idle | saving | indexing | done | error
 *  - The polling workflow that watches indexing progress and refreshes
 *    related React-Query caches when it lands.
 */

import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { SaveToKBFile } from "../../types/api";

export type KBSaveStatus = "idle" | "saving" | "indexing" | "done" | "error";

export function useKBBridge() {
  const queryClient = useQueryClient();
  const [pendingKBFiles, setPendingKBFiles] = useState<SaveToKBFile[]>([]);
  const [kbSaveStatus, setKbSaveStatus] = useState<KBSaveStatus>("idle");
  const [kbWorkflowId, setKbWorkflowId] = useState<string | null>(null);

  const { data: kbWorkflowStatus } = useQuery({
    queryKey: ["kbWorkflow", kbWorkflowId],
    queryFn: () => api.ingestStatus(kbWorkflowId!),
    enabled: !!kbWorkflowId,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      if (s === "SUCCESS" || s === "ERROR" || s === "not_found") return false;
      return 1500;
    },
  });

  useEffect(() => {
    if (!kbWorkflowStatus) return;
    const s = kbWorkflowStatus.status;
    if (s === "SUCCESS") {
      setKbSaveStatus("done");
      setKbWorkflowId(null);
      queryClient.invalidateQueries({ queryKey: ["kbFolders"] });
      queryClient.invalidateQueries({ queryKey: ["vaultStats"] });
      setTimeout(() => {
        setPendingKBFiles([]);
        setKbSaveStatus("idle");
      }, 4000);
    } else if (s === "ERROR" || s === "not_found") {
      setKbSaveStatus("error");
      setKbWorkflowId(null);
    }
  }, [kbWorkflowStatus, queryClient]);

  const saveToKB = useCallback(async () => {
    if (pendingKBFiles.length === 0) return;
    setKbSaveStatus("saving");
    try {
      const result = await api.saveToKB(pendingKBFiles);
      if (result.workflow_id) {
        setKbWorkflowId(result.workflow_id);
        setKbSaveStatus("indexing");
      } else {
        // No workflow id — fall back to instant success.
        setKbSaveStatus("done");
        queryClient.invalidateQueries({ queryKey: ["kbFolders"] });
        queryClient.invalidateQueries({ queryKey: ["vaultStats"] });
        setTimeout(() => {
          setPendingKBFiles([]);
          setKbSaveStatus("idle");
        }, 4000);
      }
    } catch (e) {
      console.error(e);
      setKbSaveStatus("error");
    }
  }, [pendingKBFiles, queryClient]);

  const dismiss = useCallback(() => {
    setPendingKBFiles([]);
    setKbSaveStatus("idle");
  }, []);

  const reset = useCallback(() => {
    setKbSaveStatus("idle");
  }, []);

  return {
    pendingKBFiles,
    setPendingKBFiles,
    kbSaveStatus,
    saveToKB,
    dismiss,
    reset,
  };
}
