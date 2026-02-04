'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, AlertTriangle, Database, ArrowRight, Play, Eye } from 'lucide-react';

interface TableInfo {
  table_name: string;
  row_count: number;
}

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  sampleValues?: any[];
}

interface TableSchema {
  tableName: string;
  columns: ColumnInfo[];
}

interface FieldMapping {
  sourceField: string;
  targetField: string;
  confidence: number;
  transformation?: string;
}

interface MappingResult {
  mappings: FieldMapping[];
  confidence: number;
  suggestions: string[];
}

interface TransferResult {
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  validationErrors: any[];
  transferResults: any[];
}

export default function AIMapperInterface() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [sourceTable, setSourceTable] = useState<string>('');
  const [targetTable, setTargetTable] = useState<string>('');
  const [sourceSchema, setSourceSchema] = useState<TableSchema | null>(null);
  const [targetSchema, setTargetSchema] = useState<TableSchema | null>(null);
  const [mappingResult, setMappingResult] = useState<MappingResult | null>(null);
  const [sourceData, setSourceData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [transferResult, setTransferResult] = useState<TransferResult | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [dryRun, setDryRun] = useState(true);

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      const response = await fetch('/api/ai-mapper/analyze');
      const data = await response.json();
      if (data.success) {
        setTables(data.tables);
      }
    } catch (error) {
      console.error('Error loading tables:', error);
    }
  };

  const analyzeTables = async () => {
    if (!sourceTable || !targetTable) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/ai-mapper/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceTableName: sourceTable, targetTableName: targetTable })
      });

      const data = await response.json();
      if (data.success) {
        setSourceSchema(data.sourceTable);
        setTargetSchema(data.targetTable);
        setMappingResult(data.mapping);
      }
    } catch (error) {
      console.error('Error analyzing tables:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPreviewData = async () => {
    if (!sourceTable || !targetTable) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/ai-mapper/transfer?sourceTable=${sourceTable}&targetTable=${targetTable}&limit=5`);
      const data = await response.json();

      if (data.success) {
        setSourceData(data.sourceData);
        setSourceSchema(data.sourceSchema);
        setTargetSchema(data.targetSchema);
        setMappingResult(data.mappingSuggestion);
      }
    } catch (error) {
      console.error('Error loading preview data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const executeTransfer = async () => {
    if (!mappingResult || !sourceTable || !targetTable) return;

    setIsTransferring(true);
    try {
      const response = await fetch('/api/ai-mapper/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceTableName: sourceTable,
          targetTableName: targetTable,
          mappings: mappingResult.mappings,
          dryRun: dryRun,
          batchSize: 100
        })
      });

      const data = await response.json();
      if (data.success) {
        setTransferResult(data.result);
      }
    } catch (error) {
      console.error('Error during transfer:', error);
    } finally {
      setIsTransferring(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return 'Высокая';
    if (confidence >= 0.6) return 'Средняя';
    return 'Низкая';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Database className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold">AI Мигратор Данных</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Выбор таблиц</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Исходная таблица</label>
              <Select value={sourceTable} onValueChange={setSourceTable}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите исходную таблицу" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((table) => (
                    <SelectItem key={table.table_name} value={table.table_name}>
                      {table.table_name} ({table.row_count} записей)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Целевая таблица</label>
              <Select value={targetTable} onValueChange={setTargetTable}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите целевую таблицу" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((table) => (
                    <SelectItem key={table.table_name} value={table.table_name}>
                      {table.table_name} ({table.row_count} записей)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={analyzeTables} disabled={!sourceTable || !targetTable || isLoading}>
              {isLoading ? 'Анализ...' : 'Анализировать таблицы'}
            </Button>
            <Button variant="outline" onClick={loadPreviewData} disabled={!sourceTable || !targetTable || isLoading}>
              <Eye className="h-4 w-4 mr-2" />
              Предпросмотр
            </Button>
          </div>
        </CardContent>
      </Card>

      {mappingResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Результаты анализа
              <Badge variant="outline">
                Уверенность: {getConfidenceText(mappingResult.confidence)} ({Math.round(mappingResult.confidence * 100)}%)
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Сопоставления полей</h3>
                <div className="space-y-2">
                  {mappingResult.mappings.map((mapping, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded">
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {mapping.sourceField}
                      </span>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                      <span className="font-mono text-sm bg-blue-100 px-2 py-1 rounded">
                        {mapping.targetField}
                      </span>
                      <div className="flex-1" />
                      <Badge
                        className={`${getConfidenceColor(mapping.confidence)} text-white`}
                      >
                        {Math.round(mapping.confidence * 100)}%
                      </Badge>
                      {mapping.transformation && (
                        <Badge variant="outline">
                          {mapping.transformation}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {mappingResult.suggestions.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      {mappingResult.suggestions.map((suggestion, index) => (
                        <div key={index}>{suggestion}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {sourceData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Предпросмотр данных</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="source" className="w-full">
              <TabsList>
                <TabsTrigger value="source">Исходные данные</TabsTrigger>
                <TabsTrigger value="schema">Схемы таблиц</TabsTrigger>
              </TabsList>

              <TabsContent value="source" className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        {sourceData.length > 0 && Object.keys(sourceData[0]).map((key) => (
                          <th key={key} className="border border-gray-300 px-4 py-2 text-left">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sourceData.map((row, index) => (
                        <tr key={index}>
                          {Object.values(row).map((value, valueIndex) => (
                            <td key={valueIndex} className="border border-gray-300 px-4 py-2">
                              {value !== null && value !== undefined ? String(value) : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="schema" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Исходная таблица: {sourceSchema?.tableName}</h4>
                    <div className="space-y-1">
                      {sourceSchema?.columns.map((col) => (
                        <div key={col.name} className="flex justify-between text-sm">
                          <span className="font-mono">{col.name}</span>
                          <span className="text-gray-600">{col.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Целевая таблица: {targetSchema?.tableName}</h4>
                    <div className="space-y-1">
                      {targetSchema?.columns.map((col) => (
                        <div key={col.name} className="flex justify-between text-sm">
                          <span className="font-mono">{col.name}</span>
                          <span className="text-gray-600">{col.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {mappingResult && (
        <Card>
          <CardHeader>
            <CardTitle>Перенос данных</CardTitle>
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
                Тестовый запуск (без реального переноса данных)
              </label>
            </div>

            <Button
              onClick={executeTransfer}
              disabled={isTransferring || !mappingResult}
              className="w-full"
            >
              {isTransferring ? (
                'Выполняется перенос...'
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  {dryRun ? 'Выполнить тестовый запуск' : 'Выполнить перенос данных'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {transferResult && (
        <Card>
          <CardHeader>
            <CardTitle>Результаты переноса</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{transferResult.totalProcessed}</div>
                <div className="text-sm text-gray-600">Всего обработано</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{transferResult.successCount}</div>
                <div className="text-sm text-gray-600">Успешно перенесено</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{transferResult.errorCount}</div>
                <div className="text-sm text-gray-600">Ошибок</div>
              </div>
            </div>

            {transferResult.validationErrors.length > 0 && (
              <Alert>
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <strong>Ошибки валидации:</strong>
                    {transferResult.validationErrors.slice(0, 5).map((error, index) => (
                      <div key={index} className="text-sm">
                        Поле "{error.field}": {error.message}
                      </div>
                    ))}
                    {transferResult.validationErrors.length > 5 && (
                      <div className="text-sm text-gray-600">
                        ... и еще {transferResult.validationErrors.length - 5} ошибок
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <h4 className="font-semibold">Детализация по пакетам:</h4>
              {transferResult.transferResults.map((result, index) => (
                <div key={index} className="flex items-center gap-2 p-2 border rounded">
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm">
                    Пакет {result.batchStart}-{result.batchStart + result.batchSize - 1}
                  </span>
                  <div className="flex-1" />
                  <span className="text-sm">
                    {result.success ? (
                      result.wouldInsertCount ?
                        `Будет перенесено: ${result.wouldInsertCount}` :
                        `Перенесено: ${result.insertedCount}`
                    ) : (
                      `Ошибка: ${result.error}`
                    )}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
