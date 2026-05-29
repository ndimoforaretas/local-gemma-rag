import { CheckCircle2, Circle, Database, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { timelineDefs, getStepInfo, type SyncStatus } from "./syncTimeline";
import type { WorkflowStatusResponse } from "../../types/api";

interface SyncProgressPanelProps {
  syncStatus: SyncStatus;
  steps: WorkflowStatusResponse["steps"];
  largeFileWarning: boolean;
}

export function SyncProgressPanel({ syncStatus, steps, largeFileWarning }: SyncProgressPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#eceef0] dark:bg-[#1d2027] border border-[#c2c6d6] dark:border-[#424754] rounded-2xl p-5 sm:p-7 lg:p-10 transition-colors duration-300"
    >
      <div className="flex items-start sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-10">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          syncStatus === "SUCCESS"
            ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30"
            : "bg-[#d0e1fb] dark:bg-[#32353c] text-[#0058be] dark:text-[#adc6ff] border border-[#c2c6d6] dark:border-[#424754]"
        }`}>
          <Database size={24} />
        </div>
        <div>
          <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-ink-strong">
            {syncStatus === "SUCCESS" ? "Knowledge Sync Complete" : "Processing Engine Active..."}
          </h3>
          <p className="text-ink-muted text-sm sm:text-base">
            DBOS Durable Workflow is safely processing your documents.
          </p>
        </div>
      </div>

      {largeFileWarning && syncStatus === "SYNCING" && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-300/70 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          <span className="text-lg leading-none">⏳</span>
          <span>
            <strong>Large file detected.</strong> Indexing may take several minutes — the app is working in the background and has not frozen. Grab a coffee!
          </span>
        </div>
      )}

      <div className="relative pl-5 sm:pl-6 ml-2 sm:ml-4 border-l-2 border-[#c2c6d6] dark:border-[#424754] flex flex-col gap-6 sm:gap-8">
        {timelineDefs.map(({ id, label }) => {
          const { stepData, isComp, isActive, allSteps } = getStepInfo(id, steps, syncStatus);
          let subtext = isComp ? "Process verified" : isActive ? "Running..." : "Waiting...";

          if (id === "process_single_document" && stepData) {
            try {
              const output = typeof stepData.output === "string" ? JSON.parse(stepData.output) : stepData.output;
              const filename = output?.length > 0 ? output[0].source : "Checking file...";
              subtext = isComp ? `Extracted ${filename}` : `Reading pages... (${allSteps.indexOf(stepData) + 1} of ${allSteps.length})`;
            } catch { /* ignore */ }
          }
          if (id === "embed_batch" && stepData && isActive) {
            subtext = `Calibrating batch ${allSteps.indexOf(stepData) + 1} of ${allSteps.length}...`;
          }

          return (
            <div key={id} className={`relative flex items-start sm:items-center gap-4 sm:gap-6 ${isComp || isActive ? "opacity-100" : "opacity-40"}`}>
              <div className="absolute -left-[35px] sm:-left-[39px] bg-[#f2f4f6] dark:bg-[#191b23] rounded-full p-1 transition-colors duration-300">
                {isComp
                  ? <CheckCircle2 size={24} className="text-emerald-500" />
                  : isActive
                    ? <Loader2 size={24} className="text-[#0058be] dark:text-[#adc6ff] animate-spin" />
                    : <Circle size={24} className="text-ink-faint" />
                }
              </div>
              <div>
                <h4 className={`text-base sm:text-lg lg:text-xl font-semibold ${
                  isComp ? "text-ink-strong"
                    : isActive ? "text-[#0058be] dark:text-[#adc6ff]"
                    : "text-ink-muted"
                }`}>{label}</h4>
                <p className="text-sm sm:text-base text-ink-muted">{subtext}</p>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
