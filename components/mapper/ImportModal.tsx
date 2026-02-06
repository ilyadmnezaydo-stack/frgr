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
    isImporting: boolean;
    importResult: {
        success: boolean;
        importedRows: number;
        errors: string[];
        warnings: string[];
    } | null;
    onConfirmImport: () => void;
}

const ImportModal = ({
    open,
    onClose,
    onImportAnother,
    totalRows,
    isImporting,
    importResult,
    onConfirmImport
}: ImportModalProps) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (open && !isImporting && !importResult) {
            onConfirmImport();
        }
    }, [open, isImporting, importResult]);

    useEffect(() => {
        if (!open) {
            setProgress(0);
            return;
        }

        if (isImporting) {
            const interval = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 90) return 90;
                    return prev + Math.random() * 2;
                });
            }, 100);
            return () => clearInterval(interval);
        } else if (importResult) {
            setProgress(100);
        }

    }, [open, isImporting, importResult, totalRows]);

    // Use state or props for display
    const displayProcessed = isImporting
        ? Math.floor((progress / 100) * totalRows)
        : (importResult ? totalRows : 0);

    return (
        <Dialog open={open} onOpenChange={(open) => !isImporting && onClose()}>
            <DialogContent className="sm:max-w-md glass-card border-purple-100">
                <DialogHeader>
                    <DialogTitle className="text-center">
                        {isImporting ? 'Импортируем данные...' : 'Импорт завершён!'}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center py-6">
                    {isImporting ? (
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
                                {displayProcessed} / {totalRows} записей обработано
                            </p>

                            {/* Progress Bar */}
                            <div className="w-full max-w-xs">
                                <Progress value={progress} className="h-2" />
                                <p className="text-center text-sm text-muted-foreground mt-2">
                                    {Math.round(progress)}%
                                </p>
                            </div>
                        </>
                    ) : importResult ? (
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
                                    <span className="font-semibold text-emerald-700">{importResult.importedRows}</span>
                                </div>

                                <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-amber-50">
                                    <span className="flex items-center gap-2 text-amber-700">
                                        <AlertTriangle className="w-4 h-4" />
                                        Пропущено (дубликаты)
                                    </span>
                                    <span className="font-semibold text-amber-700">{importResult.warnings.length}</span>
                                </div>

                                <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-slate-50">
                                    <span className="flex items-center gap-2 text-slate-600">
                                        <XCircle className="w-4 h-4" />
                                        Ошибки
                                    </span>
                                    <span className="font-semibold text-slate-600">{importResult.errors.length}</span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-3 w-full mt-6 animate-fade-slide-up" style={{ animationDelay: '200ms' }}>
                                <Button
                                    variant="outline"
                                    onClick={onImportAnother}
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
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ImportModal;
