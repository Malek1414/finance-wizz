import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bankApi } from '../../api/client';
import { BankTransaction } from '../../types';
import TransactionTable from './TransactionTable';
import { Upload, FileText, CheckCircle, AlertCircle, ArrowRight, X, Database } from 'lucide-react';

type Stage = 'upload' | 'review' | 'imported';

export default function BankUpload() {
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<Stage>('upload');
  const [pendingTransactions, setPendingTransactions] = useState<BankTransaction[]>([]);
  const [fileName, setFileName] = useState('');
  const [importResult, setImportResult] = useState<{ imported: number } | null>(null);

  const { data: existingData } = useQuery({
    queryKey: ['bank-transactions'],
    queryFn: () => bankApi.getTransactions({ limit: 50 })
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => bankApi.uploadPDF(file),
    onSuccess: (data) => {
      setPendingTransactions(data.transactions);
      setStage('review');
    }
  });

  const importMutation = useMutation({
    mutationFn: (transactions: BankTransaction[]) => bankApi.importTransactions(transactions),
    onSuccess: (data) => {
      setImportResult({ imported: data.imported });
      setStage('imported');
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['insights'] });
    }
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setFileName(file.name);
    uploadMutation.mutate(file);
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024
  });

  const handleUpdateTransaction = (id: string, updates: Partial<BankTransaction>) => {
    setPendingTransactions(prev =>
      prev.map(t => t.id === id ? { ...t, ...updates } : t)
    );
  };

  const handleImport = () => {
    importMutation.mutate(pendingTransactions);
  };

  const handleReset = () => {
    setStage('upload');
    setPendingTransactions([]);
    setFileName('');
    setImportResult(null);
    uploadMutation.reset();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-700/30">
        <h2 className="text-lg font-semibold text-slate-100">Bank Statement Import</h2>
        <p className="text-xs text-slate-500">Upload PDF bank statements for AI-powered transaction categorization</p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* Progress indicator */}
        <div className="flex items-center gap-3 mb-6">
          {(['upload', 'review', 'imported'] as Stage[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                stage === s
                  ? 'bg-emerald-500 text-white'
                  : ['review', 'imported'].indexOf(stage) > i
                    ? 'bg-emerald-500/30 text-emerald-400'
                    : 'bg-zinc-800 text-slate-400'
              }`}>
                {['review', 'imported'].indexOf(stage) > i ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-sm capitalize hidden sm:block ${stage === s ? 'text-slate-200' : 'text-slate-500'}`}>
                {s}
              </span>
              {i < 2 && <ArrowRight className="w-4 h-4 text-slate-600" />}
            </div>
          ))}
        </div>

        {/* Upload Stage */}
        {stage === 'upload' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div
              {...getRootProps()}
              className={`relative border-2 border-dashed rounded-2xl p-14 text-center cursor-pointer transition-all duration-300 overflow-hidden
                ${isDragActive
                  ? 'border-emerald-400 bg-emerald-500/10 scale-[1.01]'
                  : 'border-zinc-700/60 hover:border-zinc-600 hover:bg-zinc-900/40 bg-zinc-900/20'
                }`}
            >
              {/* Background glow on drag */}
              {isDragActive && (
                <div className="absolute inset-0 bg-gradient-radial from-emerald-500/10 to-transparent pointer-events-none" />
              )}
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-5 relative z-10">
                {uploadMutation.isPending ? (
                  <>
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                      <div className="absolute inset-2 border-2 border-emerald-500/10 border-b-emerald-400/60 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
                    </div>
                    <div>
                      <p className="text-slate-100 font-semibold text-lg">Analysing with AI...</p>
                      <p className="text-slate-400 text-sm mt-1">Parsing PDF and categorising transactions</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={`w-18 h-18 p-5 rounded-2xl border transition-colors duration-300 ${
                      isDragActive ? 'bg-emerald-500/20 border-emerald-500/40' : 'bg-zinc-900 border-zinc-800'
                    }`}>
                      <Upload className={`w-8 h-8 transition-colors duration-300 ${isDragActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <p className={`font-semibold text-lg transition-colors duration-200 ${isDragActive ? 'text-emerald-300' : 'text-slate-200'}`}>
                        {isDragActive ? 'Release to upload' : 'Drop your PDF bank statement'}
                      </p>
                      <p className="text-slate-500 text-sm mt-1">or <span className="text-slate-300 underline underline-offset-2">click to browse</span></p>
                      <p className="text-slate-600 text-xs mt-3">German bank formats supported · Max 10 MB</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap justify-center">
                      {['Sparkasse', 'Deutsche Bank', 'ING', 'Commerzbank'].map(bank => (
                        <span key={bank} className="flex items-center gap-1.5 text-xs text-zinc-500 bg-zinc-900/60 border border-zinc-800/40 px-2.5 py-1 rounded-full">
                          <FileText className="w-3 h-3" /> {bank}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {uploadMutation.error && (
              <div className="glass-card p-4 flex items-center gap-3 border-rose-500/30">
                <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                <div>
                  <p className="text-rose-400 font-medium text-sm">Upload failed</p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {(uploadMutation.error as any)?.response?.data?.error || 'Please try again'}
                  </p>
                </div>
              </div>
            )}

            {/* Existing transactions count */}
            {existingData && existingData.total > 0 && (
              <div className="glass-card p-4 flex items-center gap-3">
                <Database className="w-5 h-5 text-sky-400 flex-shrink-0" />
                <div>
                  <p className="text-slate-200 text-sm font-medium">{existingData.total} transactions in database</p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Upload another statement to add more transactions
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Review Stage */}
        {stage === 'review' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="glass-card px-3 py-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-slate-300">{fileName}</span>
                </div>
                <span className="text-sm text-slate-400">
                  {pendingTransactions.length} transactions found
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleReset} className="btn-secondary flex items-center gap-2 text-sm py-1.5">
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={importMutation.isPending}
                  className="btn-primary flex items-center gap-2 text-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  {importMutation.isPending ? 'Importing...' : `Import ${pendingTransactions.length} Transactions`}
                </button>
              </div>
            </div>

            <div className="glass-card p-3 flex items-center gap-2 text-sm text-slate-400">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              Review and correct AI-suggested categories before importing. Click category dropdowns to change.
            </div>

            <TransactionTable
              transactions={pendingTransactions}
              onUpdate={handleUpdateTransaction}
              isEditable
            />
          </div>
        )}

        {/* Imported Stage */}
        {stage === 'imported' && importResult && (
          <div className="max-w-lg mx-auto text-center space-y-6 py-8">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-100">{importResult.imported} Transactions Imported!</h3>
              <p className="text-slate-400 mt-2">Your bank statement has been successfully processed and saved.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={handleReset} className="btn-secondary flex items-center justify-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Another
              </button>
              <button
                onClick={() => setStage('review')}
                className="btn-primary flex items-center justify-center gap-2"
              >
                View Imported
              </button>
            </div>
          </div>
        )}

        {/* Existing transactions (when on upload stage) */}
        {stage === 'upload' && existingData && existingData.transactions.length > 0 && (
          <div className="max-w-2xl mx-auto mt-8">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Recent Transactions</h3>
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
      </div>
    </div>
  );
}
