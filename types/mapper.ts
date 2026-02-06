export type AppState = 'upload' | 'analyzing' | 'mapping';

export interface ColumnMapping {
  targetField: string | null;
  confidence: number;
}

export interface AnalysisResult {
  fileName: string;
  totalRows: number;
  sourceColumns: string[];
  targetSchema: string[];
  suggestedMapping: Record<string, ColumnMapping>;
  sampleData: Record<string, string | null>[];
}

export const TARGET_FIELDS = [
  { value: 'full_name', label: 'Полное имя' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Телефон' },
  { value: 'telegram_id', label: 'Telegram ID' },
  { value: 'company', label: 'Компания' },
  { value: 'notes', label: 'Заметки' },
  { value: 'skip', label: '— Пропустить колонку —' },
] as const;

export type TargetFieldValue = typeof TARGET_FIELDS[number]['value'];

export const MOCK_ANALYSIS_RESULT: AnalysisResult = {
  fileName: 'clients_data.xlsx',
  totalRows: 142,
  sourceColumns: ['Client', 'Mob', 'Email', 'Company'],
  targetSchema: ['full_name', 'email', 'phone', 'telegram_id', 'notes'],
  suggestedMapping: {
    'Client': { targetField: 'full_name', confidence: 0.95 },
    'Mob': { targetField: 'phone', confidence: 0.87 },
    'Email': { targetField: 'email', confidence: 0.99 },
    'Company': { targetField: 'company', confidence: 0.42 },
  },
  sampleData: [
    { Client: 'Иван Петров', Mob: '79991234567', Email: 'ivan@mail.ru', Company: 'ООО Рога и Копыта' },
    { Client: 'Анна Смирнова', Mob: '79997654321', Email: 'anna@gmail.com', Company: 'ИП Смирнова' },
    { Client: 'Михаил Козлов', Mob: '79993334455', Email: 'mikhail.k@yandex.ru', Company: null },
    { Client: 'Елена Волкова', Mob: '79998887766', Email: 'elena.v@mail.ru', Company: 'АО Технопром' },
    { Client: 'Сергей Новиков', Mob: '79991112233', Email: 'sergey.n@inbox.ru', Company: 'ООО Старт' },
    { Client: 'Ольга Морозова', Mob: '79994445566', Email: 'olga.m@gmail.com', Company: null },
    { Client: 'Дмитрий Соколов', Mob: '79997778899', Email: 'dmitry.s@yandex.ru', Company: 'ЗАО Инвест' },
    { Client: 'Наталья Лебедева', Mob: '79992223344', Email: 'natasha.l@mail.ru', Company: 'ООО Сервис' },
    { Client: 'Алексей Попов', Mob: '79995556677', Email: 'alex.p@gmail.com', Company: 'ИП Попов' },
    { Client: 'Мария Кузнецова', Mob: '79998889900', Email: 'maria.k@inbox.ru', Company: 'ООО Медиа' },
  ],
};

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('7')) {
    return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9)}`;
  }
  if (cleaned.length === 10) {
    return `+7 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 8)}-${cleaned.slice(8)}`;
  }
  return phone;
}

export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.6) return 'medium';
  return 'low';
}
