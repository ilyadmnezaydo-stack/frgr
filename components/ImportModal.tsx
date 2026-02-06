import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertTriangle, XCircle, Upload, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImportAnother: () => void;
  totalRows: number;
}

type ImportState = 'importing' | 'complete';

const ImportModal = ({ open, onClose, onImportAnother, totalRows }: ImportModalProps) => {
  const [state, setState] = useState<ImportState>('importing');
  const [progress, setProgress] = useState(0);
  const [processedRows, setProcessedRows] = useState(0);

  useEffect(() => {
    if (!open) {
      setState('importing');
      setProgress(0);
      setProcessedRows(0);
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.random() * 3 + 1;
        if (next >= 100) {
          clearInterval(interval);
          setState('complete');
          return 100;
        }
        setProcessedRows(Math.floor((next / 100) * totalRows));
        return next;
      });
    }, 80);

    return () => clearInterval(interval);
  }, [open, totalRows]);

  const successCount = totalRows - 3;
  const duplicateCount = 3;
  const errorCount = 0;

  const handleImportAnother = () => {
    onClose();
    onImportAnother();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md glass-card border-purple-100">
        <DialogHeader>
          <DialogTitle className="text-center">
            {state === 'importing' ? 'Импортируем данные...' : 'Импорт завершён!'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center py-6">
          {state === 'importing' ? (
            <>
              {/* Spinner */}
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full border-4 border-purple-100" />
                <div className="w-20 h-20 rounded-full border-4 border-transparent border-t-primary animate-spin absolute top-0 left-0" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              </div>

              {/* Progress Info */}
              <p className="text-muted-foreground mb-2">
                {processedRows} / {totalRows} записей обработано
              </p>

              {/* Progress Bar */}
              <div className="w-full max-w-xs">
                <Progress value={progress} className="h-2" />
                <p className="text-center text-sm text-muted-foreground mt-2">
                  {Math.round(progress)}%
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Success Icon */}
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6 animate-fade-slide-up">
                <CheckCircle2 className="w-10 h-10 text-success" />
              </div>

              {/* Stats */}
              <div className="w-full space-y-3 animate-fade-slide-up" style={{ animationDelay: '100ms' }}>
                <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-emerald-50">
                  <span className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                    Успешно импортировано
                  </span>
                  <span className="font-semibold text-emerald-700">{successCount}</span>
                </div>

                <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-amber-50">
                  <span className="flex items-center gap-2 text-amber-700">
                    <AlertTriangle className="w-4 h-4" />
                    Пропущено (дубликаты)
                  </span>
                  <span className="font-semibold text-amber-700">{duplicateCount}</span>
                </div>

                <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-slate-50">
                  <span className="flex items-center gap-2 text-slate-600">
                    <XCircle className="w-4 h-4" />
                    Ошибки
                  </span>
                  <span className="font-semibold text-slate-600">{errorCount}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 w-full mt-6 animate-fade-slide-up" style={{ animationDelay: '200ms' }}>
                <Button
                  variant="outline"
                  onClick={handleImportAnother}
                  className="w-full gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Импортировать ещё файл
                </Button>
                <Button
                  className="w-full gap-2 bg-gradient-to-r from-primary to-purple-500"
                  onClick={onClose}
                >
                  <ExternalLink className="w-4 h-4" />
                  Перейти к данным
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportModal;
