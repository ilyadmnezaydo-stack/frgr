import * as XLSX from 'xlsx';
import { AIDataMapper, TableSchema, ColumnInfo, FieldMapping } from './ai-data-mapper';
import { DataValidator, ValidationResult } from './data-validator';

export interface ImportResult {
  success: boolean;
  totalRows: number;
  importedRows: number;
  errors: string[];
  warnings: string[];
  previewData?: any[];
}

export interface FileAnalysis {
  columns: string[];
  sampleData: any[];
  suggestedMappings: FieldMapping[];
  confidence: number;
}

export class FileImporter {
  private aiMapper: AIDataMapper;
  private validator: DataValidator;

  constructor() {
    this.aiMapper = new AIDataMapper();
    this.validator = new DataValidator();
    
    // Добавляем правила валидации для таблицы пользователей
    const commonRules = DataValidator.getCommonRules();
    if (commonRules['пользователи']) {
      this.validator.addTableRules('пользователи', commonRules['пользователи']);
    }
  }

  /**
   * Анализирует загруженный файл
   */
  async analyzeFile(file: File): Promise<FileAnalysis> {
    try {
      console.log('Starting file parsing for:', file.name);
      const data = await this.parseFile(file);
      console.log('File parsed, rows count:', data.length);
      
      if (data.length === 0) {
        throw new Error('Файл не содержит данных');
      }

      const columns = Object.keys(data[0]);
      console.log('Columns found:', columns);
      const sampleData = data.slice(0, 5); // Первые 5 строк для предпросмотра

      // Создаем схему исходной таблицы из файла
      const sourceSchema: TableSchema = {
        tableName: 'uploaded_file',
        columns: columns.map(col => ({
          name: col,
          type: this.inferColumnType(data, col),
          nullable: this.isNullable(data, col),
          sampleValues: sampleData.map(row => row[col])
        }))
      };

      console.log('Source schema created');

      // Получаем схему целевой таблицы (пользователи)
      const targetSchema = await this.getTargetTableSchema('пользователи');

      if (!targetSchema) {
        throw new Error('Не удалось получить схему целевой таблицы');
      }

      console.log('Target schema retrieved');

      // Получаем предложения по сопоставлению от AI
      const mappingResult = await this.aiMapper.analyzeAndMap(sourceSchema, targetSchema);
      console.log('AI mapping completed, confidence:', mappingResult.confidence);

      return {
        columns,
        sampleData,
        suggestedMappings: mappingResult.mappings,
        confidence: mappingResult.confidence
      };

    } catch (error) {
      console.error('Error analyzing file:', error);
      throw error;
    }
  }

  /**
   * Импортирует данные из файла в таблицу пользователей
   */
  async importFile(
    file: File, 
    mappings: FieldMapping[],
    dryRun: boolean = false
  ): Promise<ImportResult> {
    try {
      console.log('=== Starting file import ===');
      console.log('File:', file.name, 'Size:', file.size);
      console.log('Mappings:', mappings.length);
      console.log('Dry run:', dryRun);
      
      const data = await this.parseFile(file);
      console.log('File parsed, rows:', data.length);
      
      if (data.length === 0) {
        throw new Error('Файл не содержит данных');
      }

      console.log('Starting validation...');
      const validationResult = await this.validator.validateAndTransform(
        data,
        mappings,
        'пользователи'
      );
      console.log('Validation completed:', {
        isValid: validationResult.isValid,
        errorsCount: validationResult.errors.length,
        warningsCount: validationResult.warnings.length,
        transformedDataCount: validationResult.transformedData?.length || 0
      });

      const errors: string[] = [];
      const warnings: string[] = [];

      // Собираем ошибки валидации
      validationResult.errors.forEach(error => {
        errors.push(`Строка ${error.row ? error.row + 1 : 'неизвестна'}: Поле "${error.field}" - ${error.message}`);
      });

      validationResult.warnings.forEach(warning => {
        warnings.push(`Поле "${warning.field}": ${warning.message}`);
      });

      if (dryRun) {
        console.log('Returning dry run result');
        console.log('Preview data sample:', validationResult.transformedData?.[0]);
        console.log('Preview data примечания length:', validationResult.transformedData?.[0]?.примечания?.length);
        return {
          success: validationResult.isValid,
          totalRows: data.length,
          importedRows: validationResult.transformedData?.length || 0,
          errors,
          warnings,
          previewData: validationResult.transformedData?.slice(0, 3)
        };
      }

      // Реальный импорт данных
      let importedRows = 0;
      
      if (validationResult.transformedData && validationResult.transformedData.length > 0) {
        console.log('Starting real import to Supabase...');
        console.log('Data to import:', JSON.stringify(validationResult.transformedData, null, 2));
        
        try {
          // Импортируем Supabase клиент
          const { createClient } = await import('@supabase/supabase-js');
          
          // Создаем клиент Supabase с сервисным ключом (если есть) или с анонимным
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );
          
          // Подготавливаем данные для вставки
          const dataToInsert = validationResult.transformedData.map(row => {
            const cleanRow = { ...row };
            
            // Оставляем только поля, которые точно есть в реальной базе данных
            const allowedFields = [
              'идентификатор',
              'электронная_почта', 
              'имя', // Добавили поле имя
              'фамилия', // Добавили поле фамилия
              'телефон',
              'компания',
              'должность',
              'телеграмма',
              'аватар_url',
              'био', // Добавили поле био
              'создано_в',
              'обновлено_в'
            ];
            
            // Удаляем поля, которых нет в таблице
            Object.keys(cleanRow).forEach(key => {
              if (!allowedFields.includes(key)) {
                console.log(`Removing field '${key}' from import data`);
                delete cleanRow[key];
              }
            });
            
            return cleanRow;
          });
          
          console.log('Cleaned data to insert:', JSON.stringify(dataToInsert, null, 2));
          
          // Реальная вставка в Supabase
          const { data: insertedData, error } = await supabase
            .from('пользователи')
            .insert(dataToInsert)
            .select();
            
          if (error) {
            console.error('Supabase insert error:', error);
            errors.push(`Ошибка базы данных: ${error.message}`);
            importedRows = 0;
          } else {
            importedRows = insertedData?.length || dataToInsert.length;
            console.log('Successfully imported', importedRows, 'rows to Supabase');
            console.log('Inserted data:', insertedData);
          }
        } catch (dbError) {
          console.error('Database connection error:', dbError);
          errors.push(`Ошибка подключения к базе данных: ${dbError.message}`);
          importedRows = 0;
        }
      }

      return {
        success: errors.length === 0,
        totalRows: data.length,
        importedRows,
        errors,
        warnings
      };

    } catch (error) {
      console.error('Error importing file:', error);
      console.error('Error stack:', error.stack);
      return {
        success: false,
        totalRows: 0,
        importedRows: 0,
        errors: [`Ошибка импорта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`],
        warnings: []
      };
    }
  }

  /**
   * Парсит Excel/CSV файл с улучшенной обработкой данных
   */
  private async parseFile(file: File): Promise<any[]> {
    try {
      console.log('Starting file read...');
      
      // Конвертируем File в Buffer для server-side обработки
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      console.log('Buffer created, length:', buffer.length);
      
      const workbook = XLSX.read(buffer, { type: 'buffer', codepage: 65001 });
      console.log('Workbook created, sheets:', workbook.SheetNames);

      // Берем первый лист
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Конвертируем в JSON с правильной кодировкой
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        raw: false,
        blankrows: false
      });

      console.log('JSON data length:', jsonData.length);

      if (jsonData.length === 0) {
        console.log('No data found');
        return [];
      }

      // Первая строка - заголовки
      const headers = jsonData[0] as string[];
      console.log('Raw headers:', headers);
      
      // Очищаем заголовки от проблемных символов и пустых значений
      const cleanHeaders = headers.map((header, index) => {
        console.log(`Processing header ${index}: "${header}"`);
        if (typeof header === 'string') {
          // Убираем BOM, пробелы и нормализуем
          const cleaned = header.replace(/^\uFEFF/, '').trim();
          console.log(`Cleaned header: "${cleaned}"`);
          // Если заголовок пустой, пропускаем его
          return cleaned || null;
        }
        console.log(`Header is not string: ${header}`);
        return header || null;
      }).filter(h => h !== null); // Убираем пустые заголовки
      
      console.log('Final clean headers:', cleanHeaders);
      
      console.log('Clean headers:', cleanHeaders);
      
      const rows = jsonData.slice(1) as any[][];

      // Конвертируем в массив объектов с улучшенной обработкой
      const result = rows.map((row, rowIndex) => {
        const obj: any = {};
        
        // Используем только чистые заголовки
        cleanHeaders.forEach((cleanHeader, headerIndex) => {
          // Находим индекс этого заголовка в оригинальных данных
          const originalIndex = headers.findIndex(h => {
            if (typeof h === 'string') {
              const cleaned = h.replace(/^\uFEFF/, '').trim();
              return cleaned === cleanHeader;
            }
            return h === cleanHeader;
          });
          
          if (originalIndex !== -1) {
            let value = row[originalIndex] || '';
            
            // Очищаем значение от проблемных символов
            if (typeof value === 'string') {
              value = value.replace(/^\uFEFF/, '').trim();
              
              // Убираем лишние пробелы и нормализуем
              value = value.replace(/\s+/g, ' ').trim();
              
              // Если значение пустое после очистки, ставим null
              if (value === '') {
                value = null;
              }
            }
            
            // Используем очищенный заголовок как ключ
            obj[cleanHeader] = value;
          }
        });
        
        return obj;
      }).filter(row => {
        // Убираем полностью пустые строки
        return Object.values(row).some(value => value !== null && value !== '');
      });

      console.log('Final result length:', result.length);
      console.log('Sample row:', result[0]);
      return result;
    } catch (error) {
      console.error('Error parsing file:', error);
      throw error;
    }
  }

  /**
   * Определяет тип колонки на основе данных
   */
  private inferColumnType(data: any[], columnName: string): string {
    const sampleValues = data.slice(0, 10).map(row => row[columnName]).filter(val => val !== null && val !== undefined && val !== '');
    
    if (sampleValues.length === 0) return 'VARCHAR';

    const columnNameLower = columnName.toLowerCase();

    // Email detection с улучшенной логикой
    if (columnNameLower.includes('mail') || columnNameLower.includes('почта') || columnNameLower.includes('email')) {
      const emailCount = sampleValues.filter(val => 
        typeof val === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
      ).length;
      if (emailCount > sampleValues.length * 0.8) return 'VARCHAR';
    }

    // Phone detection с улучшенными паттернами
    if (columnNameLower.includes('phone') || columnNameLower.includes('телефон') || columnNameLower.includes('tel')) {
      const phoneCount = sampleValues.filter(val => 
        typeof val === 'string' && this.isValidPhone(val)
      ).length;
      if (phoneCount > sampleValues.length * 0.8) return 'VARCHAR';
    }

    // Name detection
    if (columnNameLower.includes('name') || columnNameLower.includes('имя') || columnNameLower.includes('fname') || columnNameLower.includes('lname')) {
      const nameCount = sampleValues.filter(val => 
        typeof val === 'string' && this.isValidName(val)
      ).length;
      if (nameCount > sampleValues.length * 0.8) return 'VARCHAR';
    }

    // Company detection
    if (columnNameLower.includes('company') || columnNameLower.includes('компания') || columnNameLower.includes('org') || columnNameLower.includes('work')) {
      const companyCount = sampleValues.filter(val => 
        typeof val === 'string' && this.isValidCompanyName(val)
      ).length;
      if (companyCount > sampleValues.length * 0.8) return 'VARCHAR';
    }

    // URL detection
    if (columnNameLower.includes('url') || columnNameLower.includes('link') || columnNameLower.includes('profile')) {
      const urlCount = sampleValues.filter(val => 
        typeof val === 'string' && this.isValidUrl(val)
      ).length;
      if (urlCount > sampleValues.length * 0.8) return 'TEXT';
    }

    // Проверяем числа
    const numberCount = sampleValues.filter(val => !isNaN(Number(val)) && val !== '').length;
    if (numberCount > sampleValues.length * 0.8) return 'INTEGER';

    // Проверяем даты с улучшенными форматами
    const dateCount = sampleValues.filter(val => this.isValidDate(val)).length;
    if (dateCount > sampleValues.length * 0.8) return 'TIMESTAMPTZ';

    // Проверяем длинные текстовые поля
    const longTextCount = sampleValues.filter(val => 
      typeof val === 'string' && val.length > 255
    ).length;
    if (longTextCount > sampleValues.length * 0.5) return 'TEXT';

    return 'VARCHAR';
  }

  /**
   * Проверяет валидность телефона
   */
  private isValidPhone(phone: string): boolean {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  }

  /**
   * Проверяет валидность имени
   */
  private isValidName(name: string): boolean {
    if (typeof name !== 'string' || name.length < 2) return false;
    if (name.length > 50) return false;
    
    const namePattern = /^[a-zA-Zа-яА-Я\s\-']+$/;
    return namePattern.test(name) && !this.isValidEmail(name) && !this.isValidPhone(name);
  }

  /**
   * Проверяет валидность названия компании
   */
  private isValidCompanyName(company: string): boolean {
    if (typeof company !== 'string' || company.length < 2) return false;
    
    if (this.isValidEmail(company) || this.isValidPhone(company)) return false;
    
    const companyPattern = /^[a-zA-Zа-яА-Я0-9\s\-\.\&\,\(\)]+$/;
    return companyPattern.test(company);
  }

  /**
   * Проверяет валидность email
   */
  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Проверяет валидность даты
   */
  private isValidDate(date: any): boolean {
    if (typeof date === 'object' && date instanceof Date) {
      return !isNaN(date.getTime());
    }
    
    if (typeof date === 'string') {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    }
    
    return false;
  }

  /**
   * Проверяет валидность URL
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Проверяет, может ли колонка быть NULL
   */
  private isNullable(data: any[], columnName: string): boolean {
    const emptyCount = data.slice(0, 10).filter(row => {
      const val = row[columnName];
      return val === null || val === undefined || val === '';
    }).length;
    
    return emptyCount > 0;
  }

  /**
   * Получает схему целевой таблицы
   */
  private async getTargetTableSchema(tableName: string): Promise<TableSchema | null> {
    try {
      // Временно возвращаем схему hardcoded для таблицы пользователи
      // В реальном приложении здесь будет запрос к Supabase
      if (tableName === 'пользователи') {
        return {
          tableName: 'пользователи',
          columns: [
            { name: 'идентификатор', type: 'UUID', nullable: false },
            { name: 'электронная_почта', type: 'VARCHAR', nullable: false },
            { name: 'имя', type: 'VARCHAR', nullable: true }, // Добавили поле имя
            { name: 'фамилия', type: 'VARCHAR', nullable: true }, // Добавили поле фамилия
            { name: 'телефон', type: 'VARCHAR', nullable: true },
            { name: 'компания', type: 'VARCHAR', nullable: true },
            { name: 'должность', type: 'VARCHAR', nullable: true },
            { name: 'телеграмма', type: 'VARCHAR', nullable: true },
            { name: 'аватар_url', type: 'TEXT', nullable: true },
            { name: 'био', type: 'TEXT', nullable: true }, // Добавили поле био
            { name: 'создано_в', type: 'TIMESTAMPTZ', nullable: false },
            { name: 'обновлено_в', type: 'TIMESTAMPTZ', nullable: false }
          ]
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting target table schema:', error);
      return null;
    }
  }
}
