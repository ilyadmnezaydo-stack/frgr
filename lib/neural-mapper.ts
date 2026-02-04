export interface NeuralMappingResult {
  field: string;
  confidence: number;
  reasoning: string;
  pattern: string;
  suggestions?: string[];
  insights?: string[];
}

export class NeuralMapper {
  private patterns: Map<string, RegExp[]> = new Map();
  private contextAnalyzer: Map<string, string[]> = new Map();
  private businessRules: Map<string, string[]> = new Map();
  
  constructor() {
    this.initializePatterns();
    this.initializeContextAnalyzer();
    this.initializeBusinessRules();
  }

  /**
   * Инициализация паттернов
   */
  private initializePatterns(): void {
    this.patterns.set('email', [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      /\w+@\w+\.\w+/,
      /.*@.*\..*/,
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    ]);
    
    this.patterns.set('phone', [
      /^\+?\d{10,15}$/,
      /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/,
      /\(\d{3}\)\s*\d{3}[-.\s]?\d{4}/,
      /^\+7\d{10}$/,
      /^8\d{10}$/
    ]);
    
    this.patterns.set('name', [
      /^[A-Za-zА-Яа-я\s\-']+$/,
      /^[A-Z][a-z]+\s[A-Z][a-z]+$/,
      /^[А-Я][а-я]+\s[А-Я][а-я]+$/,
      /^[A-Za-zА-Яа-я]{2,50}$/,
      /^[A-Z][a-z]+\s[A-Z]\.?\s*[A-Za-z]+$/
    ]);

    this.patterns.set('company', [
      /^[A-Za-zА-Яа-я0-9\s\-\.\&\,\(\)]+$/,
      /(Inc|Corp|LLC|ООО|ЗАО|ИП|Ltd|GmbH|SARL)/i,
      /^[A-Z][a-zA-Z\s]+/,
      /^[A-Za-zА-Яа-я]+(?:\s+(?:Group|Group|Solutions|Technologies|Systems|Digital|Agency|Studio))/i
    ]);

    this.patterns.set('telegram', [
      /^@[a-zA-Z0-9_]{3,32}$/,
      /^[a-zA-Z0-9_]{3,32}$/,
      /^t\.me\/[a-zA-Z0-9_]{3,32}$/,
      /t\.me\/[a-zA-Z0-9_]+/,
      /@[a-zA-Z0-9_]+/,
      /^[a-zA-Z0-9_]+$/,
      /https?:\/\/t\.me\/[a-zA-Z0-9_]+/
    ]);

    this.patterns.set('linkedin', [
      /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+/,
      /^linkedin\.com\/in\/[a-zA-Z0-9-]+/,
      /\/in\/[a-zA-Z0-9-]+/,
      /linkedin/,
      /^[a-zA-Z0-9-]{3,100}$/
    ]);

    this.patterns.set('instagram', [
      /^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]+/,
      /^instagram\.com\/[a-zA-Z0-9_.]+/,
      /instagram\.com/,
      /@[a-zA-Z0-9_.]+/,
      /^[a-zA-Z0-9_.]{3,30}$/
    ]);

    this.patterns.set('twitter', [
      /^https?:\/\/(www\.)?twitter\.com\/[a-zA-Z0-9_]+/,
      /^twitter\.com\/[a-zA-Z0-9_]+/,
      /twitter\.com/,
      /@[a-zA-Z0-9_]+/,
      /^[a-zA-Z0-9_]{3,15}$/
    ]);

    this.patterns.set('social_media', [
      /https?:\/\/(www\.)?(facebook|instagram|twitter|linkedin|tiktok|youtube|github)\.com\/[a-zA-Z0-9_.-]+/,
      /@(?:instagram|twitter|tiktok|github)[a-zA-Z0-9_.]+/,
      /(facebook|instagram|twitter|linkedin|tiktok|youtube|github)/i,
      /social|profile|account/i
    ]);

    this.patterns.set('description', [
      /^.{10,}$/, // Убрали верхний лимит
      /^[A-Za-zА-Яа-я0-9\s\-\.\,\!\?\;\:\(\)]+$/,
      /.{50,}/,
      /(?:опыт|работа|навыки|проекты|образование|квалификация)/i,
      /(?:experience|skills|projects|education|qualification)/i
    ]);

    this.patterns.set('position', [
      /^(?:Senior|Junior|Lead|Principal|Chief|Head|Director|Manager|Specialist|Engineer|Developer|Designer|Analyst|Consultant)/i,
      /(?:Developer|Engineer|Manager|Director|Analyst|Designer|Specialist|Consultant)/i,
      /(?:Senior|Junior|Lead|Principal|Chief|Head)\s+(?:Developer|Engineer|Manager|Designer)/i,
      /^[A-Za-zА-Яа-я\s]{5,100}$/
    ]);
  }

  /**
   * Инициализация контекстного анализатора
   */
  private initializeContextAnalyzer(): void {
    this.contextAnalyzer.set('personal', [
      'personal', 'individual', 'person', 'личный', 'персональный', 'индивидуальный',
      'contact', 'communication', 'контакт', 'связь', 'общение'
    ]);
    
    this.contextAnalyzer.set('professional', [
      'work', 'job', 'career', 'business', 'работа', 'карьера', 'бизнес', 'профессия',
      'company', 'organization', 'компания', 'организация', 'фирма', 'предприятие'
    ]);
    
    this.contextAnalyzer.set('technical', [
      'tech', 'technical', 'it', 'software', 'тех', 'технический', 'софт', 'программный',
      'developer', 'engineer', 'programmer', 'разработчик', 'инженер', 'программист'
    ]);
  }

  /**
   * Инициализация бизнес-правил
   */
  private initializeBusinessRules(): void {
    this.businessRules.set('hierarchy', [
      'junior', 'middle', 'senior', 'lead', 'principal', 'chief', 'head', 'director',
      'младший', 'старший', 'ведущий', 'главный', 'руководитель', 'директор'
    ]);
    
    this.businessRules.set('departments', [
      'it', 'hr', 'sales', 'marketing', 'finance', 'operations', 'legal',
      'ит', 'кадры', 'продажи', 'маркетинг', 'финансы', 'операции', 'юридический'
    ]);
  }

  /**
   * Ультра-умное нейронное распознавание типа поля
   */
  public neuralClassify(fieldName: string, sampleValues: string[] = []): NeuralMappingResult[] {
    const results: NeuralMappingResult[] = [];
    
    // Анализ по каждому типу поля с улучшенной логикой
    for (const [fieldType, patterns] of this.patterns.entries()) {
      const result = this.calculateAdvancedNeuralConfidence(fieldName, fieldType, patterns, sampleValues);
      if (result.confidence > 0.2) { // Снизили порог для большего охвата
        results.push(result);
      }
    }

    // Сортируем по уверенности и добавляем дополнительные инсайты
    return results.sort((a, b) => b.confidence - a.confidence).map(result => ({
      ...result,
      suggestions: this.generateSuggestions(fieldName, result.field, sampleValues),
      insights: this.generateInsights(fieldName, result.field, sampleValues)
    }));
  }

  /**
   * Продвинутый расчет нейронной уверенности
   */
  private calculateAdvancedNeuralConfidence(
    fieldName: string, 
    fieldType: string, 
    patterns: RegExp[], 
    sampleValues: string[]
  ): NeuralMappingResult {
    let confidence = 0;
    const reasoning: string[] = [];
    const insights: string[] = [];

    // 1. Анализ названия поля с семантикой
    const nameAnalysis = this.analyzeFieldNameAdvanced(fieldName, fieldType);
    confidence += nameAnalysis.confidence * 0.35;
    reasoning.push(nameAnalysis.reasoning);

    // 2. Анализ значений с паттернами
    if (sampleValues.length > 0) {
      const valueAnalysis = this.analyzeSampleValuesAdvanced(sampleValues, patterns, fieldType);
      confidence += valueAnalysis.confidence * 0.45;
      reasoning.push(valueAnalysis.reasoning);
      insights.push(...valueAnalysis.insights);
    }

    // 3. Контекстный анализ
    const contextAnalysis = this.analyzeContextAdvanced(fieldName, fieldType);
    confidence += contextAnalysis.confidence * 0.15;
    reasoning.push(contextAnalysis.reasoning);

    // 4. Бизнес-правила
    const businessAnalysis = this.analyzeBusinessRules(fieldName, fieldType, sampleValues);
    confidence += businessAnalysis.confidence * 0.05;
    reasoning.push(businessAnalysis.reasoning);

    return {
      field: fieldType,
      confidence: Math.min(confidence, 1.0),
      reasoning: this.formatReasoning(reasoning),
      pattern: this.detectAdvancedPattern(fieldName, sampleValues, patterns),
      insights
    };
  }

  /**
   * Форматирует reasoning для лучшей читаемости
   */
  private formatReasoning(reasoningArray: string[]): string {
    return reasoningArray
      .map(r => r.replace(/; /g, ' | '))
      .join(' | ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Продвинутый анализ названия поля
   */
  private analyzeFieldNameAdvanced(fieldName: string, fieldType: string): { confidence: number; reasoning: string } {
    const name = fieldName.toLowerCase();
    let confidence = 0;
    const reasons: string[] = [];

    // Точное совпадение
    const exactMatches = this.getExactMatches(fieldType);
    if (exactMatches.includes(name)) {
      confidence += 0.95;
      reasons.push('Точное совпадение с именем поля');
    }

    // Частичное совпадение с весами
    const partialMatches = this.getPartialMatches(fieldType);
    for (const match of partialMatches) {
      if (name.includes(match) || match.includes(name)) {
        confidence += 0.7;
        reasons.push(`Частичное совпадение: "${match}"`);
        break;
      }
    }

    // Семантический анализ
    const semanticScore = this.calculateSemanticScore(fieldName, fieldType);
    if (semanticScore > 0.5) {
      confidence += semanticScore * 0.8;
      reasons.push(`Семантическая близость: ${Math.round(semanticScore * 100)}%`);
    }

    return {
      confidence,
      reasoning: reasons.join(', ') || 'Анализ названия не дал результатов'
    };
  }

  /**
   * Получение точных совпадений
   */
  private getExactMatches(fieldType: string): string[] {
    const matches: Record<string, string[]> = {
      'email': ['email', 'mail', 'e_mail', 'email_address', 'почта', 'мыло', 'электронная_почта', 'eлектронная почта', 'электроннаяпочта', 'e_mail', 'electronic_mail'],
      'phone': ['phone', 'telephone', 'mobile', 'cell', 'телефон', 'тел', 'phone_number', 'телефонный_номер'],
      'name': ['name', 'first_name', 'last_name', 'имя', 'фамилия', 'имя_пользователя', 'фамилия_пользователя'],
      'company': ['company', 'organization', 'org', 'компания', 'организация', 'фирма', 'предприятие'],
      'position': ['position', 'job_title', 'role', 'title', 'должность', 'позиция', 'должность_работника'],
      'telegram': ['telegram', 'телеграмма', 'tg', 'телеграм', 'telegram_handle', 'tg_username', 'telegram_user', 'tg_handle'],
      'linkedin': ['linkedin', 'linkedin_url', 'linkedin_profile', 'linkedin_profile_url', 'linkedin_link', 'linkedin_handle', 'linkedin_username'],
      'instagram': ['instagram', 'instagram_url', 'instagram_profile', 'instagram_handle', 'instagram_username', 'insta', 'ig'],
      'twitter': ['twitter', 'twitter_url', 'twitter_profile', 'twitter_handle', 'twitter_username', 'tw'],
      'social_media': ['social', 'social_media', 'social_links', 'social_profiles', 'social_accounts', 'соцсети', 'социальные_сети'],
      'description': ['description', 'bio', 'notes', 'comments', 'remarks', 'описание', 'био', 'заметки', 'комментарии', 'примечания', 'about', 'summary', 'profile']
    };
    return matches[fieldType] || [];
  }

  /**
   * Получение частичных совпадений
   */
  private getPartialMatches(fieldType: string): string[] {
    const matches: Record<string, string[]> = {
      'email': ['emailaddr', 'mailaddr', 'email_contact', 'contact_email', 'электронная_почта', 'адрес_электронной_почты'],
      'phone': ['phone_num', 'tel_number', 'contact_phone', 'mobile_phone', 'телефонный_номер', 'номер_телефона'],
      'name': ['fname', 'lname', 'firstname', 'lastname', 'person_name', 'имя_пользователя', 'фамилия_пользователя'],
      'company': ['company_name', 'org_name', 'work_company', 'client_company', 'название_компании', 'компания_работодателя'],
      'position': ['job_position', 'work_role', 'position_title', 'job_role', 'должность_работника', 'рабочая_позиция'],
      'telegram': ['telegram_username', 'tg_username', 'telegram_user', 'tg_user', 'telegram_account', 'tg_account', 'телеграм_аккаунт'],
      'linkedin': ['linkedin_profile_url', 'linkedin_link', 'linkedin_account', 'linkedin_personal', 'linkedin_business'],
      'instagram': ['instagram_profile', 'instagram_account', 'instagram_user', 'instagram_handle', 'insta_profile'],
      'twitter': ['twitter_profile', 'twitter_account', 'twitter_user', 'twitter_handle', 'twitter_link'],
      'social_media': ['social_links', 'social_profiles', 'social_accounts', 'social_media_links', 'social_networks'],
      'description': ['description_text', 'bio_text', 'profile_description', 'personal_description', 'work_description', 'professional_summary', 'about_me', 'profile_info', 'personal_info']
    };
    return matches[fieldType] || [];
  }

  /**
   * Расчет семантической близости
   */
  private calculateSemanticScore(fieldName: string, fieldType: string): number {
    const semanticGroups: Record<string, string[]> = {
      'email': ['communication', 'contact', 'message', 'сообщение', 'контакт'],
      'phone': ['communication', 'contact', 'call', 'звонок', 'связь'],
      'name': ['person', 'individual', 'identity', 'личность', 'идентичность'],
      'company': ['business', 'work', 'organization', 'бизнес', 'работа'],
      'position': ['role', 'function', 'job', 'роль', 'функция'],
      'telegram': ['messaging', 'chat', 'social', 'messenger', 'сообщение', 'чат', 'соцсеть', 'мессенджер'],
      'linkedin': ['professional', 'networking', 'career', 'business', 'work', 'профессиональный', 'карьера', 'бизнес'],
      'instagram': ['visual', 'photo', 'image', 'social', 'media', 'визуальный', 'фото', 'изображение'],
      'twitter': ['microblog', 'social', 'post', 'tweet', 'микроблог', 'социальный', 'пост'],
      'social_media': ['social', 'network', 'profile', 'account', 'социальный', 'сеть', 'профиль', 'аккаунт'],
      'description': ['text', 'content', 'information', 'details', 'текст', 'содержание', 'информация', 'описание', 'summary', 'profile', 'about']
    };

    const name = fieldName.toLowerCase();
    const group = semanticGroups[fieldType];
    
    if (!group) return 0;
    
    let matches = 0;
    for (const term of group) {
      if (name.includes(term)) {
        matches++;
      }
    }
    
    return matches / group.length;
  }

  /**
   * Продвинутый анализ значений
   */
  private analyzeSampleValuesAdvanced(sampleValues: string[], patterns: RegExp[], fieldType: string): { confidence: number; reasoning: string; insights: string[] } {
    if (sampleValues.length === 0) {
      return { confidence: 0, reasoning: 'Нет значений для анализа', insights: [] };
    }

    const insights: string[] = [];
    let matches = 0;
    let totalScore = 0;

    for (const value of sampleValues) {
      let valueScore = 0;
      for (const pattern of patterns) {
        if (pattern.test(value)) {
          valueScore = Math.max(valueScore, 1);
          break;
        }
      }
      totalScore += valueScore;
      if (valueScore > 0) matches++;
    }

    const confidence = totalScore / sampleValues.length;
    
    // Добавляем инсайты на основе анализа значений
    if (fieldType === 'email' && sampleValues.length > 0) {
      const domains = sampleValues.map(v => v.split('@')[1]).filter(Boolean);
      const uniqueDomains = new Set(domains);
      if (uniqueDomains.size > 1) {
        insights.push(`Найдено ${uniqueDomains.size} разных доменов email`);
      }
    }

    if (fieldType === 'phone' && sampleValues.length > 0) {
      const formats = sampleValues.map(v => {
        if (v.startsWith('+7')) return 'Международный';
        if (v.startsWith('8')) return 'Российский';
        return 'Другой';
      });
      const formatCounts = formats.reduce((acc, fmt) => {
        acc[fmt] = (acc[fmt] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      insights.push(`Форматы телефонов: ${Object.entries(formatCounts).map(([fmt, count]) => `${fmt} (${count})`).join(', ')}`);
    }

    if (fieldType === 'telegram' && sampleValues.length > 0) {
      const formats = sampleValues.map(v => {
        if (v.startsWith('@')) return 'Username (@)';
        if (v.startsWith('t.me/')) return 't.me ссылка';
        if (v.includes('t.me')) return 'Полная ссылка';
        return 'Простое имя';
      });
      const formatCounts = formats.reduce((acc, fmt) => {
        acc[fmt] = (acc[fmt] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      insights.push(`Форматы Telegram: ${Object.entries(formatCounts).map(([fmt, count]) => `${fmt} (${count})`).join(', ')}`);
    }

    if (fieldType === 'description' && sampleValues.length > 0) {
      const lengths = sampleValues.map(v => v.length);
      const avgLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
      insights.push(`Средняя длина описаний: ${Math.round(avgLength)} символов`);
      
      const hasKeywords = sampleValues.some(v => 
        /(?:опыт|работа|навыки|проекты|образование|квалификация|experience|skills|projects|education|qualification)/i.test(v)
      );
      if (hasKeywords) {
        insights.push('Содержит профессиональные ключевые слова');
      }
    }

    if (fieldType === 'linkedin' && sampleValues.length > 0) {
      const profiles = sampleValues.filter(v => v.includes('linkedin.com'));
      insights.push(`LinkedIn профили: ${profiles.length}`);
    }

    if (fieldType === 'instagram' && sampleValues.length > 0) {
      const profiles = sampleValues.filter(v => v.includes('instagram.com'));
      insights.push(`Instagram профили: ${profiles.length}`);
    }

    if (fieldType === 'twitter' && sampleValues.length > 0) {
      const profiles = sampleValues.filter(v => v.includes('twitter.com'));
      insights.push(`Twitter профили: ${profiles.length}`);
    }

    if (fieldType === 'social_media' && sampleValues.length > 0) {
      const platforms = new Set();
      sampleValues.forEach(v => {
        if (v.includes('linkedin.com')) platforms.add('LinkedIn');
        if (v.includes('instagram.com')) platforms.add('Instagram');
        if (v.includes('twitter.com')) platforms.add('Twitter');
        if (v.includes('facebook.com')) platforms.add('Facebook');
        if (v.includes('tiktok.com')) platforms.add('TikTok');
        if (v.includes('youtube.com')) platforms.add('YouTube');
      });
      if (platforms.size > 0) {
        insights.push(`Платформы: ${Array.from(platforms).join(', ')}`);
      }
    }

    return {
      confidence,
      reasoning: this.formatReasoning([
        `${matches} из ${sampleValues.length} значений соответствуют паттернам`,
        `Средний балл: ${confidence.toFixed(2)}`
      ]),
      insights
    };
  }

  /**
   * Продвинутый контекстный анализ
   */
  private analyzeContextAdvanced(fieldName: string, fieldType: string): { confidence: number; reasoning: string } {
    const name = fieldName.toLowerCase();
    let confidence = 0;
    const reasons: string[] = [];

    for (const [contextType, keywords] of this.contextAnalyzer.entries()) {
      const hasContext = keywords.some(keyword => name.includes(keyword));
      
      if (hasContext) {
        if ((contextType === 'personal' && ['email', 'phone', 'name'].includes(fieldType)) ||
            (contextType === 'professional' && ['company', 'position'].includes(fieldType)) ||
            (contextType === 'technical' && ['position'].includes(fieldType))) {
          confidence += 0.3;
          reasons.push(`Контекст: ${contextType}`);
        }
      }
    }

    return {
      confidence,
      reasoning: reasons.join(', ') || 'Контекст не определен'
    };
  }

  /**
   * Анализ бизнес-правил
   */
  private analyzeBusinessRules(fieldName: string, fieldType: string, sampleValues: string[]): { confidence: number; reasoning: string } {
    const name = fieldName.toLowerCase();
    let confidence = 0;
    const reasons: string[] = [];

    // Анализ иерархии для должностей
    if (fieldType === 'position') {
      const hierarchy = this.businessRules.get('hierarchy') || [];
      for (const level of hierarchy) {
        if (name.includes(level)) {
          confidence += 0.2;
          reasons.push(`Уровень иерархии: ${level}`);
          break;
        }
      }

      // Анализ отделов
      const departments = this.businessRules.get('departments') || [];
      for (const dept of departments) {
        if (name.includes(dept)) {
          confidence += 0.1;
          reasons.push(`Отдел: ${dept}`);
        }
      }
    }

    return {
      confidence,
      reasoning: reasons.join(', ') || 'Бизнес-правила не применены'
    };
  }

  /**
   * Генерация предложений - только самые важные
   */
  private generateSuggestions(fieldName: string, detectedType: string, sampleValues: string[]): string[] {
    const suggestions: string[] = [];
    
    if (detectedType === 'email' && sampleValues.length > 0) {
      // Проверяем, нужно ли нормализация
      const hasUpperCase = sampleValues.some(v => v !== v.toLowerCase());
      if (hasUpperCase) {
        suggestions.push('Нормализовать email в нижний регистр');
      }
    }
    
    if (detectedType === 'phone' && sampleValues.length > 0) {
      // Проверяем форматы телефонов
      const hasInvalidFormat = sampleValues.some(v => !v.startsWith('+7') && !v.startsWith('8'));
      if (hasInvalidFormat) {
        suggestions.push('Привести телефоны к формату +7XXXXXXXXXX');
      }
    }
    
    return suggestions;
  }

  /**
   * Генерация инсайтов - только полезная статистика
   */
  private generateInsights(fieldName: string, detectedType: string, sampleValues: string[]): string[] {
    const insights: string[] = [];
    
    if (sampleValues.length > 0) {
      // Только для email показываем домены
      if (detectedType === 'email') {
        const domains = sampleValues.map(v => v.split('@')[1]).filter(Boolean);
        const uniqueDomains = new Set(domains);
        if (uniqueDomains.size > 1) {
          insights.push(`Домены: ${Array.from(uniqueDomains).join(', ')}`);
        }
      }
      
      // Только для телефона показываем форматы
      if (detectedType === 'phone') {
        const formats = sampleValues.map(v => {
          if (v.startsWith('+7')) return 'Международный';
          if (v.startsWith('8')) return 'Российский';
          return 'Другой';
        });
        const formatCounts = formats.reduce((acc, fmt) => {
          acc[fmt] = (acc[fmt] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const formatList = Object.entries(formatCounts)
          .filter(([_, count]) => count > 0)
          .map(([fmt, count]) => `${fmt} (${count})`);
        
        if (formatList.length > 0) {
          insights.push(`Форматы: ${formatList.join(', ')}`);
        }
      }
      
      // Уникальность только если интересно
      const uniqueValues = new Set(sampleValues);
      const uniqueness = (uniqueValues.size / sampleValues.length) * 100;
      if (uniqueness < 100) {
        insights.push(`Уникальность: ${Math.round(uniqueness)}%`);
      }
    }

    return insights;
  }

  /**
   * Улучшенное определение паттерна
   */
  private detectAdvancedPattern(fieldName: string, sampleValues: string[], patterns: RegExp[]): string {
    if (sampleValues.length === 0) {
      return 'unknown';
    }

    const patternMatches: Record<string, number> = {};
    
    for (const pattern of patterns) {
      const matches = sampleValues.filter(value => pattern.test(value)).length;
      if (matches > 0) {
        patternMatches[pattern.source || 'detected'] = matches;
      }
    }

    const bestPattern = Object.entries(patternMatches).reduce((best, [pattern, count]) => 
      count > best.count ? { pattern, count } : best, { pattern: 'none', count: 0 }
    );

    return bestPattern.pattern;
  }
}
