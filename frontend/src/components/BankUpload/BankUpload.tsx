import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { bankApi } from '../../api/client';
import { BankTransaction } from '../../types';
import TransactionTable from './TransactionTable';
import { useStreamingUpload } from '../../hooks/useStreamingUpload';
import { Upload, FileText, CheckCircle, AlertCircle, X, Database, Trash2, Loader2 } from 'lucide-react';
import { B, grad } from '../../design';

type Stage = 'upload' | 'review' | 'imported';

const STAGES: Stage[] = ['upload', 'review', 'imported'];
const STAGE_LABELS: Record<Stage, string> = {
  upload: 'Upload',
  review: 'Review',
  imported: 'Done',
};

export default function BankUpload() {
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<Stage>('upload');
  const [fileName, setFileName] = useState('');
  const [importResult, setImportResult] = useState<{ imported: number } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const { data: existingData } = useQuery({
    queryKey: ['bank-transactions'],
    queryFn: () => bankApi.getTransactions({ limit: 50 }),
  });

  const {
    transactions,
    isStreaming,
    aiRemaining,
    error: streamError,
    startUpload,
    updateTransaction,
    reset: resetStream,
  } = useStreamingUpload();

  useEffect(() => {
    if (transactions.length > 0 && stage === 'upload') {
      setStage('review');
    }
  }, [transactions.length, stage]);

  const importMutation = useMutation({
    mutationFn: (txns: BankTransaction[]) => bankApi.importTransactions(txns),
    onSuccess: (data) => {
      setImportResult({ imported: data.imported });
      setStage('imported');
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['insights'] });
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => bankApi.clearTransactions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['insights'] });
      setConfirmClear(false);
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setFileName(file.name);
    startUpload(file);
  }, [startUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handleImport = () => importMutation.mutate(transactions);

  const handleReset = () => {
    setStage('upload');
    setFileName('');
    setImportResult(null);
    resetStream();
  };

  const isParsing = isStreaming && transactions.length === 0;
  const currentStageIndex = STAGES.indexOf(stage);

  return (
    <div style={{ padding: '32px 32px 64px', maxWidth: 1100, margin: '0 auto' }}>

      {/* Page heading */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{ marginBottom: 32 }}
      >
        <h2
          className="iridescent-text"
          style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', margin: 0, lineHeight: 1 }}
        >
          Bank Statement Import
        </h2>
        <p style={{ fontSize: 13, color: B.textMute, marginTop: 8, margin: '8px 0 0' }}>
          Upload a PDF bank statement for AI-powered transaction categorization
        </p>
      </motion.div>

      {/* Step indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 36 }}>
        {STAGES.map((s, i) => {
          const isDone = currentStageIndex > i;
          const isActive = stage === s;
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  background: isDone
                    ? grad.income
                    : isActive
                    ? grad.aurora
                    : 'rgba(255,255,255,0.06)',
                  color: isDone || isActive ? 'oklch(11% 0.012 265)' : B.textMute,
                  flexShrink: 0,
                  transition: 'all 0.3s ease',
                }}
              >
                {isDone ? <CheckCircle style={{ width: 14, height: 14 }} /> : i + 1}
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: isActive ? B.text : B.textMute, transition: 'color 0.2s' }}>
                {STAGE_LABELS[s]}
              </span>
              {i < STAGES.length - 1 && (
                <div style={{ width: 32, height: 1, background: isDone ? grad.income : 'rgba(255,255,255,0.08)', transition: 'background 0.3s ease', marginLeft: 4, marginRight: 4 }} />
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">

        {/* ── Upload Stage ───────────────────────────────────────────────────── */}
        {stage === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            {/* Drop zone */}
            <div
              {...getRootProps()}
              style={{
                position: 'relative',
                borderRadius: 24,
                padding: '60px 40px',
                textAlign: 'center',
                cursor: 'pointer',
                border: `2px dashed ${isDragActive ? B.aurora : 'rgba(255,255,255,0.12)'}`,
                background: isDragActive
                  ? 'oklch(85% 0.12 220 / 0.06)'
                  : 'rgba(255,255,255,0.02)',
                backdropFilter: 'blur(40px)',
                transition: 'all 0.25s ease',
                transform: isDragActive ? 'scale(1.01)' : 'scale(1)',
              }}
            >
              <input {...getInputProps()} />

              {/* Drag glow overlay */}
              {isDragActive && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 22,
                    background: 'radial-gradient(ellipse at center, oklch(85% 0.12 220 / 0.08) 0%, transparent 70%)',
                    pointerEvents: 'none',
                  }}
                />
              )}

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, position: 'relative', zIndex: 1 }}>
                {isParsing ? (
                  <>
                    <div style={{ position: 'relative', width: 64, height: 64 }}>
                      <div style={{
                        width: 64, height: 64,
                        borderRadius: '50%',
                        border: '3px solid rgba(255,255,255,0.08)',
                        borderTopColor: B.aurora,
                        animation: 'spin 0.9s linear infinite',
                        position: 'absolute',
                      }} />
                      <div style={{
                        width: 48, height: 48,
                        borderRadius: '50%',
                        border: '2px solid rgba(255,255,255,0.05)',
                        borderBottomColor: B.violet,
                        animation: 'spin 0.6s linear infinite reverse',
                        position: 'absolute',
                        top: 8, left: 8,
                      }} />
                    </div>
                    <div>
                      <p style={{ color: B.text, fontWeight: 700, fontSize: 18, margin: 0 }}>Parsing PDF...</p>
                      <p style={{ color: B.textMute, fontSize: 13, marginTop: 6, margin: '6px 0 0' }}>
                        Extracting transactions from {fileName}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        width: 72, height: 72,
                        borderRadius: 22,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isDragActive ? 'oklch(85% 0.12 220 / 0.15)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${isDragActive ? 'oklch(85% 0.12 220 / 0.4)' : 'rgba(255,255,255,0.08)'}`,
                        transition: 'all 0.25s ease',
                      }}
                    >
                      <Upload
                        style={{
                          width: 28, height: 28,
                          color: isDragActive ? B.aurora : B.textMute,
                          transition: 'color 0.25s ease',
                        }}
                      />
                    </div>
                    <div>
                      <p style={{ fontSize: 18, fontWeight: 700, color: isDragActive ? B.aurora : B.text, margin: 0, transition: 'color 0.2s' }}>
                        {isDragActive ? 'Release to upload' : 'Drop your PDF bank statement'}
                      </p>
                      <p style={{ fontSize: 13, color: B.textMute, marginTop: 8, margin: '8px 0 0' }}>
                        or <span style={{ color: B.textDim, textDecoration: 'underline', textUnderlineOffset: 3 }}>click to browse</span>
                      </p>
                      <p style={{ fontSize: 11, color: B.textMute, marginTop: 10, opacity: 0.7, margin: '10px 0 0' }}>
                        German bank formats supported · Max 10 MB
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {['Sparkasse', 'Deutsche Bank', 'ING', 'Commerzbank'].map(bank => (
                        <span
                          key={bank}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 11,
                            color: B.textMute,
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.07)',
                            padding: '4px 12px',
                            borderRadius: 999,
                          }}
                        >
                          <FileText style={{ width: 10, height: 10 }} />
                          {bank}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Error */}
            {streamError && (
              <div style={{
                padding: '14px 18px',
                borderRadius: 16,
                background: 'oklch(72% 0.16 22 / 0.08)',
                border: '1px solid oklch(72% 0.16 22 / 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <AlertCircle style={{ width: 18, height: 18, color: B.rose, flexShrink: 0 }} />
                <div>
                  <p style={{ color: B.rose, fontWeight: 600, fontSize: 13, margin: 0 }}>Upload failed</p>
                  <p style={{ color: B.textMute, fontSize: 12, marginTop: 4, margin: '4px 0 0' }}>{streamError}</p>
                </div>
              </div>
            )}

            {/* Existing transactions card */}
            {existingData && existingData.total > 0 && (
              <div style={{
                padding: '16px 20px',
                borderRadius: 18,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Database style={{ width: 18, height: 18, color: B.aurora, flexShrink: 0 }} />
                  <div>
                    <p style={{ color: B.text, fontSize: 13, fontWeight: 600, margin: 0 }}>
                      {existingData.total} transactions in database
                    </p>
                    <p style={{ color: B.textMute, fontSize: 11, marginTop: 4, margin: '4px 0 0' }}>
                      Upload another statement to add more
                    </p>
                  </div>
                </div>
                {confirmClear ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: B.textMute }}>Are you sure?</span>
                    <button
                      onClick={() => clearMutation.mutate()}
                      disabled={clearMutation.isPending}
                      style={{
                        fontSize: 12, padding: '5px 12px', borderRadius: 10,
                        background: 'oklch(72% 0.16 22 / 0.15)',
                        border: '1px solid oklch(72% 0.16 22 / 0.4)',
                        color: B.rose, cursor: 'pointer',
                      }}
                    >
                      {clearMutation.isPending ? 'Clearing...' : 'Yes, clear'}
                    </button>
                    <button
                      onClick={() => setConfirmClear(false)}
                      style={{
                        fontSize: 12, padding: '5px 12px', borderRadius: 10,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: B.textMute, cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClear(true)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      fontSize: 12, padding: '6px 14px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: B.textMute, cursor: 'pointer', flexShrink: 0,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Trash2 style={{ width: 12, height: 12 }} />
                    Clear All
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Review Stage ───────────────────────────────────────────────────── */}
        {stage === 'review' && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 14px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <FileText style={{ width: 14, height: 14, color: B.aurora }} />
                  <span style={{ fontSize: 13, color: B.textDim }}>{fileName}</span>
                </div>
                <span style={{ fontSize: 13, color: B.textMute }}>{transactions.length} transactions found</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={handleReset} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <X style={{ width: 14, height: 14 }} />
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={importMutation.isPending || isStreaming}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                >
                  <CheckCircle style={{ width: 14, height: 14 }} />
                  {importMutation.isPending
                    ? 'Importing...'
                    : isStreaming
                    ? 'Classifying...'
                    : `Import ${transactions.length} Transactions`}
                </button>
              </div>
            </div>

            {/* AI progress bar */}
            {isStreaming && aiRemaining > 0 && (
              <div style={{
                padding: '12px 16px', borderRadius: 14,
                background: 'oklch(70% 0.14 290 / 0.06)',
                border: '1px solid oklch(70% 0.14 290 / 0.2)',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <Loader2 style={{ width: 16, height: 16, color: B.violet, flexShrink: 0, animation: 'spin 1s linear infinite' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: B.textDim, fontWeight: 600 }}>AI classifying transactions</span>
                    <span style={{ fontSize: 11, color: B.textMute }}>{aiRemaining} remaining</span>
                  </div>
                  <div style={{ height: 3, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <motion.div
                      style={{ height: '100%', borderRadius: 999, background: grad.mint }}
                      initial={{ width: '5%' }}
                      animate={{ width: `${Math.max(5, ((transactions.length - aiRemaining) / transactions.length) * 100)}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              </div>
            )}

            {!isStreaming && (
              <div style={{
                padding: '10px 16px', borderRadius: 12,
                background: 'oklch(82% 0.14 80 / 0.06)',
                border: '1px solid oklch(82% 0.14 80 / 0.2)',
                display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
              }}>
                <AlertCircle style={{ width: 14, height: 14, color: B.gold, flexShrink: 0 }} />
                <span style={{ color: B.textDim }}>
                  Review and correct AI-suggested categories before importing. Click category dropdowns to change.
                </span>
              </div>
            )}

            <TransactionTable transactions={transactions} onUpdate={updateTransaction} isEditable />
          </motion.div>
        )}

        {/* ── Imported Stage ─────────────────────────────────────────────────── */}
        {stage === 'imported' && importResult && (
          <motion.div
            key="imported"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', paddingTop: 40, paddingBottom: 40 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
              style={{
                width: 88, height: 88,
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px',
                background: 'oklch(80% 0.14 155 / 0.12)',
                border: '2px solid oklch(80% 0.14 155 / 0.3)',
                boxShadow: '0 0 40px oklch(80% 0.14 155 / 0.2)',
              }}
            >
              <CheckCircle style={{ width: 44, height: 44, color: B.mint }} />
            </motion.div>
            <h3 style={{ fontSize: 28, fontWeight: 800, color: B.text, margin: '0 0 12px', letterSpacing: '-0.03em' }}>
              {importResult.imported} Transactions Imported!
            </h3>
            <p style={{ color: B.textMute, fontSize: 14, lineHeight: 1.6, margin: '0 0 32px' }}>
              Your bank statement has been successfully processed and saved.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button onClick={handleReset} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Upload style={{ width: 15, height: 15 }} />
                Upload Another
              </button>
              <button onClick={() => setStage('review')} className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                View Imported
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Existing transactions preview (upload stage only) */}
      {stage === 'upload' && existingData && existingData.transactions.length > 0 && (
        <div style={{ maxWidth: 640, margin: '32px auto 0' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: B.textDim, marginBottom: 12 }}>Recent Transactions</h3>
          <TransactionTable
            transactions={existingData.transactions}
            onUpdate={async (id, updates) => {
              await bankApi.updateTransaction(id, updates);
              queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
            }}
            isEditable={false}
          />
        </div>
      )}

      {/* CSS for spin animation */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
