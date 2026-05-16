import { useState, useRef, useEffect } from 'react';
import { UploadCloud, CheckCircle2, Circle, Loader2, Database, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Tooltip } from './Tooltip';

interface Step {
  name: string;
  status: string;
  output?: string | any;
}

export function KnowledgeSync() {
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'UPLOADING' | 'SYNCING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [steps, setSteps] = useState<Step[]>([]);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: kbFolders = [], refetch: refetchKB } = useQuery<any[]>({
    queryKey: ['kbFolders'],
    queryFn: async () => {
      const res = await fetch('/kb');
      if (!res.ok) return [];
      const data = await res.json();
      return data.folders || [];
    }
  });

  const { data: workflowStatus } = useQuery({
    queryKey: ['workflow', workflowId],
    queryFn: async () => {
      if (!workflowId) return null;
      const res = await fetch(`/ingest/status/${workflowId}`);
      if (!res.ok) throw new Error('Failed to fetch status');
      return res.json();
    },
    enabled: !!workflowId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 1500;
      if (data.status === 'SUCCESS' || data.status === 'ERROR' || data.status === 'not_found') return false;
      return 1500;
    }
  });

  useEffect(() => {
    if (workflowStatus) {
      setSteps(workflowStatus.steps || []);
      if (workflowStatus.status === 'SUCCESS') {
        setSyncStatus('SUCCESS');
        refetchKB();
        setTimeout(() => {
          setSyncStatus('IDLE');
          setSteps([]);
          setWorkflowId(null);
        }, 5000);
      } else if (workflowStatus.status === 'ERROR') {
        setSyncStatus('ERROR');
        setWorkflowId(null);
      }
    }
  }, [workflowStatus, refetchKB]);

  const deleteMutation = useMutation({
    mutationFn: async (filename: string) => {
      const res = await fetch(`/api/docs/${filename}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      return res.json();
    },
    onSuccess: () => refetchKB()
  });

  const handleDelete = (e: React.MouseEvent, filename: string) => {
    e.stopPropagation();
    deleteMutation.mutate(filename);
  };

  const startSyncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/ingest`, { method: 'POST' });
      if (!res.ok) throw new Error('Ingest failed');
      return res.json();
    },
    onSuccess: (data) => {
      if (data.workflow_id) {
        setSyncStatus('SYNCING');
        setWorkflowId(data.workflow_id);
      } else {
        setSyncStatus('ERROR');
      }
    },
    onError: () => setSyncStatus('ERROR')
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch('/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      return res.json();
    },
    onSuccess: () => {
      startSyncMutation.mutate();
    },
    onError: () => setSyncStatus('ERROR')
  });

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setSyncStatus('UPLOADING');
    const formData = new FormData();
    for (let i = 0; i < e.target.files.length; i++) {
      formData.append('files', e.target.files[i]);
    }
    uploadMutation.mutate(formData);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Helper to determine step status
  const getStepInfo = (stepName: string) => {
    const expectedStepsOrder = ['list_document_files', 'process_single_document', 'embed_batch', 'save_vector_store'];
    const filtered = steps.filter(s => s.name === stepName);
    const stepData = filtered.find(s => s.status === 'RUNNING') || filtered[filtered.length - 1];

    let isComp = false;
    let isActive = false;
    
    if (stepData) {
      isComp = stepData.status === 'COMPLETED' || stepData.status === 'SUCCESS';
      isActive = stepData.status === 'RUNNING';
      
      const stepIdx = expectedStepsOrder.indexOf(stepName);
      const currentOverallIdx = expectedStepsOrder.findIndex(name => {
        const s = steps.filter(x => x.name === name).find(x => x.status === 'RUNNING') || steps.filter(x => x.name === name).pop();
        return s && s.status === 'RUNNING';
      });
      if (currentOverallIdx > stepIdx) isComp = true;
    }

    if (syncStatus === 'SUCCESS') {
      isComp = true;
      isActive = false;
    }

    return { stepData, isComp, isActive, allSteps: filtered };
  };

  const timelineDefs = [
    { id: 'list_document_files', label: 'Scanning Library' },
    { id: 'process_single_document', label: 'Gathering Document' },
    { id: 'embed_batch', label: 'Calibrating Neural Embeddings' },
    { id: 'save_vector_store', label: 'Committing Knowledge Store' }
  ];

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        
        {/* Action Bar: surface-container bg */}
        <div className="bg-[#eceef0] dark:bg-[#1d2027] border border-[#c2c6d6] dark:border-[#424754] rounded-2xl p-8 flex items-center justify-between transition-colors duration-300">
          <div>
            <h3 className="text-2xl font-semibold mb-2 text-[#191c1e] dark:text-[#e1e2ec]">Knowledge Base Management</h3>
            <p className="text-base text-[#424754] dark:text-[#8c909f]">Upload your PDFs to durably index them into the local vector store.</p>
          </div>

          <input type="file" ref={fileInputRef} onChange={handleUpload} multiple accept=".pdf" className="hidden" />

          <Tooltip content="Select PDF files to add to your knowledge base" position="left">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={syncStatus !== 'IDLE' && syncStatus !== 'SUCCESS' && syncStatus !== 'ERROR'}
              className="flex items-center gap-3 bg-[#a855f7] hover:bg-[#9333ea] disabled:opacity-50 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-[#a855f7]/25 hover:shadow-[#a855f7]/40 transition-all"
            >
              {syncStatus === 'UPLOADING' ? <Loader2 className="animate-spin" size={20} /> : <UploadCloud size={20} />}
              {syncStatus === 'UPLOADING' ? 'Uploading...' : 'Upload Documents'}
            </button>
          </Tooltip>
        </div>

        {/* Sync Progress */}
        {(syncStatus === 'SYNCING' || syncStatus === 'SUCCESS') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#eceef0] dark:bg-[#1d2027] border border-[#c2c6d6] dark:border-[#424754] rounded-2xl p-10 transition-colors duration-300"
          >
            <div className="flex items-center gap-4 mb-10">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                syncStatus === 'SUCCESS'
                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                  : 'bg-[#d0e1fb] dark:bg-[#32353c] text-[#0058be] dark:text-[#adc6ff] border border-[#c2c6d6] dark:border-[#424754]'
              }`}>
                <Database size={24} />
              </div>
              <div>
                <h3 className="text-3xl font-bold tracking-tight text-[#191c1e] dark:text-[#e1e2ec]">
                  {syncStatus === 'SUCCESS' ? 'Knowledge Sync Complete' : 'Processing Engine Active...'}
                </h3>
                <p className="text-[#424754] dark:text-[#8c909f] text-base">DBOS Durable Workflow is safely processing your documents.</p>
              </div>
            </div>

            <div className="relative pl-6 ml-4 border-l-2 border-[#c2c6d6] dark:border-[#424754] flex flex-col gap-8">
              {timelineDefs.map(({ id, label }) => {
                const { stepData, isComp, isActive, allSteps } = getStepInfo(id);
                let subtext = isComp ? 'Process verified' : (isActive ? 'Running...' : 'Waiting...');
                if (id === 'process_single_document' && stepData) {
                  try {
                    const output = typeof stepData.output === 'string' ? JSON.parse(stepData.output) : stepData.output;
                    const filename = (output && output.length > 0) ? output[0].source : 'Checking file...';
                    subtext = isComp ? `Extracted ${filename}` : `Reading pages... (${allSteps.indexOf(stepData) + 1} of ${allSteps.length})`;
                  } catch (e) { /* ignore */ }
                }
                if (id === 'embed_batch' && stepData && isActive) {
                  subtext = `Calibrating batch ${allSteps.indexOf(stepData) + 1} of ${allSteps.length}...`;
                }
                return (
                  <div key={id} className={`relative flex items-center gap-6 ${isComp ? 'opacity-100' : isActive ? 'opacity-100' : 'opacity-40'}`}>
                    {/* Timeline dot: surface-container-low bg so it masks the line */}
                    <div className="absolute -left-[35px] bg-[#f2f4f6] dark:bg-[#191b23] rounded-full p-1 transition-colors duration-300">
                      {isComp ? (
                        <CheckCircle2 size={24} className="text-emerald-500" />
                      ) : isActive ? (
                        <Loader2 size={24} className="text-[#0058be] dark:text-[#adc6ff] animate-spin" />
                      ) : (
                        <Circle size={24} className="text-[#727785] dark:text-[#424754]" />
                      )}
                    </div>
                    <div>
                      <h4 className={`text-xl font-semibold ${
                        isComp ? 'text-[#191c1e] dark:text-[#e1e2ec]'
                        : isActive ? 'text-[#0058be] dark:text-[#adc6ff]'
                        : 'text-[#727785] dark:text-[#8c909f]'
                      }`}>{label}</h4>
                      <p className="text-base text-[#424754] dark:text-[#8c909f]">{subtext}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

      </div>

      {/* Existing Files */}
      {kbFolders.length > 0 && syncStatus !== 'SYNCING' && syncStatus !== 'UPLOADING' && (
        <div className="max-w-4xl mx-auto mt-8 flex flex-col gap-6">
          <h3 className="text-2xl font-semibold text-[#191c1e] dark:text-[#e1e2ec]">Current Libraries</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {kbFolders.map((f, i) => {
              const allFiles = f.subfolders?.flatMap((s: any) => s.files) || [];
              const isExpanded = expandedFolder === f.name;
              return (
                <div
                  key={i}
                  onClick={() => setExpandedFolder(isExpanded ? null : f.name)}
                  className="bg-[#ffffff] dark:bg-[#1d2027] border border-[#c2c6d6] dark:border-[#424754] rounded-2xl p-6 transition-all hover:border-[#a855f7] dark:hover:border-[#a855f7] cursor-pointer flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-[#d0e1fb] dark:bg-[#32353c] flex items-center justify-center text-[#0058be] dark:text-[#adc6ff]">
                      <Database size={24} />
                    </div>
                  </div>
                  <h4 className="text-xl font-bold mb-2 text-[#191c1e] dark:text-[#e1e2ec]">{f.name}</h4>
                  <p className="text-base text-[#424754] dark:text-[#8c909f] mb-6">{f.description}</p>
                  <div className="flex items-center justify-between text-sm text-[#727785] dark:text-[#8c909f] font-medium mb-4">
                    <span>{allFiles.length} Documents</span>
                    <span>{f.updated}</span>
                  </div>
                  {isExpanded && allFiles.length > 0 && (
                    <div className="mt-2 pt-4 border-t border-[#c2c6d6] dark:border-[#424754] flex flex-col gap-3">
                      {allFiles.map((file: any, fileIdx: number) => (
                        <div key={fileIdx} className="flex items-center justify-between bg-[#f2f4f6] dark:bg-[#272a31] p-3 rounded-lg border border-[#c2c6d6] dark:border-[#424754]">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <span className="text-[#0058be] dark:text-[#adc6ff] bg-[#d0e1fb] dark:bg-[#32353c] p-1.5 rounded-md">📄</span>
                            <span className="text-base text-[#191c1e] dark:text-[#c2c6d6] truncate">{file.name}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-[#727785] dark:text-[#8c909f] shrink-0">
                            <span>{file.size}</span>
                            <Tooltip content="Remove this document from knowledge base" position="top">
                              <button
                                onClick={(e) => handleDelete(e, file.name)}
                                className="text-[#8c909f] hover:text-red-500 transition-colors p-1"
                              >
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

    </div>
  );
}
