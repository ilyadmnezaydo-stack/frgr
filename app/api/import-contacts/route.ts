import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Получаем ID пользователя из сессии или запроса
function getUserId(body: ImportRequest): string {
    return body.userId || body.user_id || '00000000-0000-0000-0000-000000000001';
}

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
    userId?: string;
    user_id?: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: ImportRequest = await request.json();
        const { rows, mapping } = body;
        
        // Получаем реальный ID пользователя
        const userId = getUserId(body);

        console.log(`📥 Starting import of ${rows.length} contacts for user: ${userId}`);

        const result = {
            successful: 0,
            failed: 0,
            errors: [] as string[],
        };

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            try {
                // Конструируем payload для таблицы contacts
                const contactPayload: any = {};

                // Helper to safely get value
                const getVal = (key: keyof ContactData) => {
                    const header = mapping[key];
                    if (!header) return null;
                    const val = row[header];
                    return val ? String(val).trim() : null;
                };

                contactPayload.full_name = getVal('имя');
                contactPayload.company = getVal('компания');
                contactPayload.position = getVal('должность');
                contactPayload.notes = getVal('примечания');
                contactPayload.linkedin = getVal('linkedin_url');

                // Добавляем email и телефон в основной контакт
                const email = getVal('электронная_почта');
                if (email) {
                    contactPayload.email = email;
                }

                const phone = getVal('телефон');
                if (phone) {
                    contactPayload.phone = phone;
                }

                // Парсим дату рождения
                const birthDateStr = getVal('день_рождения');
                if (birthDateStr) {
                    try {
                        contactPayload.birth_date = new Date(birthDateStr).toISOString().split('T')[0];
                    } catch {
                        // Если не удалось распарсить дату, пропускаем
                    }
                }

                // Собираем ВСЕ неиспользуемые данные для примечаний
                const unusedData: string[] = [];

                // 1. Добавляем mapped поля, которых нет в основной таблице
                const extraMappedFields = {
                    'country': getVal('страна'),
                    'rating': getVal('рейтинг'),
                    'network': getVal('сеть'),
                    'website': getVal('website'),
                    'telegram': getVal('телеграмма'),
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

                // 3. Формируем поле notes
                if (unusedData.length > 0) {
                    const formattedUnusedData = unusedData.join('\n');
                    contactPayload.notes = contactPayload.notes
                        ? `${formattedUnusedData}\n\n${contactPayload.notes}`
                        : formattedUnusedData;
                }

                // Вставляем контакт в таблицу contacts (на английском)
                const { data: contact, error: contactError } = await supabase
                    .from('contacts')
                    .insert(contactPayload)
                    .select('id')
                    .single();

                if (contactError) throw contactError;

                const contactId = (contact as any)?.['id'];

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
