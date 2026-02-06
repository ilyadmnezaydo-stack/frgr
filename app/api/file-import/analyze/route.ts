import { NextRequest, NextResponse } from 'next/server';
import { FileImporter } from '@/lib/file-importer';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting file analysis...');
    
    const formData = await request.formData();
    console.log('FormData received');
    
    const file = formData.get('file') as File;
    console.log('File extracted:', file ? file.name : 'null');

    if (!file) {
      return NextResponse.json(
        { error: 'Файл не загружен' },
        { status: 400 }
      );
    }

    console.log('File type:', file.type);
    console.log('File size:', file.size);

    // Проверяем тип файла и расширение
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/csv', // .csv
      'text/plain', // иногда CSV приходят так
    ];

    // Также проверяем расширение файла как фоллбек
    const fileName = file.name.toLowerCase();
    const hasValidExtension = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv');

    if (!allowedTypes.includes(file.type) && !hasValidExtension) {
      console.log('File type not allowed:', file.type, 'extension:', fileName.split('.').pop());
      return NextResponse.json(
        { error: 'Неподдерживаемый тип файла. Загрузите Excel (.xlsx, .xls) или CSV файл' },
        { status: 400 }
      );
    }

    // Проверяем размер файла (максимум 10MB)
    if (file.size > 10 * 1024 * 1024) {
      console.log('File too large:', file.size);
      return NextResponse.json(
        { error: 'Размер файла превышает 10MB' },
        { status: 400 }
      );
    }

    console.log('Creating FileImporter...');
    const importer = new FileImporter();
    
    console.log('Starting file analysis...');
    const analysis = await importer.analyzeFile(file);
    console.log('Analysis completed');

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      analysis
    });

  } catch (error) {
    console.error('Error analyzing file:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Внутренняя ошибка сервера';
    console.error('Error message:', errorMessage);
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
