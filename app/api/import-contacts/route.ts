import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Константа: ID тестового пользователя
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

interface ContactData {
    имя?: string;
    фамилия?: string;
    компания?: string;
    должность?: string;
    примечания?: string;
    электронная_почта?: string;
    телефон?: string;
    linkedin_url?: string;
    телеграмма?: string;
    website?: string;
    страна?: string;
    рейтинг?: string;
    сеть?: string;
    день_рождения?: string;
}

interface ImportRequest {
    rows: Record<string, any>[];
    mapping: Record<keyof ContactData, string>;
}

export async function POST(request: NextRequest) {
    try {
        const body: ImportRequest = await request.json();
        const { rows, mapping } = body;

        console.log(`📥 Starting import of ${rows.length} contacts...`);

        const result = {
            successful: 0,
            failed: 0,
            errors: [] as string[],
        };

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            try {
                // Конструируем payload для таблицы контакты
                const contactPayload: any = {
                    ID_пользователя: TEST_USER_ID,
                    источник: 'excel_import',
                };

                // Helper to safely get value
                const getVal = (key: keyof ContactData) => {
                    const header = mapping[key];
                    if (!header) return null;
                    const val = row[header];
                    return val ? String(val).trim() : null;
                };

                contactPayload.имя = getVal('имя');
                contactPayload.фамилия = getVal('фамилия');
                contactPayload.компания = getVal('компания');
                contactPayload.должность = getVal('должность');
                contactPayload.примечания = getVal('примечания');
                contactPayload.linkedin_url = getVal('linkedin_url');

                // Парсим дату рождения
                const birthDateStr = getVal('день_рождения');
                if (birthDateStr) {
                    try {
                        contactPayload.день_рождения = new Date(birthDateStr).toISOString().split('T')[0];
                    } catch {
                        // Если не удалось распарсить дату, пропускаем
                    }
                }

                // Собираем ВСЕ неиспользуемые данные для примечаний
                const unusedData: string[] = [];

                // 1. Добавляем mapped поля, которых нет в основной таблице
                const extraMappedFields = {
                    'страна': getVal('страна'),
                    'рейтинг': getVal('рейтинг'),
                    'сеть': getVal('сеть'),
                    'website': getVal('website'),
                    'телеграмма': getVal('телеграмма'),
                };

                Object.entries(extraMappedFields).forEach(([label, value]) => {
                    if (value) {
                        unusedData.push(`${label}: ${value}`);
                    }
                });

                // 2. Добавляем немappированные столбцы
                const mappedHeaders = new Set(Object.values(mapping).filter(Boolean));
                const allHeaders = Object.keys(row);
                const unmappedHeaders = allHeaders.filter(h => !mappedHeaders.has(h));

                unmappedHeaders.forEach(header => {
                    const value = row[header];
                    if (value !== null && value !== undefined && String(value).trim() !== '') {
                        unusedData.push(`${header}: ${value}`);
                    }
                });

                // 3. Формируем поле примечаний
                if (unusedData.length > 0) {
                    const formattedUnusedData = unusedData.join('\n');
                    contactPayload.примечания = contactPayload.примечания
                        ? `${formattedUnusedData}\n\n${contactPayload.примечания}`
                        : formattedUnusedData;
                }

                // Вставляем контакт
                const { data: contact, error: contactError } = await supabase
                    .from('контакты')
                    .insert(contactPayload)
                    .select('идентификатор')
                    .single();

                if (contactError) throw contactError;

                const contactId = (contact as any)?.['идентификатор'];

                // Если есть email, создаем запись в контактные_электронные_почты
                const email = getVal('электронная_почта');
                if (email) {
                    await supabase.from('контактные_электронные_почты').insert({
                        контактный_идентификатор: contactId,
                        электронная_почта: email,
                        этикетка: 'work',
                        is_primary: true,
                    });
                }

                // Если есть телефон, создаем запись в контактные_телефоны
                const phone = getVal('телефон');
                if (phone) {
                    await supabase.from('контактные_телефоны').insert({
                        контактный_идентификатор: contactId,
                        телефон: phone,
                        этикетка: 'work',
                        is_primary: true,
                    });
                }

                result.successful++;

            } catch (error) {
                console.error(`Error inserting contact ${i + 1}:`, error);
                result.failed++;
                // @ts-ignore
                const msg = error.message || 'Unknown error';

                if (msg.includes('fetch failed')) {
                    result.errors.push(`Строка ${i + 1}: Ошибка подключения (Check .env and Supabase status)`);
                } else if (msg.includes('relation') && msg.includes('does not exist')) {
                    result.errors.push(`Строка ${i + 1}: Таблица не найдена (Run SQL Schema)`);
                } else {
                    result.errors.push(`Строка ${i + 1}: ${msg}`);
                }
            }
        }

        console.log(`✅ Import complete: ${result.successful} successful, ${result.failed} failed`);

        return NextResponse.json({
            success: true,
            result,
        });

    } catch (error) {
        console.error('Import API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
