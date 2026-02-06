import { NextRequest, NextResponse } from 'next/server';
import { AIDataMapper, TableSchema, ColumnInfo } from '@/lib/ai-data-mapper';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { sourceTableName, targetTableName } = await request.json();

    if (!sourceTableName || !targetTableName) {
      return NextResponse.json(
        { error: 'Необходимо указать имена исходной и целевой таблиц' },
        { status: 400 }
      );
    }

    // Get table schemas from database
    const [sourceSchema, targetSchema] = await Promise.all([
      getTableSchema(sourceTableName),
      getTableSchema(targetTableName)
    ]);

    if (!sourceSchema || !targetSchema) {
      return NextResponse.json(
        { error: 'Не удалось получить схемы одной из таблиц' },
        { status: 404 }
      );
    }

    // Analyze and map fields
    const mapper = new AIDataMapper();
    const mappingResult = await mapper.analyzeAndMap(sourceSchema, targetSchema);

    return NextResponse.json({
      success: true,
      sourceTable: sourceSchema,
      targetTable: targetSchema,
      mapping: mappingResult
    });

  } catch (error) {
    console.error('Error in AI mapper analysis:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * Gets table schema from the database
 */
async function getTableSchema(tableName: string): Promise<TableSchema | null> {
  try {
    // Попытка получить схему через запрос к information_schema
    // Примечание: Это требует прав на чтение information_schema для роли, под которой работает Supabase client
    // Обычно anon/authenticated роли не имеют доступа к information_schema по REST API по умолчанию
    // Но мы попробуем. Если не выйдет - придется использовать RPC или интроспекцию через пустой select

    // Альтернативный подход: Делаем запрос к самой таблице с limit 0, чтобы проверить доступность,
    // но для получения типов нам все равно нужна мета-информация.

    // Лучший вариант без RPC - запрос к API Supabase (PostgREST) на ресурс /rpc/get_table_info если он есть,
    // или попытка прямого select к information_schema, если exposed.

    // В данном случае, мы попробуем сделать RPC вызов, если он существует, или (что вероятнее для 'хака')
    // воспользуемся тем, что users часто имеют доступ к чтению своих таблиц.

    // НО, так как мы хотим "чтобы багов не было", мы сделаем умный фоллбек.

    // 1. Пробуем получить информацию из information_schema (если открыто)
    // Note: Supabase JS client doesn't assume schema usually. We need to explicitely select.
    // However, querying information_schema via standard client often fails due to permissions/exposing.

    // Поэтому мы применим гибридный подход:
    // Мы не можем гарантировать доступ к information_schema без настройки на стороне БД.
    // Но мы можем попытаться получить одну строку данных чтобы понять структуру JSON ответа.

    const { data: sampleData, error: sampleError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (sampleError) {
      console.error(`Error accessing table ${tableName}:`, sampleError);
      return null;
    }

    if (!sampleData) return null;

    // Инферим схему из данных (если есть данные) или используем базовую структуру
    // Если данных нет, мы не узнаем поля. Это проблема.
    // Поэтому, если данных нет, мы всё же попытаемся обратиться к information_schema.columns
    // HACK: Supabase иногда позволяет читать information_schema "table_name", "column_name", "data_type"

    // В большинстве дефолтных настроек Supabase доступ к information_schema закрыт по API.
    // ЕДИНСТВЕННЫЙ надежный способ без RPC - это Service Role Key, который у нас есть (вернее, должен быть на бэкенде).
    // Мы используем process.env.SUPABASE_SERVICE_ROLE_KEY в lib/supabase.ts если бы он там был экспортирован,
    // но он используется внутри createClient в route handler'ах иногда.

    // Давайте проверим, как инициализирован supabase глобально.
    // В файле lib/supabase.ts используется ANON KEY если не задан SERVICE ROLE.
    // Для админских задач лучше бы иметь SERVICE ROLE client.

    // Тем не менее, попробуем хак с information_schema (может не сработать).
    // Если не сработает - вернем null и ошибку.

    // ВАЖНО: Мы находимся внутри route.ts. Мы можем создать админский клиент здесь.

    // TODO: В идеале здесь нужен RPC вызов 'get_schema'.
    // Но я напишу код, который пытается сделать максимум.

    // Попытка 1: Используем админский доступ к information_schema (если переменные окружения позволяют)
    // Нам нужно создать отдельный клиент с service_role для этого запроса, так как operations требуют привилегий.

    // НО! У нас в .env.local только ANON KEY.
    // Значит мы ограничены правами anon.
    // Если так, то мы НЕ МОЖЕМ читать information_schema.

    // Возвращаемся к реальности: Если у пользователя нет Service Role Key, 
    // мы не можем честно получить типы колонок без RPC функции.
    // Но мы можем получить имена колонок, если в таблице есть хотя бы одна запись.

    if (sampleData.length > 0) {
      const row = sampleData[0];
      const columns: ColumnInfo[] = Object.keys(row).map(key => {
        const val = row[key];
        let type = 'VARCHAR'; // Default
        if (typeof val === 'number') type = Number.isInteger(val) ? 'INTEGER' : 'FLOAT';
        if (typeof val === 'boolean') type = 'BOOLEAN';
        if (typeof val === 'object') type = 'JSONB';
        // Проверка на дату
        if (typeof val === 'string' && !isNaN(Date.parse(val)) && (val.includes('-') || val.includes('T'))) type = 'TIMESTAMPTZ';

        return {
          name: key,
          type: type,
          nullable: true, // Не можем знать наверняка
          sampleValues: sampleData.map(d => d[key]).slice(0, 5) // Берем образцы
        };
      });

      return {
        tableName,
        columns
      };
    }

    // Если данных нет, мы в тупике без admin прав.
    // Но мы можем попытаться вернуть хотя бы пустой список или ошибку.
    // Однако, для демо 'пользователи' у нас есть заглушка.
    // Раз уж мы обещали "реальный запрос", но прав может не быть...
    // Давайте оставим заглушку КАК ФОЛЛБЕК, но попытаемся сделать реальный запрос первым.

    // ФОЛЛБЕК для таблицы 'пользователи' (чтобы не сломать демо)
    // Попытка получить схему через information_schema с использованием сервисной роли
    try {
      // Создаем админский клиент локально внутри функции, чтобы гарантировать права
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: infoColumns, error: infoError } = await supabaseAdmin
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', tableName)
        .eq('table_schema', 'public');

      if (!infoError && infoColumns && infoColumns.length > 0) {
        console.log(`Successfully fetched schema from information_schema for ${tableName}`);
        return {
          tableName,
          columns: infoColumns.map((col: any) => ({
            name: col.column_name,
            type: col.data_type.toUpperCase(),
            nullable: col.is_nullable === 'YES',
            sampleValues: []
          }))
        };
      } else {
        console.warn('Failed to fetch from information_schema:', infoError);
      }
    } catch (e) {
      console.error('Error querying information_schema:', e);
    }

    return null;

  } catch (error) {
    console.error(`Error getting schema for table ${tableName}:`, error);
    return null;
  }
}

export async function GET() {
  try {
    // Временно возвращаем пустой список, пока функции Supabase не настроены
    return NextResponse.json({
      success: true,
      tables: []
    });

  } catch (error) {
    console.error('Error getting tables list:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
