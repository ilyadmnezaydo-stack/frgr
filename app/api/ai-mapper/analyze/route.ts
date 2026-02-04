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
    // Временно возвращаем hardcoded схему для таблицы пользователи
    if (tableName === 'пользователи') {
      return {
        tableName: 'пользователи',
        columns: [
          { name: 'идентификатор', type: 'UUID', nullable: false },
          { name: 'электронная_почта', type: 'VARCHAR', nullable: false },
          { name: 'имя', type: 'VARCHAR', nullable: true },
          { name: 'фамилия', type: 'VARCHAR', nullable: true },
          { name: 'телефон', type: 'VARCHAR', nullable: true },
          { name: 'компания', type: 'VARCHAR', nullable: true },
          { name: 'должность', type: 'VARCHAR', nullable: true },
          { name: 'телеграмма', type: 'VARCHAR', nullable: true },
          { name: 'аватар_url', type: 'TEXT', nullable: true },
          { name: 'создано_в', type: 'TIMESTAMPTZ', nullable: false },
          { name: 'обновлено_в', type: 'TIMESTAMPTZ', nullable: false }
        ]
      };
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
