import { useState, useMemo } from 'react';
import { ArrowLeft, FileSpreadsheet, Download, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import ColumnMappingDropdown from './ColumnMappingDropdown';
import ImportModal from './ImportModal';
import { AnalysisResult, TARGET_FIELDS, formatPhoneNumber } from '@/types/mapper';

interface MappingViewProps {
  data: AnalysisResult;
  onBack: () => void;
  isEntering: boolean;
}

const MappingView = ({ data, onBack, isEntering }: MappingViewProps) => {
  const [showImportModal, setShowImportModal] = useState(false);
  const [mappings, setMappings] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    Object.entries(data.suggestedMapping).forEach(([col, mapping]) => {
      initial[col] = mapping.targetField || 'skip';
    });
    return initial;
  });

  const handleMappingChange = (sourceColumn: string, targetField: string) => {
    setMappings((prev) => ({
      ...prev,
      [sourceColumn]: targetField,
    }));
  };

  const handleReset = () => {
    const reset: Record<string, string> = {};
    Object.entries(data.suggestedMapping).forEach(([col, mapping]) => {
      reset[col] = mapping.targetField || 'skip';
    });
    setMappings(reset);
  };

  const usedMappings = useMemo(() => {
    return Object.values(mappings).filter((v) => v !== 'skip');
  }, [mappings]);

  const mappedCount = usedMappings.length;
  const totalColumns = data.sourceColumns.length;

  const averageConfidence = useMemo(() => {
    const confidences = Object.values(data.suggestedMapping).map((m) => m.confidence);
    return Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100);
  }, [data.suggestedMapping]);

  const canImport = mappedCount > 0;

  const getTransformedValue = (sourceColumn: string, value: string | null): string => {
    if (value === null) return '—';
    const targetField = mappings[sourceColumn];
    
    if (targetField === 'skip') return value;
    if (targetField === 'phone') return formatPhoneNumber(value);
    return value;
  };

  const isColumnSkipped = (sourceColumn: string) => mappings[sourceColumn] === 'skip';

  return (
    <div 
      className={`flex flex-col min-h-screen transition-all duration-700 ${
        isEntering ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[30px]'
      }`}
    >
      {/* Header Bar */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-border px-4 md:px-6 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              Назад
            </Button>
            <div className="hidden md:flex items-center gap-2 text-sm">
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              <span className="font-medium">{data.fileName}</span>
              <span className="text-muted-foreground">• {data.totalRows} строк</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full">
          {/* Mobile File Info */}
          <div className="md:hidden flex items-center gap-2 text-sm mb-4 px-2">
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            <span className="font-medium">{data.fileName}</span>
            <span className="text-muted-foreground">• {data.totalRows} строк</span>
          </div>

          {/* Split View */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-220px)]">
            {/* Left Panel - Source Data */}
            <div className="flex flex-col glass-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-slate-50/50">
                <h3 className="font-semibold text-foreground">Исходные данные</h3>
                <p className="text-sm text-muted-foreground">Ваш файл</p>
              </div>
              <div className="flex-1 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80">
                      {data.sourceColumns.map((col) => (
                        <TableHead 
                          key={col}
                          className={`font-medium text-foreground whitespace-nowrap transition-opacity duration-300 ${
                            isColumnSkipped(col) ? 'opacity-40' : ''
                          }`}
                        >
                          {col}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.sampleData.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {data.sourceColumns.map((col) => (
                          <TableCell 
                            key={col}
                            className={`font-mono text-sm whitespace-nowrap transition-opacity duration-300 ${
                              isColumnSkipped(col) ? 'opacity-40' : ''
                            }`}
                          >
                            {row[col] || '—'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Right Panel - Target Preview */}
            <div className="flex flex-col glass-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="font-semibold text-foreground">Целевая база данных</h3>
                <p className="text-sm text-muted-foreground">После импорта</p>
              </div>
              <div className="flex-1 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {data.sourceColumns.map((col) => (
                        <TableHead 
                          key={col} 
                          className={`p-2 min-w-[180px] transition-opacity duration-300 ${
                            isColumnSkipped(col) ? 'opacity-40' : ''
                          }`}
                        >
                          <ColumnMappingDropdown
                            sourceColumn={col}
                            currentMapping={mappings[col]}
                            confidence={data.suggestedMapping[col]?.confidence || 0}
                            onMappingChange={(value) => handleMappingChange(col, value)}
                            usedMappings={usedMappings}
                          />
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.sampleData.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {data.sourceColumns.map((col) => (
                          <TableCell 
                            key={col}
                            className={`font-mono text-sm whitespace-nowrap transition-all duration-300 ${
                              isColumnSkipped(col) ? 'opacity-40 line-through' : ''
                            }`}
                          >
                            {getTransformedValue(col, row[col])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Action Bar */}
      <footer className="action-footer">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              Сопоставлено: <span className="font-medium text-foreground">{mappedCount}/{totalColumns}</span> колонок
            </span>
            <span className="hidden md:inline text-muted-foreground">•</span>
            <span className="hidden md:inline text-muted-foreground">
              Уверенность AI: <span className="font-medium text-primary">{averageConfidence}%</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleReset}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Сбросить
            </Button>
            <Button
              onClick={() => setShowImportModal(true)}
              disabled={!canImport}
              className="gap-2 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <Download className="w-4 h-4" />
              Импортировать данные
            </Button>
          </div>
        </div>
      </footer>

      {/* Import Modal */}
      <ImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportAnother={onBack}
        totalRows={data.totalRows}
      />
    </div>
  );
};

export default MappingView;
