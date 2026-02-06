import { NextRequest, NextResponse } from 'next/server';
import { FileImporter } from '@/lib/file-importer';
import { supabase } from '@/lib/supabase';
import { FieldMapping } from '@/lib/ai-data-mapper';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Starting import process ===');

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const mappingsStr = formData.get('mappings') as string;
    const dryRunStr = formData.get('dryRun') as string;
    const userId = formData.get('userId') as string;

    console.log('Form data parsed:', {
      hasFile: !!file,
      fileName: file?.name,
      hasMappings: !!mappingsStr,
      dryRun: dryRunStr,
      userId: userId || 'not provided'
    });

    if (!file) {
      return NextResponse.json(
        { error: 'Файл не загружен' },
        { status: 400 }
      );
    }

    // Валидация размера файла (например, макс 5MB для серверных функций)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Размер файла превышает допустимый лимит (5MB)' },
        { status: 400 }
      );
    }

    // Валидация типа файла
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
      'application/vnd.ms-excel', // xls
      'text/csv',
      'application/csv',
      'text/plain' // иногда CSV приходят так
    ];

    // Также проверим расширение имени файла как фоллбек
    const fileName = file.name.toLowerCase();
    const hasValidExtension = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv');

    if (!allowedTypes.includes(file.type) && !hasValidExtension) {
      return NextResponse.json(
        { error: 'Неподдерживаемый формат файла. Пожалуйста, используйте .xlsx, .xls или .csv' },
        { status: 400 }
      );
    }

    if (!mappingsStr) {
      return NextResponse.json(
        { error: 'Отсутствуют сопоставления полей' },
        { status: 400 }
      );
    }

    console.log('Parsing mappings...');
    let mappings: FieldMapping[];
    try {
      mappings = JSON.parse(mappingsStr);
      console.log('Mappings parsed successfully:', mappings.length);
    } catch (error) {
      console.error('Error parsing mappings:', error);
      return NextResponse.json(
        { error: 'Ошибка при парсинге сопоставлений' },
        { status: 400 }
      );
    }

    const dryRun = dryRunStr === 'true';
    console.log('Dry run:', dryRun);

    const importer = new FileImporter();
    console.log('FileImporter created, starting import...');

    const result = await importer.importFile(file, mappings, dryRun, userId || undefined);
    console.log('Import result:', {
      success: result.success,
      totalRows: result.totalRows,
      importedRows: result.importedRows,
      errorsCount: result.errors.length,
      warningsCount: result.warnings.length
    });

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Error in import process:', error);
    console.error('Error stack:', (error as Error).stack);

    const errorMessage = error instanceof Error ? error.message : 'Внутренняя ошибка сервера';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
