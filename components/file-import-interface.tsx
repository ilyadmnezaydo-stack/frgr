'use client';

import React, { useState, useCallback } from 'react';
import UploadView from '@/components/mapper/UploadView';
import AnalyzingView from '@/components/mapper/AnalyzingView';
import MappingView from '@/components/mapper/MappingView';
import { AppState, AnalysisResult, TARGET_FIELDS, ColumnMapping } from '@/types/mapper';

export default function FileImportInterface() {
  const [step, setStep] = useState<AppState>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const handleFileUpload = useCallback((uploadedFile: File) => {
    setFile(uploadedFile);
    setIsTransitioning(true);

    // UI transition
    setTimeout(() => {
      setStep('analyzing');
      setIsTransitioning(false);
      // Trigger actual analysis
      performAnalysis(uploadedFile);
    }, 500);
  }, []);

  const performAnalysis = async (fileToAnalyze: File) => {
    try {
      const formData = new FormData();
      formData.append('file', fileToAnalyze);

      const response = await fetch('/api/file-import/analyze', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        // Transform API response to UI model
        const mappingsRecord: Record<string, ColumnMapping> = {};
        data.analysis.suggestedMappings.forEach((m: any) => {
          mappingsRecord[m.sourceField] = {
            targetField: m.targetField,
            confidence: m.confidence
          };
        });

        const result: AnalysisResult = {
          fileName: fileToAnalyze.name,
          totalRows: data.analysis.sampleData.length, // approximation or get from API
          sourceColumns: data.analysis.columns,
          targetSchema: TARGET_FIELDS.map(f => f.value).filter(v => v !== 'skip'),
          suggestedMapping: mappingsRecord,
          sampleData: data.analysis.sampleData
        };

        // Transition to mapping view
        setAnalysisResult(result);
        setIsTransitioning(true);
        setTimeout(() => {
          setStep('mapping');
          setIsTransitioning(false);
        }, 500);
      } else {
        console.error('Analysis failed:', data.error);
        // Handle error (maybe go back to upload with error message)
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleBack = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setStep('upload');
      setFile(null);
      setAnalysisResult(null);
      setImportResult(null);
      setIsTransitioning(false);
    }, 500);
  }, []);

  const handleImport = async (mappings: any[]) => {
    if (!file) return;

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mappings', JSON.stringify(mappings));
      formData.append('dryRun', 'false'); // Always real import for this UI Flow

      const response = await fetch('/api/file-import/import', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setImportResult(data.result);
      } else {
        // Mock error result for modal
        setImportResult({
          success: false,
          importedRows: 0,
          errors: [data.error || 'Unknown error'],
          warnings: []
        });
      }
    } catch (error) {
      console.error('Import error', error);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-page relative overflow-hidden">
      {/* Background container to ensure orbs are fixed relative to viewport */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="orb-purple w-[600px] h-[600px] -top-[300px] -left-[200px] opacity-40" />
        <div className="orb-violet w-[400px] h-[400px] top-1/3 -right-[150px] opacity-30" />
        <div className="orb-purple w-[300px] h-[300px] bottom-[10%] left-[10%] opacity-20" />
      </div>

      <div className="relative z-10 font-sans">
        {step === 'upload' && (
          <UploadView
            onFileUpload={handleFileUpload}
            isExiting={isTransitioning}
          />
        )}

        {step === 'analyzing' && file && (
          <AnalyzingView
            fileName={file.name}
            rowCount={0} // We don't know yet until analysis done
            isExiting={isTransitioning}
          />
        )}

        {step === 'mapping' && analysisResult && (
          <MappingView
            data={analysisResult}
            onBack={handleBack}
            isEntering={!isTransitioning}
            onImport={handleImport}
            isImporting={isImporting}
            importResult={importResult}
          />
        )}
      </div>
    </div>
  );
}
