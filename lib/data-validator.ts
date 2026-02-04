import { FieldMapping } from './ai-data-mapper';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  transformedData?: any[];
}

export interface ValidationError {
  field: string;
  message: string;
  row?: number;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  unique?: boolean;
  custom?: (value: any) => boolean | string;
}

export class DataValidator {
  private rules: Map<string, ValidationRule[]> = new Map();

  /**
   * Adds validation rules for a specific table
   */
  addTableRules(tableName: string, rules: ValidationRule[]): void {
    this.rules.set(tableName, rules);
  }

  /**
   * Gets existing values for uniqueness validation
   */
  private getExistingValues(existingRecords: any[], uniqueFields: string[]): Map<string, Set<any>> {
    const existingValues = new Map<string, Set<any>>();
    
    for (const field of uniqueFields) {
      const values = new Set<any>();
      for (const record of existingRecords) {
        if (record[field] !== null && record[field] !== undefined) {
          values.add(record[field]);
        }
      }
      existingValues.set(field, values);
    }
    
    return existingValues;
  }

  /**
   * Validates and transforms data according to mappings and rules
   */
  async validateAndTransform(
    data: any[],
    mappings: FieldMapping[],
    targetTable: string,
    existingRecords?: any[]
  ): Promise<ValidationResult> {
    console.log('=== Starting validation ===');
    console.log('Data length:', data.length);
    console.log('Mappings:', mappings);
    console.log('Target table:', targetTable);
    
    const errors: string[] = [];
    const warnings: string[] = [];
    const transformedData: any[] = [];
    const rules = this.rules.get(targetTable) || [];

    // Check for uniqueness constraints
    const uniqueFields = rules.filter(rule => rule.unique).map(rule => rule.field);
    const existingValues = this.getExistingValues(existingRecords || [], uniqueFields);

    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const sourceRow = data[rowIndex];
      const transformedRow: any = {};

      for (const mapping of mappings) {
        const sourceValue = sourceRow[mapping.sourceField];
        const targetField = mapping.targetField;
        const fieldRules = rules.filter(rule => rule.field === targetField);

        console.log(`Processing mapping: ${mapping.sourceField} -> ${targetField}, value:`, sourceValue);

        // Transform value if needed
        let transformedValue = sourceValue;
        if (mapping.transformation) {
          console.log(`Applying transformation: ${mapping.transformation} to value:`, transformedValue);
          transformedValue = this.applyTransformation(sourceValue, mapping.transformation);
          console.log('Transformed value:', transformedValue);
        }

        // Validate field
        const fieldValidation = this.validateField(
          transformedValue,
          targetField,
          fieldRules,
          existingValues,
          rowIndex
        );

        console.log(`Field validation result:`, {
          isValid: fieldValidation.isValid,
          errorsCount: fieldValidation.errors.length,
          warningsCount: fieldValidation.warnings.length
        });

        errors.push(...fieldValidation.errors);
        warnings.push(...fieldValidation.warnings);

        // Only add valid values to transformed data
        if (fieldValidation.isValid) {
          transformedRow[targetField] = transformedValue;
          console.log(`Added to transformed row: ${targetField} =`, transformedValue);
        }
      }

      transformedData.push(transformedRow);
    }

    console.log('=== Validation completed ===');
    console.log('Transformed data length:', transformedData.length);
    console.log('Total errors:', errors.length);
    console.log('Total warnings:', warnings.length);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      transformedData
    };
  }

  /**
   * Validates a single field value
   */
  private validateField(
    value: any,
    fieldName: string,
    rules: ValidationRule[],
    existingValues: Map<string, Set<any>>,
    rowIndex: number
  ): { isValid: boolean; errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let isValid = true;

    for (const rule of rules) {
      // Required validation
      if (rule.required && (value === null || value === undefined || value === '')) {
        errors.push({
          field: fieldName,
          message: `Поле "${fieldName}" обязательно для заполнения`,
          row: rowIndex,
          severity: 'error'
        });
        isValid = false;
        continue;
      }

      // Skip other validations if value is empty and not required
      if (value === null || value === undefined || value === '') {
        continue;
      }

      // Type validation
      if (rule.type && !this.validateType(value, rule.type)) {
        errors.push({
          field: fieldName,
          message: `Поле "${fieldName}" должно быть типа ${rule.type}`,
          row: rowIndex,
          severity: 'error'
        });
        isValid = false;
      }

      // Length validation
      if (typeof value === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push({
            field: fieldName,
            message: `Поле "${fieldName}" должно содержать минимум ${rule.minLength} символов`,
            row: rowIndex,
            severity: 'error'
          });
          isValid = false;
        }

        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push({
            field: fieldName,
            message: `Поле "${fieldName}" должно содержать максимум ${rule.maxLength} символов`,
            row: rowIndex,
            severity: 'error'
          });
          isValid = false;
        }
      }

      // Pattern validation
      if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
        errors.push({
          field: fieldName,
          message: `Поле "${fieldName}" не соответствует требуемому формату`,
          row: rowIndex,
          severity: 'error'
        });
        isValid = false;
      }

      // Uniqueness validation
      if (rule.unique) {
        const existingSet = existingValues.get(fieldName);
        if (existingSet && existingSet.has(value)) {
          errors.push({
            field: fieldName,
            message: `Значение "${value}" в поле "${fieldName}" уже существует`,
            row: rowIndex,
            severity: 'error'
          });
          isValid = false;
        }
      }

      // Custom validation
      if (rule.custom) {
        const customResult = rule.custom(value);
        if (customResult !== true) {
          const message = typeof customResult === 'string' ? customResult : `Поле "${fieldName}" не прошло пользовательскую валидацию`;
          errors.push({
            field: fieldName,
            message,
            row: rowIndex,
            severity: 'error'
          });
          isValid = false;
        }
      }
    }

    return { isValid, errors, warnings };
  }

  /**
   * Validates data type
   */
  private validateType(value: any, expectedType: string): boolean {
    switch (expectedType.toLowerCase()) {
      case 'string':
      case 'varchar':
      case 'text':
      case 'char':
      case 'nvarchar':
        return typeof value === 'string';
      
      case 'number':
      case 'integer':
      case 'int':
      case 'bigint':
      case 'smallint':
      case 'decimal':
      case 'numeric':
        // Позволяем числа и строки, которые могут быть конвертированы в числа
        if (typeof value === 'number') return true;
        if (typeof value === 'string') {
          // Проверяем, является ли строка числом (с возможными пробелами и символами)
          const cleanValue = value.replace(/[\s\-\+\(\)]/g, '');
          return !isNaN(Number(cleanValue)) && cleanValue !== '';
        }
        return false;
      
      case 'boolean':
      case 'bool':
      case 'bit':
        // Позволяем boolean и строки 'true'/'false'
        if (typeof value === 'boolean') return true;
        if (typeof value === 'string') {
          const lowerValue = value.toLowerCase().trim();
          return ['true', 'false', '1', '0', 'yes', 'no', 'да', 'нет', 'on', 'off'].includes(lowerValue);
        }
        return false;
      
      case 'email':
        return typeof value === 'string' && this.isValidEmail(value);
      
      case 'phone':
        return typeof value === 'string' && this.isValidPhone(value);
      
      case 'uuid':
        return typeof value === 'string' && this.isValidUUID(value);
      
      case 'date':
      case 'datetime':
      case 'timestamp':
      case 'timstamptz':
        return !isNaN(Date.parse(value)) && value !== '';
      
      case 'url':
        return typeof value === 'string' && this.isValidURL(value);
      
      default:
        return true; // Для неизвестных типов разрешаем все
    }
  }

  /**
   * Applies data transformation
   */
  private applyTransformation(value: any, transformation: string): any {
    if (value === null || value === undefined) {
      return value;
    }

    switch (transformation) {
      case 'parse_date':
        const date = new Date(value);
        return isNaN(date.getTime()) ? value : date.toISOString();
      
      case 'string_to_boolean':
        if (typeof value === 'string') {
          const lowerValue = value.toLowerCase().trim();
          return ['true', 'yes', '1', 'да', 'истина', 'on'].includes(lowerValue);
        }
        return Boolean(value);
      
      case 'string_to_uuid':
        if (typeof value === 'string') {
          const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          return uuidPattern.test(value) ? value : null;
        }
        return value;
      
      case 'normalize_phone':
        if (typeof value === 'string') {
          const digits = value.replace(/\D/g, '');
          if (digits.length === 11 && digits.startsWith('8')) {
            return '+7' + digits.substring(1);
          }
          if (digits.length === 10) {
            return '+7' + digits;
          }
          if (digits.length === 11 && digits.startsWith('7')) {
            return '+' + digits;
          }
        }
        return value;
      
      case 'normalize_email':
        if (typeof value === 'string') {
          return value.toLowerCase().trim();
        }
        return value;
      
      case 'trim_string':
        return typeof value === 'string' ? value.trim() : value;
      
      case 'concatenate_with_existing':
        if (typeof value === 'string' && existingValue) {
          return `${existingValue} | ${value}`;
        } else if (typeof value === 'string') {
          return value;
        }
        return existingValue || value;
      
      default:
        return value;
    }
  }

  /**
   * Validates email address
   */
  private isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    
    // Более гибкая валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Validates phone number
   */
  private isValidPhone(phone: string): boolean {
    if (!phone || typeof phone !== 'string') return false;
    
    // Убираем все символы кроме цифр и оставляем минимум 10 цифр
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
  }

  /**
   * Validates UUID
   */
  private isValidUUID(uuid: string): boolean {
    if (!uuid || typeof uuid !== 'string') return false;
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid.trim());
  }

  /**
   * Validates URL
   */
  private isValidURL(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    
    try {
      new URL(url.trim());
      return true;
    } catch {
      // Если не удалось создать URL, проверяем базовый формат
      return url.includes('://') || url.includes('www.');
    }
  }

  /**
   * Predefined validation rules for common tables
   */
  static getCommonRules(): Record<string, ValidationRule[]> {
    return {
      'пользователи': [
        { field: 'электронная_почта', required: true, type: 'email', unique: true },
        { field: 'имя', type: 'string' }, // Убрали maxLength
        { field: 'фамилия', type: 'string' }, // Убрали maxLength
        { field: 'телефон', type: 'phone' },
        { field: 'компания', type: 'string' }, // Убрали maxLength
        { field: 'должность', type: 'string' }, // Убрали maxLength
        { field: 'телеграмма', type: 'string', maxLength: 100 },
        { field: 'реферальный_код', type: 'string', unique: true, maxLength: 50 }
      ],
      
      'контакты': [
        { field: 'имя', type: 'string' }, // Убрали maxLength
        { field: 'фамилия', type: 'string' }, // Убрали maxLength
        { field: 'компания', type: 'string' }, // Убрали maxLength
        { field: 'должность', type: 'string' }, // Убрали maxLength
        { field: 'linkedin_url', type: 'url' },
        { field: 'google_id', type: 'string', maxLength: 100 },
        { field: 'день_рождения', type: 'date' }
      ],
      
      'контактные_электронные_почты': [
        { field: 'электронная_почта', required: true, type: 'email' },
        { field: 'этикетка', type: 'string', maxLength: 100 }
      ],
      
      'контактные_телефоны': [
        { field: 'телефон', required: true, type: 'phone' },
        { field: 'этикетка', type: 'string', maxLength: 100 }
      ],
      
      'контактные_адреса': [
        { field: 'улица', type: 'string' }, // Убрали maxLength
        { field: 'город', type: 'string' }, // Убрали maxLength
        { field: 'состояние', type: 'string' }, // Убрали maxLength
        { field: 'почтовый_индекс', type: 'string', maxLength: 20 },
        { field: 'страна', type: 'string', maxLength: 100 },
        { field: 'этикетка', type: 'string', maxLength: 100 }
      ]
    };
  }
}
