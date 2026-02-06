import { useEffect, useState } from 'react';
import { Loader2, FileSearch, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface AnalyzingViewProps {
    fileName: string;
    rowCount: number;
    isExiting: boolean;
}

const STAGES = [
    'Анализируем структуру файла...',
    'Определяем типы данных...',
    'Сопоставляем колонки...',
    'Завершаем анализ...',
];

const AnalyzingView = ({ fileName, rowCount, isExiting }: AnalyzingViewProps) => {
    const [progress, setProgress] = useState(0);
    const [stageIndex, setStageIndex] = useState(0);

    useEffect(() => {
        // В реальном приложении можно использовать socket или polling
        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 95) return 95;
                return prev + 2;
            });
        }, 100);

        const stageInterval = setInterval(() => {
            setStageIndex((prev) => {
                if (prev >= STAGES.length - 1) return prev;
                return prev + 1;
            });
        }, 800);

        return () => {
            clearInterval(progressInterval);
            clearInterval(stageInterval);
        };
    }, []);

    return (
        <div
            className={`flex flex-col items-center justify-center min-h-[500px] px-4 transition-all duration-500 ${isExiting ? 'opacity-0 translate-y-[-20px]' : 'opacity-100 translate-y-0'
                }`}
        >
            {/* Decorative Orbs */}
            <div className="orb-purple w-96 h-96 top-20 left-20 absolute opacity-30" />
            <div className="orb-violet w-64 h-64 top-1/4 right-32 absolute opacity-30" />

            {/* Spinner Container */}
            <div className="relative mb-8 animate-fade-slide-up z-10">
                {/* Outer Ring */}
                <div className="w-24 h-24 rounded-full border-4 border-purple-100 absolute top-0 left-0" />

                {/* Spinning Gradient Ring */}
                <div className="w-24 h-24 rounded-full border-4 border-transparent border-t-primary animate-spin" />

                {/* Center Icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                    {progress >= 100 ? (
                        <CheckCircle2 className="w-10 h-10 text-emerald-500 animate-fade-in" />
                    ) : (
                        <FileSearch className="w-10 h-10 text-primary" />
                    )}
                </div>
            </div>

            {/* Status Text */}
            <h2
                className="text-xl font-semibold text-foreground mb-2 animate-fade-slide-up z-10"
                style={{ animationDelay: '100ms' }}
            >
                {STAGES[stageIndex]}
            </h2>

            {/* File Info */}
            <p
                className="text-muted-foreground mb-8 animate-fade-slide-up z-10"
                style={{ animationDelay: '150ms' }}
            >
                {fileName} ({rowCount > 0 ? `${rowCount} строк` : 'чтение...'})
            </p>

            {/* Progress Bar */}
            <div
                className="w-full max-w-md animate-fade-slide-up z-10"
                style={{ animationDelay: '200ms' }}
            >
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-2">
                        <Loader2 className={`w-4 h-4 ${progress < 100 ? 'animate-spin' : 'hidden'}`} />
                        {STAGES[stageIndex]}
                    </span>
                    <span>{Math.round(progress)}%</span>
                </div>
            </div>
        </div>
    );
};

export default AnalyzingView;
