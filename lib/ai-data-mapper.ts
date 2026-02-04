import { NeuralMapper, NeuralMappingResult } from './neural-mapper';

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  confidence: number;
  transformation?: string;
  neuralReasoning?: string;
}

export interface MappingResult {
  mappings: FieldMapping[];
  confidence: number;
  suggestions: string[];
  neuralInsights?: string[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  sampleValues?: any[];
  nullable?: boolean;
}

export interface TableSchema {
  tableName: string;
  columns: ColumnInfo[];
}

export class AIDataMapper {
  private fieldSynonyms: Record<string, string[]> = {
    // Name fields - максимально расширенные синонимы
    'имя': [
      'name', 'first_name', 'given_name', 'имя', 'им', 'fname', 'first', 'имя_клиента', 'клиент', 'client_name', 'contact_name',
      'first_name', 'firstname', 'given_name', 'forename', 'personal_name', 'имя_сотрудника', 'employee_name',
      'имя_пользователя', 'user_name', 'имя_контакта', 'contact_firstname', 'person_name', 'имя_человека'
    ],
    'фамилия': [
      'surname', 'last_name', 'family_name', 'фамилия', 'lname', 'last', 'фамилию', 'фамилия_клиента', 'client_lastname', 'contact_lastname',
      'lastname', 'familyname', 'surname_name', 'фамилия_сотрудника', 'employee_lastname', 'фамилия_пользователя', 'user_lastname',
      'фамилия_контакта', 'contact_lastname', 'person_lastname', 'вторая_имя', 'second_name'
    ],
    
    // Contact fields - все возможные варианты для электронной почты
    'электронная_почта': [
      'email', 'mail', 'e_mail', 'email_address', 'почта', 'мыло', 'email_address', 'e-mail', 'mail_address', 'email_contact', 'contact_email',
      'email_address', 'emailaddr', 'e_mail', 'electronic_mail', 'emailaddr', 'mail_addr', 'email_addr', 'электронный_адрес',
      'email_адрес', 'почтовый_адрес', 'email_contact', 'contact_email', 'user_email', 'work_email', 'personal_email',
      'business_email', 'email_address', 'emailaddr', 'mail_box', 'почтовый_ящик', 'electronicmail', 'электроннаяпочта',
      'электронная почта', 'eлектронная_почта', 'e_mail', 'electronicmail', 'mail_address', 'адрес_электронной_почты',
      'адрес почты', 'почтовый_адрес', 'электронная почта', 'электронная_почта_адрес', 'email_пользователя',
      'контактная_почта', 'рабочая_почта', 'личная_почта', 'персональная_почта'
    ],
    'телефон': [
      'phone', 'telephone', 'mobile', 'cell', 'телефон', 'тел', 'phone_number', 'mobile_phone', 'cell_phone', 'contact_phone', 'tel', 'phone_no',
      'telephone_number', 'mobile_number', 'cell_number', 'phone_num', 'tel_number', 'контактный_телефон', 'work_phone', 'home_phone',
      'business_phone', 'personal_phone', 'phone_mobile', 'мобильный', 'сотовый', 'номер_телефона', 'phone_contact', 'tel_no',
      'phone_ext', 'telephone_ext', 'phone_extension', 'рабочий_телефон', 'домашний_телефон', 'телефонный_номер',
      'контактный_телефон', 'мобильный_телефон', 'рабочий_номер', 'личный_телефон', 'номер_телефона'
    ],
    
    // Professional fields - полный спектр
    'компания': [
      'company', 'organization', 'org', 'firm', 'компания', 'организация', 'workplace', 'employer', 'business', 'corp', 'corporation', 'work_company', 'client_company',
      'company_name', 'org_name', 'firm_name', 'business_name', 'corp_name', 'organization_name', 'workplace_name', 'employer_name',
      'название_компании', 'организация_работы', 'фирма', 'предприятие', 'работодатель', 'бизнес', 'корпорация', 'юрлицо',
      'client_organization', 'partner_company', 'vendor_company', 'supplier_company', 'service_company', 'client_firm',
      'компания_работодателя', 'организация_работы', 'фирма_работодателя', 'предприятие_работы'
    ],
    'должность': [
      'position', 'job_title', 'role', 'title', 'должность', 'позиция', 'job', 'position_title', 'job_role', 'work_position', 'role_title',
      'job_title', 'position_name', 'role_name', 'work_role', 'job_position', 'employment_title', 'work_title', 'position_role',
      'должность_работы', 'профессия', 'специальность', 'рабочая_позиция', 'трудовая_функция', 'job_function', 'work_function',
      'position_level', 'job_level', 'role_level', 'seniority', 'rank', 'grade', 'job_grade', 'должность_работника',
      'профессиональный_статус', 'рабочая_позиция', 'должностные_обязанности'
    ],
    
    // Location fields - детальные варианты
    'город': [
      'city', 'town', 'location', 'город', 'town', 'city_name', 'town_name', 'work_city', 'contact_city',
      'city_location', 'town_location', 'место', 'населенный_пункт', 'городок', 'location_city', 'address_city',
      'work_town', 'hometown', 'resident_city', 'living_city', 'city_of_residence', 'город_проживания',
      'город_жительства', 'местожительство'
    ],
    'страна': [
      'country', 'nation', 'страна', 'country_code', 'country_name', 'nation_name',
      'country_region', 'nation_region', 'государство', 'страна_код', 'country_iso', 'nation_iso',
      'country_of_residence', 'nationality', 'citizenship', 'гражданство', 'родина', 'страна_гражданства'
    ],
    'адрес': [
      'address', 'location', 'addr', 'адрес', 'address_line', 'street_address', 'work_address', 'contact_address',
      'address_line1', 'address_line2', 'street', 'улица', 'адрес_проживания', 'home_address', 'workplace_address',
      'full_address', 'complete_address', 'address_location', 'location_address', 'resident_address',
      'почтовый_адрес', 'адрес_проживания', 'адрес_регистрации', 'юридический_адрес'
    ],
    
    // Social fields - все соцсети
    'телеграмма': [
      'telegram', 'tg', 'telegram_handle', 'телеграм', 'tg_username', 'telegram_user', 'tg_handle',
      'telegram_id', 'tg_id', 'telegram_username', 'telegram_link', 'telegram_profile', 'tg_profile',
      'telegram_account', 'tg_account', 'телеграм_аккаунт', 'телеграм_профиль', 'telegram_никнейм', 'tg_никнейм',
      'телеграм_контакт', 'telegram_контакт', 'телеграммный_адрес', 'telegram_адрес'
    ],
    'linkedin_url': [
      'linkedin', 'linked_in', 'linkedin_profile', 'linkedin_url', 'linkedin_link', 'social_linkedin',
      'linkedin_handle', 'linkedin_username', 'linkedin_id', 'linkedin_account', 'linkedin_profile_url',
      'linkedin_profile_link', 'linkedin_network', 'linkedin_social', 'linkedin_connect', 'linkedin_профиль',
      'linkedin_контакт', 'linkedin_адрес', 'linkedin_ссылка'
    ],
    
    // Time fields - все временные поля
    'создано_в': [
      'created_at', 'created', 'creation_date', 'date_created', 'создано', 'created_time', 'timestamp_created', 'date_added',
      'creation_timestamp', 'date_of_creation', 'time_created', 'created_on', 'creation_time', 'timestamp_creation',
      'date_inserted', 'time_inserted', 'inserted_at', 'inserted_on', 'registration_date', 'signup_date',
      'дата_создания', 'время_создания', 'момент_создания', 'когда_создано'
    ],
    'обновлено_в': [
      'updated_at', 'updated', 'modification_date', 'date_updated', 'обновлено', 'modified', 'timestamp_updated', 'date_modified',
      'modification_timestamp', 'date_of_modification', 'time_updated', 'updated_on', 'modification_time', 'timestamp_modification',
      'last_updated', 'last_modified', 'recently_updated', 'date_changed', 'time_changed', 'changed_at',
      'дата_обновления', 'время_обновления', 'момент_обновления', 'когда_обновлено'
    ],
    'день_рождения': [
      'birthday', 'birth_date', 'dob', 'date_of_birth', 'день_рождения', 'birthday_date', 'birth_day',
      'birth_timestamp', 'date_of_birth', 'time_of_birth', 'born_on', 'born_date', 'birth_datetime',
      'date_born', 'birthday_timestamp', 'dob_date', 'birth_day_date', 'дата_рождения', 'время_рождения'
    ],
    
    // Other common fields - максимально подробно
    'аватар_url': [
      'avatar', 'photo', 'picture', 'image_url', 'profile_image', 'аватар', 'фото', 'profile_photo', 'user_photo', 'picture_url',
      'profile_picture', 'user_avatar', 'avatar_image', 'photo_url', 'picture_link', 'image_link', 'profile_pic',
      'user_picture', 'avatar_url', 'photo_link', 'image_src', 'profile_src', 'avatar_src', 'фотография',
      'аватарка', 'изображение', 'картинка', 'фотография_пользователя', 'profile_image_url'
    ],
    'примечания': [
      'notes', 'comments', 'description', 'remarks', 'примечания', 'заметки', 'note', 'comment', 'user_notes',
      'additional_notes', 'extra_notes', 'special_notes', 'important_notes', 'personal_notes', 'work_notes',
      'description_text', 'comment_text', 'note_text', 'remark_text', 'annotation', 'memo', 'memorandum',
      'дополнительная_информация', 'комментарии', 'описание', 'замечания', 'пояснения', 'bio', 'биография',
      'about', 'about_me', 'profile', 'profile_info', 'personal_info', 'summary', 'professional_summary',
      'work_description', 'personal_description', 'profile_description', 'био', 'обо_мне', 'профиль'
    ],
    'источник': [
      'source', 'origin', 'from', 'источник', 'source_system', 'data_source', 'origin_source',
      'source_type', 'origin_type', 'source_category', 'origin_category', 'source_name', 'origin_name',
      'source_reference', 'origin_reference', 'source_id', 'origin_id', 'source_location', 'origin_location',
      'источник_данных', 'происхождение', 'откуда', 'место_источника'
    ],
    'идентификатор': [
      'id', 'identifier', 'uuid', 'primary_key', 'идентификатор', 'user_id', 'record_id', 'entity_id',
      'unique_id', 'unique_identifier', 'primary_identifier', 'key_id', 'main_id', 'entity_identifier',
      'record_identifier', 'object_id', 'element_id', 'item_id', 'reference_id', 'guid', 'unique_key',
      'идентификационный_номер', 'уникальный_идентификатор', 'первичный_ключ'
    ]
  };

  private dataTypeMapping: Record<string, string[]> = {
    'VARCHAR': ['text', 'string', 'varchar', 'char', 'nvarchar'],
    'TEXT': ['text', 'string', 'longtext', 'mediumtext', 'clob'],
    'INTEGER': ['int', 'integer', 'number', 'numeric', 'bigint', 'smallint'],
    'BOOLEAN': ['bool', 'boolean', 'bit', 'yesno', 'flag'],
    'TIMESTAMPTZ': ['timestamp', 'datetime', 'date', 'time', 'created_at', 'updated_at'],
    'UUID': ['uuid', 'guid', 'unique_id', 'uniqueidentifier'],
    'JSONB': ['json', 'jsonb', 'object', 'array', 'text'],
    'DATE': ['date', 'datetime', 'timestamp']
  };

  private neuralMapper: NeuralMapper;

  constructor() {
    this.neuralMapper = new NeuralMapper();
  }

  /**
   * Analyzes source and target schemas and suggests intelligent field mappings
   */
  async analyzeAndMap(
    sourceSchema: TableSchema,
    targetSchema: TableSchema
  ): Promise<MappingResult> {
    const mappings: FieldMapping[] = [];
    const suggestions: string[] = [];
    const neuralInsights: string[] = [];
    let totalConfidence = 0;

    for (const targetColumn of targetSchema.columns) {
      const bestMatch = this.findBestMatch(targetColumn, sourceSchema.columns);
      
      if (bestMatch && bestMatch.confidence > 0.3) {
        // Добавляем нейронные инсайты
        const neuralResults = this.neuralMapper.neuralClassify(
          bestMatch.sourceColumn.name, 
          (bestMatch.sourceColumn.sampleValues || []).map(String)
        );
        
        // Добавляем нейронные инсайты к маппингу
        const topNeuralResult = neuralResults[0];
        let neuralReasoning = '';
        let neuralSuggestions: string[] = [];
        let neuralInsights: string[] = [];
        
        if (topNeuralResult) {
          neuralReasoning = topNeuralResult.reasoning;
          neuralSuggestions = topNeuralResult.suggestions || [];
          neuralInsights = topNeuralResult.insights || [];
          neuralInsights.push(`${bestMatch.sourceColumn.name} → ${targetColumn.name}: ${topNeuralResult.reasoning}`);
        }

        mappings.push({
          sourceField: bestMatch.sourceColumn.name,
          targetField: targetColumn.name,
          confidence: bestMatch.confidence,
          transformation: bestMatch.transformation,
          neuralReasoning,
          neuralSuggestions,
          neuralInsights
        });
        totalConfidence += bestMatch.confidence;
      } else {
        suggestions.push(
          `Не найдено соответствие для поля "${targetColumn.name}". Рассмотрите ручное сопоставление.`
        );
      }
    }

    // Check for unmapped source columns and add them to примечания
    const mappedSourceFields = new Set(mappings.map(m => m.sourceField));
    const unmappedSourceColumns = sourceSchema.columns.filter(col => !mappedSourceFields.has(col.name));
    
    for (const unmappedColumn of unmappedSourceColumns) {
      // Проверяем, есть ли у нас поле примечания в целевой схеме
      const notesField = targetSchema.columns.find(col => col.name === 'примечания');
      
      if (notesField && unmappedColumn.sampleValues && unmappedColumn.sampleValues.length > 0) {
        // Проверяем, есть ли в данных текстовая информация
        const hasTextData = unmappedColumn.sampleValues.some(val => 
          typeof val === 'string' && val.trim().length > 10
        );
        
        if (hasTextData) {
          mappings.push({
            sourceField: unmappedColumn.name,
            targetField: 'примечания',
            confidence: 0.6, // Средняя уверенность для непонятных полей
            transformation: 'concatenate_with_existing',
            neuralReasoning: 'Поле не распознано, но содержит текстовую информацию. Добавлено в примечания.',
            neuralSuggestions: ['Рассмотрите ручное сопоставление этого поля'],
            neuralInsights: [`Содержит ${unmappedColumn.sampleValues.length} значений`, 'Тип: текстовые данные']
          });
          
          neuralInsights.push(`${unmappedColumn.name} → примечания: Непонятное поле с текстовыми данными добавлено в примечания`);
          totalConfidence += 0.6;
        }
      }
    }

    return {
      mappings,
      confidence: mappings.length > 0 ? totalConfidence / mappings.length : 0,
      suggestions,
      neuralInsights
    };
  }

  /**
   * Finds the best matching source column for a target column
   */
  private findBestMatch(
    targetColumn: ColumnInfo,
    sourceColumns: ColumnInfo[]
  ): { sourceColumn: ColumnInfo; confidence: number; transformation?: string } | null {
    let bestMatch = null;
    let maxConfidence = 0;

    for (const sourceColumn of sourceColumns) {
      const confidence = this.calculateMatchConfidence(targetColumn, sourceColumn);
      
      if (confidence > maxConfidence) {
        maxConfidence = confidence;
        bestMatch = {
          sourceColumn,
          confidence,
          transformation: this.suggestTransformation(targetColumn, sourceColumn)
        };
      }
    }

    return bestMatch;
  }

  /**
   * Calculates confidence score for field matching - ПРОСТАЯ И НАДЕЖНАЯ ВЕРСИЯ
   */
  private calculateMatchConfidence(targetColumn: ColumnInfo, sourceColumn: ColumnInfo): number {
    let confidence = 0;

    // Exact name match - максимальная уверенность
    if (targetColumn.name.toLowerCase() === sourceColumn.name.toLowerCase()) {
      return 1.0;
    }

    // Synonym matching
    const targetSynonyms = this.getSynonyms(targetColumn.name);
    const sourceSynonyms = this.getSynonyms(sourceColumn.name);
    
    for (const targetSyn of targetSynonyms) {
      for (const sourceSyn of sourceSynonyms) {
        if (targetSyn.toLowerCase() === sourceSyn.toLowerCase()) {
          confidence += 0.9;
          return Math.min(confidence, 1.0);
        }
      }
    }

    // Partial name matching
    const targetWords = targetColumn.name.toLowerCase().split(/[_\s\-]+/);
    const sourceWords = sourceColumn.name.toLowerCase().split(/[_\s\-]+/);
    
    for (const targetWord of targetWords) {
      for (const sourceWord of sourceWords) {
        if (targetWord === sourceWord && targetWord.length > 2) {
          confidence += 0.5;
        } else if (targetWord.includes(sourceWord) || sourceWord.includes(targetWord)) {
          confidence += 0.3;
        }
      }
    }

    // Data type compatibility
    const typeCompatibility = this.getTypeCompatibility(targetColumn.type, sourceColumn.type);
    confidence += typeCompatibility * 0.2;

    // Sample value analysis
    if (sourceColumn.sampleValues && sourceColumn.sampleValues.length > 0) {
      const valueConfidence = this.analyzeSampleValues(targetColumn, sourceColumn.sampleValues);
      confidence += valueConfidence * 0.3;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Gets synonyms for a field name
   */
  private getSynonyms(fieldName: string): string[] {
    const normalizedName = fieldName.toLowerCase().replace(/[_\s]+/g, '_');
    
    for (const [canonical, synonyms] of Object.entries(this.fieldSynonyms)) {
      if (synonyms.some(syn => syn.toLowerCase() === normalizedName)) {
        return [canonical, ...synonyms];
      }
    }
    
    return [fieldName];
  }

  /**
   * Checks data type compatibility
   */
  private getTypeCompatibility(targetType: string, sourceType: string): number {
    const targetCompatible = this.dataTypeMapping[targetType] || [targetType];
    const sourceCompatible = this.dataTypeMapping[sourceType] || [sourceType];
    
    for (const target of targetCompatible) {
      for (const source of sourceCompatible) {
        if (target.toLowerCase() === source.toLowerCase()) {
          return 1.0;
        }
      }
    }
    
    // Special cases for compatible types
    if (targetType.includes('VARCHAR') && sourceType.includes('TEXT')) return 0.9;
    if (targetType.includes('TEXT') && sourceType.includes('VARCHAR')) return 0.9;
    if (targetType.includes('INTEGER') && sourceType.includes('BIGINT')) return 0.8;
    
    return 0.1;
  }

  /**
   * Analyzes sample values to determine field type
   */
  private analyzeSampleValues(targetColumn: ColumnInfo, sampleValues: any[]): number {
    if (sampleValues.length === 0) return 0;

    const targetName = targetColumn.name.toLowerCase();
    const nonEmptyValues = sampleValues.filter(v => v !== null && v !== undefined && v !== '');
    
    if (nonEmptyValues.length === 0) return 0;

    // Email detection с улучшенной логикой
    if (targetName.includes('mail') || targetName.includes('почта')) {
      const emailCount = nonEmptyValues.filter(v => 
        typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
      ).length;
      return emailCount / nonEmptyValues.length;
    }

    // Phone detection с улучшенными паттернами
    if (targetName.includes('phone') || targetName.includes('телефон')) {
      const phoneCount = nonEmptyValues.filter(v => 
        typeof v === 'string' && this.isValidPhone(v)
      ).length;
      return phoneCount / nonEmptyValues.length;
    }

    // Name detection - проверяем на имена
    if (targetName.includes('name') || targetName.includes('имя')) {
      const nameCount = nonEmptyValues.filter(v => 
        typeof v === 'string' && this.isValidName(v)
      ).length;
      return nameCount / nonEmptyValues.length;
    }

    // Company name detection
    if (targetName.includes('company') || targetName.includes('компания') || targetName.includes('org')) {
      const companyCount = nonEmptyValues.filter(v => 
        typeof v === 'string' && this.isValidCompanyName(v)
      ).length;
      return companyCount / nonEmptyValues.length;
    }

    // Date detection с улучшенными форматами
    if (targetName.includes('date') || targetName.includes('время') || targetName.includes('birthday')) {
      const dateCount = nonEmptyValues.filter(v => 
        this.isValidDate(v)
      ).length;
      return dateCount / nonEmptyValues.length;
    }

    // URL detection
    if (targetName.includes('url') || targetName.includes('link') || targetName.includes('profile')) {
      const urlCount = nonEmptyValues.filter(v => 
        typeof v === 'string' && this.isValidUrl(v)
      ).length;
      return urlCount / nonEmptyValues.length;
    }

    return 0.1;
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
    if (name.length > 50) return false; // Слишком длинно для имени
    
    // Имя должно содержать только буквы, пробелы, дефисы
    const namePattern = /^[a-zA-Zа-яА-Я\s\-']+$/;
    return namePattern.test(name) && !this.isValidEmail(name) && !this.isValidPhone(name);
  }

  /**
   * Проверяет валидность названия компании
   */
  private isValidCompanyName(company: string): boolean {
    if (typeof company !== 'string' || company.length < 2) return false;
    
    // Название компании не должно быть email или телефоном
    if (this.isValidEmail(company) || this.isValidPhone(company)) return false;
    
    // Компании обычно содержат буквы, цифры, пробелы, знаки препинания
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
   * Suggests data transformation if needed
   */
  private suggestTransformation(targetColumn: ColumnInfo, sourceColumn: ColumnInfo): string | undefined {
    const targetType = targetColumn.type.toUpperCase();
    const sourceType = sourceColumn.type.toUpperCase();

    // Date format transformations
    if (targetType.includes('TIMESTAMP') && sourceType.includes('VARCHAR')) {
      return 'parse_date';
    }

    // Boolean transformations
    if (targetType.includes('BOOLEAN') && sourceType.includes('VARCHAR')) {
      return 'string_to_boolean';
    }

    // UUID transformations
    if (targetType.includes('UUID') && sourceType.includes('VARCHAR')) {
      return 'string_to_uuid';
    }

    return undefined;
  }

  /**
   * Transforms data based on suggested transformation
   */
  transformValue(value: any, transformation?: string): any {
    if (!transformation || value === null || value === undefined) {
      return value;
    }

    switch (transformation) {
      case 'parse_date':
        return new Date(value);
      
      case 'string_to_boolean':
        if (typeof value === 'string') {
          const lowerValue = value.toLowerCase();
          return ['true', 'yes', '1', 'да', 'истина'].includes(lowerValue);
        }
        return Boolean(value);
      
      case 'string_to_uuid':
        return value; // Assuming the string is already a valid UUID
      
      default:
        return value;
    }
  }
}
