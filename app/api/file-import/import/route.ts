import { NextRequest, NextResponse } from 'next/server';
import { FileImporter } from '@/lib/file-importer';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Starting import process ===');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const mappingsStr = formData.get('mappings') as string;
    const dryRunStr = formData.get('dryRun') as string;

    console.log('Form data parsed:', { 
      hasFile: !!file, 
      fileName: file?.name, 
      hasMappings: !!mappingsStr,
      dryRun: dryRunStr 
    });

    if (!file) {
      return NextResponse.json(
        { error: 'Файл не загружен' },
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
    
    const result = await importer.importFile(file, mappings, dryRun);
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
    console.error('Error stack:', error.stack);
    
    const errorMessage = error instanceof Error ? error.message : 'Внутренняя ошибка сервера';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
