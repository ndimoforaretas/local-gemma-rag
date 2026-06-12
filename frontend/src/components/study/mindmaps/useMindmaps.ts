/**
 * State + queries/mutations for Mindmaps Mode.
 * Mirrors useFlashcards' shape — phase machine, list/active queries, mutations.
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import type { Mindmap, MindmapGraph, MindmapsPhase } from "./types";

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

  // Change the auto-diagram layout (TD / LR); updates cache in place.
  const saveLayout = useMutation({
    mutationFn: ({ id, layout }: { id: number; layout: "TD" | "LR" }) =>
      api.setMindmapLayout(id, layout),
    onSuccess: (mm: Mindmap) =>
      qc.setQueryData(["mindmaps", "detail", mm.id], mm),
  });

  // Save (or clear) manual node positions after dragging; cache in place.
  const savePositions = useMutation({
    mutationFn: ({
      id,
      positions,
    }: {
      id: number;
      positions: Record<string, { x: number; y: number }> | null;
    }) => api.setMindmapPositions(id, positions),
    onSuccess: (mm: Mindmap) =>
      qc.setQueryData(["mindmaps", "detail", mm.id], mm),
  });

  // Save (or clear with null) the user-edited graph; cache in place.
  const saveGraph = useMutation({
    mutationFn: ({ id, graph }: { id: number; graph: MindmapGraph | null }) =>
      api.setMindmapGraph(id, graph),
    onSuccess: (mm: Mindmap) =>
      qc.setQueryData(["mindmaps", "detail", mm.id], mm),
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
    createMindmap, recordExport, deleteMindmap, saveLayout, savePositions, saveGraph,
    activeId,
    openMindmap, backToList, startNew,
  };
}
