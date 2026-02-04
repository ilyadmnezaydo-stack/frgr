'use client';

import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, Sparkles, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface MappingResult {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    company?: string;
}

interface ContactData {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    company?: string;
}

interface LogEntry {
    id: number;
    type: 'info' | 'success' | 'error' | 'warning';
    message: string;
    timestamp: Date;
}

type Step = 'upload' | 'mapping' | 'confirm' | 'importing' | 'complete';

export default function SmartImporter() {
    const [currentStep, setCurrentStep] = useState<Step>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [headers, setHeaders] = useState<string[]>([]);
    const [sampleRow, setSampleRow] = useState<Record<string, any>>({});
    const [allRows, setAllRows] = useState<any[]>([]);
    const [mapping, setMapping] = useState<MappingResult>({});
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [importResult, setImportResult] = useState<any>(null);
    const [isDragging, setIsDragging] = useState(false);

    const addLog = useCallback((type: LogEntry['type'], message: string) => {
        setLogs((prev) => [
            ...prev,
            {
                id: Date.now() + Math.random(),
                type,
                message,
                timestamp: new Date(),
            },
        ]);
    }, []);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            processFile(droppedFile);
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            processFile(selectedFile);
        }
    };

    const processFile = async (selectedFile: File) => {
        // Validate file type
        if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
            addLog('error', 'Invalid file type. Please upload an Excel or CSV file.');
            return;
        }

        setFile(selectedFile);
        setLogs([]);
        addLog('info', `📁 File loaded: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(2)} KB)`);

        setIsProcessing(true);

        try {
            // Parse Excel file
            const arrayBuffer = await selectedFile.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

            if (jsonData.length === 0) {
                addLog('error', 'The Excel file is empty. Please upload a file with data.');
                setIsProcessing(false);
                return;
            }

            const extractedHeaders = Object.keys(jsonData[0] as object);
            const firstRow = jsonData[0] as Record<string, any>;

            setHeaders(extractedHeaders);
            setSampleRow(firstRow);
            setAllRows(jsonData);

            addLog('success', `✅ Parsed ${jsonData.length} rows with ${extractedHeaders.length} columns`);
            addLog('info', `📊 Headers detected: ${extractedHeaders.join(', ')}`);

            // Automatically trigger AI mapping
            await performAIMapping(extractedHeaders, firstRow);

        } catch (error) {
            console.error('Error parsing file:', error);
            addLog('error', `❌ Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setIsProcessing(false);
        }
    };

    const performAIMapping = async (fileHeaders: string[], sample: Record<string, any>) => {
        addLog('info', '🤖 Asking AI to analyze column structure...');
        setCurrentStep('mapping');

        try {
            const response = await fetch('/api/ai-mapper', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    headers: fileHeaders,
                    sampleRow: sample,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                addLog('error', `❌ AI mapping failed: ${data.error}`);
                if (data.details) {
                    addLog('warning', `💡 ${data.details}`);
                }
                setIsProcessing(false);
                return;
            }

            setMapping(data.mapping);
            addLog('success', `✅ ${data.aiThinking}`);

            // Show mapping results
            const mappedFields = Object.keys(data.mapping);
            if (mappedFields.length > 0) {
                mappedFields.forEach((field) => {
                    const columnName = data.mapping[field];
                    const fieldLabel = field.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
                    addLog('info', `   → ${fieldLabel}: Found in column "${columnName}"`);
                });
            } else {
                addLog('warning', '⚠️ AI could not confidently map any fields. Please try a different file.');
            }

            setCurrentStep('confirm');
            setIsProcessing(false);

        } catch (error) {
            console.error('AI mapping error:', error);
            addLog('error', `❌ Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            addLog('warning', '💡 Make sure Ollama is running with: ollama serve');
            setIsProcessing(false);
        }
    };

    const handleConfirmImport = async () => {
        if (Object.keys(mapping).length === 0) {
            addLog('error', '❌ No field mappings available. Cannot proceed with import.');
            return;
        }

        setCurrentStep('importing');
        setIsProcessing(true);
        addLog('info', `🚀 Starting import of ${allRows.length} contacts...`);

        try {
            // Send raw rows and mapping to backend
            // Backend will handle transformation and unmapped columns
            const response = await fetch('/api/import-contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rows: allRows,
                    mapping: mapping
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                addLog('error', `❌ Import failed: ${data.error}`);
                setIsProcessing(false);
                return;
            }

            setImportResult(data.result);
            addLog('success', `✅ Import complete!`);
            addLog('info', `   → ${data.result.successful} contacts imported successfully`);

            if (data.result.failed > 0) {
                addLog('warning', `   → ${data.result.failed} contacts failed to import`);
                data.result.errors.slice(0, 5).forEach((error: string) => {
                    addLog('error', `   → ${error}`);
                });
            }

            setCurrentStep('complete');
            setIsProcessing(false);

        } catch (error) {
            console.error('Import error:', error);
            addLog('error', `❌ Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setIsProcessing(false);
        }
    };

    const handleReset = () => {
        setCurrentStep('upload');
        setFile(null);
        setHeaders([]);
        setSampleRow({});
        setAllRows([]);
        setMapping({});
        setLogs([]);
        setImportResult(null);
        setIsProcessing(false);
    };

    const getStepStatus = (step: Step) => {
        const steps: Step[] = ['upload', 'mapping', 'confirm', 'importing', 'complete'];
        const currentIndex = steps.indexOf(currentStep);
        const stepIndex = steps.indexOf(step);

        if (stepIndex < currentIndex) return 'complete';
        if (stepIndex === currentIndex) return 'active';
        return 'pending';
    };

    return (
        <div className="min-h-screen bg-background text-foreground p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12 animate-fade-in">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <Sparkles className="w-10 h-10 text-primary animate-pulse-slow" />
                        <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                            Smart CRM Importer
                        </h1>
                    </div>
                    <p className="text-muted-foreground text-lg">
                        AI-powered Excel import with intelligent column mapping
                    </p>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center justify-between mb-12 max-w-2xl mx-auto">
                    {(['upload', 'mapping', 'confirm', 'complete'] as const).map((step, index) => {
                        const status = getStepStatus(step);
                        const labels = {
                            upload: 'Upload',
                            mapping: 'AI Mapping',
                            confirm: 'Review',
                            complete: 'Complete',
                        };

                        return (
                            <div key={step} className="flex items-center">
                                <div className="flex flex-col items-center">
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${status === 'complete'
                                            ? 'bg-accent text-accent-foreground'
                                            : status === 'active'
                                                ? 'bg-primary text-primary-foreground animate-pulse'
                                                : 'bg-muted text-muted-foreground'
                                            }`}
                                    >
                                        {status === 'complete' ? (
                                            <CheckCircle2 className="w-6 h-6" />
                                        ) : (
                                            index + 1
                                        )}
                                    </div>
                                    <span className="text-xs mt-2 text-muted-foreground">{labels[step]}</span>
                                </div>
                                {index < 3 && (
                                    <div
                                        className={`h-0.5 w-16 mx-2 transition-all ${status === 'complete' ? 'bg-accent' : 'bg-muted'
                                            }`}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Panel - Upload/Actions */}
                    <div className="space-y-6">
                        {currentStep === 'upload' && (
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`border-2 border-dashed rounded-lg p-12 text-center transition-all cursor-pointer ${isDragging
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border hover:border-primary/50 hover:bg-secondary/50'
                                    }`}
                            >
                                <input
                                    type="file"
                                    id="file-upload"
                                    className="hidden"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={handleFileInput}
                                />
                                <label htmlFor="file-upload" className="cursor-pointer">
                                    <Upload className="w-16 h-16 mx-auto mb-4 text-primary" />
                                    <h3 className="text-xl font-semibold mb-2">Drop Excel file here</h3>
                                    <p className="text-muted-foreground mb-4">or click to browse</p>
                                    <p className="text-sm text-muted-foreground">Supports .xlsx, .xls, .csv</p>
                                </label>
                            </div>
                        )}

                        {file && currentStep !== 'upload' && (
                            <div className="bg-secondary border border-border rounded-lg p-6">
                                <div className="flex items-start gap-4">
                                    <FileSpreadsheet className="w-12 h-12 text-accent flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-lg mb-1 truncate">{file.name}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {allRows.length} rows • {headers.length} columns
                                        </p>

                                        {Object.keys(mapping).length > 0 && (
                                            <div className="mt-4 space-y-2">
                                                <h4 className="text-sm font-semibold text-accent">Detected Mappings:</h4>
                                                {Object.entries(mapping).map(([field, column]) => (
                                                    <div key={field} className="text-sm">
                                                        <span className="text-muted-foreground">
                                                            {field.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}:
                                                        </span>
                                                        <span className="ml-2 text-foreground font-medium">{column}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentStep === 'confirm' && !isProcessing && (
                            <button
                                onClick={handleConfirmImport}
                                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-4 px-6 rounded-lg transition-all shadow-lg hover:shadow-accent/50"
                            >
                                ✅ Confirm & Import {allRows.length} Contacts
                            </button>
                        )}

                        {currentStep === 'complete' && (
                            <div className="space-y-4">
                                <div className="bg-accent/10 border border-accent rounded-lg p-6 text-center">
                                    <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-accent" />
                                    <h3 className="text-2xl font-bold mb-2">Import Complete!</h3>
                                    {importResult && (
                                        <div className="text-lg">
                                            <p className="text-accent font-semibold">
                                                {importResult.successful} / {importResult.total} contacts imported
                                            </p>
                                            {importResult.failed > 0 && (
                                                <p className="text-orange-400 text-sm mt-2">
                                                    {importResult.failed} failed
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={handleReset}
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-6 rounded-lg transition-all"
                                >
                                    Import Another File
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Right Panel - Terminal Logs */}
                    <div className="bg-secondary border border-border rounded-lg p-6 h-[600px] flex flex-col">
                        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                            </div>
                            <span className="text-sm font-mono text-muted-foreground ml-2">terminal.log</span>
                        </div>

                        <div className="flex-1 overflow-y-auto font-mono text-sm space-y-2">
                            {logs.length === 0 ? (
                                <p className="text-muted-foreground italic">Waiting for file upload...</p>
                            ) : (
                                logs.map((log) => (
                                    <div
                                        key={log.id}
                                        className={`animate-slide-up ${log.type === 'success'
                                            ? 'text-accent'
                                            : log.type === 'error'
                                                ? 'text-red-400'
                                                : log.type === 'warning'
                                                    ? 'text-yellow-400'
                                                    : 'text-foreground'
                                            }`}
                                    >
                                        <span className="text-muted-foreground text-xs">
                                            [{log.timestamp.toLocaleTimeString()}]
                                        </span>{' '}
                                        {log.message}
                                    </div>
                                ))
                            )}
                            {isProcessing && (
                                <div className="flex items-center gap-2 text-primary">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Processing...</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
