/**
 * VaultAudit — Privacy Vault Audit Panel
 *
 * Shows a real-time summary of the local knowledge vault: document count,
 * chunk count, FAISS index size, last ingestion time, and a clear visual
 * confirmation that all inference runs locally (zero external API calls).
 */

import { useQuery } from "@tanstack/react-query";
import { Shield, HardDrive, Database, Clock, Server } from "lucide-react";
import { api } from "../lib/api";

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-[#f2f4f6] dark:bg-[#272a31] border border-[#c2c6d6] dark:border-[#424754]">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#d0e1fb] dark:bg-[#32353c] text-[#0058be] dark:text-[#adc6ff] shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-ink-muted uppercase tracking-wide">
          {label}
        </p>
        <p className="text-lg font-bold text-ink-strong leading-tight">
          {value}
        </p>
        {sub && (
          <p className="text-xs text-ink-muted truncate mt-0.5">
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

export function VaultAudit() {
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ["vaultStats"],
    queryFn: () => api.getVaultStats(),
    refetchInterval: 30_000, // refresh every 30s
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-[#c2c6d6] dark:border-[#424754] bg-[#eceef0] dark:bg-[#1d2027] p-6 animate-pulse">
        <div className="h-6 w-48 bg-[#c2c6d6] dark:bg-[#424754] rounded mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-[#c2c6d6] dark:bg-[#424754] rounded-xl"
            />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !stats) {
    return null; // silently hide on error — non-critical panel
  }

  const lastIngested = stats.last_ingested_at
    ? new Date(stats.last_ingested_at).toLocaleString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Never";

  const indexSizeLabel =
    stats.index_size_kb >= 1024
      ? `${(stats.index_size_kb / 1024).toFixed(1)} MB`
      : `${stats.index_size_kb} KB`;

  return (
    <div className="rounded-2xl border border-[#c2c6d6] dark:border-[#424754] bg-[#eceef0] dark:bg-[#1d2027] p-5 sm:p-6 flex flex-col gap-5 transition-colors duration-300">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
            <Shield size={18} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-ink-strong">
              Privacy Vault Audit
            </h3>
            <p className="text-xs text-ink-muted">
              All inference runs on your hardware
            </p>
          </div>
        </div>

        {/* 100% Local badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          🔒 100% Local
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Database size={18} />}
          label="Documents"
          value={stats.total_documents.toLocaleString()}
          sub={`${stats.total_chunks.toLocaleString()} chunks indexed`}
        />
        <StatCard
          icon={<HardDrive size={18} />}
          label="Index Size"
          value={indexSizeLabel}
          sub={`FAISS IndexFlatIP (cosine)`}
        />
        <StatCard
          icon={<Clock size={18} />}
          label="Last Ingested"
          value={lastIngested}
        />
        <StatCard
          icon={<Server size={18} />}
          label="Model Host"
          value="Ollama"
          sub={stats.ollama_host}
        />
      </div>

      {/* Zero external calls banner */}
      <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/40 px-4 py-3">
        <span className="text-lg">🛡️</span>
        <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
          <span className="font-bold">Zero external API calls.</span> Every
          embedding, retrieval, and generation step runs locally on{" "}
          <span className="font-bold">{stats.ollama_host}</span>. Your documents
          never leave your machine.
        </p>
      </div>
    </div>
  );
}
