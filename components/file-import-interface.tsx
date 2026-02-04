'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Play,
  Eye,
  Database,
  Loader2
} from 'lucide-react';

interface FieldMapping {
  sourceField: string;
  targetField: string;
  confidence: number;
  transformation?: string;
  neuralReasoning?: string;
  neuralSuggestions?: string[];
  neuralInsights?: string[];
}

interface MappingResult {
  mappings: FieldMapping[];
  confidence: number;
  suggestions: string[];
  neuralInsights?: string[];
}

interface FileAnalysis {
  columns: string[];
  sampleData: any[];
  suggestedMappings: FieldMapping[];
  confidence: number;
}

interface ImportResult {
  success: boolean;
  totalRows: number;
  importedRows: number;
  errors: string[];
  warnings: string[];
  previewData?: any[];
}

export default function FileImportInterface() {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [analysis, setAnalysis] = useState<FileAnalysis | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [dragActive, setDragActive] = useState(false);

  // Обработка drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setAnalysis(null);
    setImportResult(null);
  };

  const analyzeFile = async () => {
    if (!file) return;

    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/file-import/analyze', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setAnalysis(data.analysis);
      } else {
        console.error('Analysis failed:', data.error);
      }
    } catch (error) {
      console.error('Error analyzing file:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const executeImport = async () => {
    if (!file || !analysis) return;

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mappings', JSON.stringify(analysis.suggestedMappings));
      formData.append('dryRun', dryRun.toString());

      const response = await fetch('/api/file-import/import', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setImportResult(data.result);
      } else {
        console.error('Import failed:', data.error);
      }
    } catch (error) {
      console.error('Error importing file:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Database className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold">Импорт данных в CRM</h1>
      </div>

      {/* Загрузка файла */}
      <Card>
        <CardHeader>
          <CardTitle>Загрузка файла</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
              }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />

            <div className="flex flex-col items-center space-y-4">
              <FileSpreadsheet className="h-12 w-12 text-gray-400" />

              {file ? (
                <div className="space-y-2">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    Выбрать другой файл
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-lg font-medium">Перетащите файл сюда</p>
                  <p className="text-sm text-gray-500">или</p>
                  <Button onClick={() => document.getElementById('file-upload')?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Выбрать файл
                  </Button>
                  <p className="text-xs text-gray-400">
                    Поддерживаются форматы: Excel (.xlsx, .xls) и CSV
                  </p>
                </div>
              )}
            </div>
          </div>

          {file && (
            <div className="mt-4">
              <Button
                onClick={analyzeFile}
                disabled={isAnalyzing}
                className="w-full"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Анализ файла...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Анализировать файл
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Результаты анализа */}
      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Результаты анализа
              <Badge variant="outline">
                Уверенность: {Math.round(analysis.confidence * 100)}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Найденные колонки ({analysis.columns.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.columns.map((col) => (
                    <Badge key={col} variant="secondary">
                      {col}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Предлагаемые сопоставления</h3>
                <div className="space-y-3">
                  {analysis.suggestedMappings.map((mapping, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-mono text-sm bg-gray-100 px-3 py-2 rounded-md shadow-sm">
                          {mapping.sourceField}
                        </span>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <span className="font-mono text-sm bg-blue-100 px-3 py-2 rounded-md shadow-sm">
                          {mapping.targetField}
                        </span>
                        <div className="flex-1" />
                        <Badge
                          className={`${getConfidenceColor(mapping.confidence)} text-white shadow-sm`}
                        >
                          {Math.round(mapping.confidence * 100)}%
                        </Badge>
                        {mapping.transformation && (
                          <Badge variant="outline" className="shadow-sm">
                            {mapping.transformation}
                          </Badge>
                        )}
                      </div>

                      {/* 🧠 Нейронные инсайты */}
                      {(mapping as any).neuralReasoning && (
                        <div className="mb-2 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-purple-600 font-semibold">🧠 Нейросеть:</span>
                          </div>
                          <div className="text-sm text-purple-700">
                            {(mapping as any).neuralReasoning}
                          </div>
                        </div>
                      )}

                      {/* 💡 Предложения */}
                      {(mapping as any).neuralSuggestions && (mapping as any).neuralSuggestions.length > 0 && (
                        <div className="mb-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-blue-600 font-semibold">💡 Предложения:</span>
                          </div>
                          <ul className="text-sm text-blue-700 space-y-1">
                            {(mapping as any).neuralSuggestions.map((suggestion, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-blue-500 mt-0.5">•</span>
                                <span>{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 📊 Инсайты */}
                      {(mapping as any).neuralInsights && (mapping as any).neuralInsights.length > 0 && (
                        <div className="p-2 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-green-600 font-semibold">📊 Инсайты:</span>
                          </div>
                          <ul className="text-sm text-green-700 space-y-1">
                            {(mapping as any).neuralInsights.map((insight, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-green-500 mt-0.5">•</span>
                                <span>{insight}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Нейронные инсайты */}
              {analysis.neuralInsights && analysis.neuralInsights.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">🧠 Нейронные инсайты</h3>
                  <div className="space-y-1">
                    {analysis.neuralInsights.map((insight, index) => (
                      <div key={index} className="p-2 bg-purple-50 rounded text-sm text-purple-700">
                        {insight}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2">Предпросмотр данных</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        {analysis.columns.map((col) => (
                          <th key={col} className="border border-gray-300 px-4 py-2 text-left text-sm">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.sampleData.map((row, index) => (
                        <tr key={index}>
                          {analysis.columns.map((col) => (
                            <td key={col} className="border border-gray-300 px-4 py-2 text-sm">
                              {row[col] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Импорт данных */}
      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle>Импорт данных</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="dryRun"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="dryRun" className="text-sm">
                Тестовый запуск (без реального импорта данных)
              </label>
            </div>

            <Button
              onClick={executeImport}
              disabled={isImporting}
              className="w-full"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Выполняется импорт...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  {dryRun ? 'Выполнить тестовый запуск' : 'Импортировать данные'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Результаты импорта */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle>Результаты импорта</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{importResult.totalRows}</div>
                <div className="text-sm text-gray-600">Всего строк</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{importResult.importedRows}</div>
                <div className="text-sm text-gray-600">Импортировано</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{importResult.errors.length}</div>
                <div className="text-sm text-gray-600">Ошибок</div>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <Alert>
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <strong>Ошибки:</strong>
                    {importResult.errors.slice(0, 5).map((error, index) => (
                      <div key={index} className="text-sm">
                        {error}
                      </div>
                    ))}
                    {importResult.errors.length > 5 && (
                      <div className="text-sm text-gray-600">
                        ... и еще {importResult.errors.length - 5} ошибок
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {importResult.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <strong>Предупреждения:</strong>
                    {importResult.warnings.slice(0, 3).map((warning, index) => (
                      <div key={index} className="text-sm">
                        {warning}
                      </div>
                    ))}
                    {importResult.warnings.length > 3 && (
                      <div className="text-sm text-gray-600">
                        ... и еще {importResult.warnings.length - 3} предупреждений
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {importResult.success && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Успех!</strong> Данные успешно импортированы в таблицу пользователей.
                </AlertDescription>
              </Alert>
            )}

            {importResult.previewData && importResult.previewData.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Предпросмотр импортированных данных:</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        {Object.keys(importResult.previewData[0]).map((key) => (
                          <th key={key} className="border border-gray-300 px-4 py-2 text-left text-sm">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.previewData.map((row, index) => (
                        <tr key={index}>
                          {Object.values(row).map((value, valueIndex) => (
                            <td key={valueIndex} className="border border-gray-300 px-4 py-2 text-sm max-w-md">
                              <div className="break-words whitespace-pre-wrap">
                                {value !== null && value !== undefined ? String(value) : '-'}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
