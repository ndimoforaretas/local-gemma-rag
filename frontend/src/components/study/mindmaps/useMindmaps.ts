/**
 * State + queries/mutations for Mindmaps Mode.
 * Mirrors useFlashcards' shape — phase machine, list/active queries, mutations.
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import type { Mindmap, MindmapsPhase } from "./types";

export function useMindmaps() {
  const qc = useQueryClient();

  const [phase, setPhase] = useState<MindmapsPhase>("list");
  const [activeId, setActiveId] = useState<number | null>(null);
  const [scope, setScope] = useState<string[]>([]);

  const list = useQuery({
    queryKey: ["mindmaps", "list"],
    queryFn: () => api.listMindmaps(),
  });

  const active = useQuery({
    queryKey: ["mindmaps", "detail", activeId],
    queryFn: () => api.getMindmap(activeId!),
    enabled: activeId !== null,
  });

  const createMindmap = useMutation({
    mutationFn: api.createMindmap,
    onSuccess: (mm: Mindmap) => {
      qc.setQueryData(["mindmaps", "detail", mm.id], mm);
      setActiveId(mm.id);
      setPhase("view");
      list.refetch();
    },
  });

  const recordExport = useMutation({
    mutationFn: api.recordMindmapExport,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["progress"] });
      list.refetch();
    },
  });

  const deleteMindmap = useMutation({
    mutationFn: api.deleteMindmap,
    onSuccess: () => list.refetch(),
  });

  const openMindmap = (id: number) => {
    setActiveId(id);
    setPhase("view");
  };
  const backToList = () => {
    setActiveId(null);
    setPhase("list");
  };
  const startNew = () => {
    setScope([]);
    setPhase("config");
    createMindmap.reset();
  };

  return {
    phase, setPhase,
    scope, setScope,
    list, active,
    createMindmap, recordExport, deleteMindmap,
    activeId,
    openMindmap, backToList, startNew,
  };
}
