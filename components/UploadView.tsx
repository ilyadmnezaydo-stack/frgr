import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, Shield, Sparkles, Zap } from 'lucide-react';

interface UploadViewProps {
  onFileUpload: (file: File) => void;
  isExiting: boolean;
}

const UploadView = ({ onFileUpload, isExiting }: UploadViewProps) => {
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onFileUpload(files[0]);
    }
  }, [onFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileUpload(files[0]);
    }
  }, [onFileUpload]);

  const stats = [
    { value: 'AI', label: 'Умный анализ данных', icon: Sparkles },
    { value: 'Auto', label: 'Автоматическое сопоставление', icon: Zap },
    { value: 'Real', label: 'Работа с реальными данными', icon: Shield },
  ];

  return (
    <div 
      className={`flex flex-col items-center justify-center min-h-[calc(100vh-2rem)] px-4 py-8 transition-all duration-500 ${
        isExiting ? 'opacity-0 translate-y-[-20px]' : 'opacity-100 translate-y-0'
      }`}
    >
      {/* Decorative Orbs */}
      <div className="orb-purple w-96 h-96 -top-48 -left-48 fixed" />
      <div className="orb-violet w-64 h-64 top-1/4 -right-32 fixed" />

      {/* Floating Badge */}
      <div className="floating-badge mb-6 animate-fade-slide-up" style={{ animationDelay: '0ms' }}>
        <Sparkles className="w-4 h-4" />
        <span>AI-Powered Data Intelligence</span>
      </div>

      {/* Hero Title */}
      <h1 
        className="text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-4 animate-fade-slide-up"
        style={{ animationDelay: '100ms' }}
      >
        Импорт любых данных,
        <br />
        <span className="text-gradient">идеально структурированных</span>
      </h1>

      {/* Subtitle */}
      <p 
        className="text-lg text-muted-foreground text-center max-w-2xl mb-10 animate-fade-slide-up"
        style={{ animationDelay: '200ms' }}
      >
        FRGR — AI-маппер данных для импорта Excel/CSV в вашу базу без ошибок и ручной работы.
      </p>

      {/* Upload Zone */}
      <div 
        className="w-full max-w-xl animate-fade-slide-up"
        style={{ animationDelay: '300ms' }}
      >
        <label
          htmlFor="file-upload"
          className={`upload-zone flex flex-col items-center justify-center h-64 px-6 cursor-pointer ${
            isDragActive ? 'upload-zone-active' : ''
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className={`p-4 rounded-full bg-purple-100 mb-4 transition-transform duration-300 ${
            isDragActive ? 'scale-110' : ''
          }`}>
            {isDragActive ? (
              <Upload className="w-10 h-10 text-primary" />
            ) : (
              <FileSpreadsheet className="w-10 h-10 text-primary" />
            )}
          </div>
          <p className="text-lg font-medium text-foreground mb-1">
            {isDragActive ? 'Отпустите файл' : 'Перетащите файл сюда'}
          </p>
          <p className="text-muted-foreground mb-4">или нажмите для выбора</p>
          <p className="text-sm text-muted-foreground/70">.xlsx, .csv — До 10MB</p>
          <input
            id="file-upload"
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileSelect}
          />
        </label>
      </div>

      {/* Trust Indicators */}
      <div 
        className="flex items-center gap-6 mt-6 text-sm text-muted-foreground animate-fade-slide-up"
        style={{ animationDelay: '400ms' }}
      >
        <span className="flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-success" />
          Безопасно
        </span>
        <span>•</span>
        <span>Бесплатно</span>
        <span>•</span>
        <span>Без регистрации</span>
      </div>

      {/* Stats Cards */}
      <div 
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full max-w-3xl animate-fade-slide-up"
        style={{ animationDelay: '500ms' }}
      >
        {stats.map((stat, index) => (
          <div key={index} className="stat-card text-center">
            <stat.icon className="w-6 h-6 text-primary mx-auto mb-2" />
            <div className="text-3xl font-bold text-primary mb-1">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UploadView;
