import { NextRequest, NextResponse } from 'next/server';
import { AIDataMapper, FieldMapping } from '@/lib/ai-data-mapper';
import { DataValidator, ValidationResult } from '@/lib/data-validator';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const {
      sourceTableName,
      targetTableName,
      mappings,
      filters,
      batchSize = 100,
      dryRun = false
    } = await request.json();

    if (!sourceTableName || !targetTableName || !mappings) {
      return NextResponse.json(
        { error: 'Необходимо указать исходную таблицу, целевую таблицу и сопоставления полей' },
        { status: 400 }
      );
    }

    // Initialize validator with common rules
    const validator = new DataValidator();
    const commonRules = DataValidator.getCommonRules();
    
    if (commonRules[targetTableName]) {
      validator.addTableRules(targetTableName, commonRules[targetTableName]);
    }

    // Get existing records for uniqueness checking
    const { data: existingRecords } = await supabase
      .from(targetTableName)
      .select('*');

    // Process data in batches
    const result = await processBatchTransfer(
      sourceTableName,
      targetTableName,
      mappings,
      filters,
      validator,
      existingRecords || [],
      batchSize,
      dryRun
    );

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Error in data transfer:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * Processes batch data transfer with validation
 */
async function processBatchTransfer(
  sourceTableName: string,
  targetTableName: string,
  mappings: FieldMapping[],
  filters: any = {},
  validator: DataValidator,
  existingRecords: any[],
  batchSize: number,
  dryRun: boolean
): Promise<{
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  validationErrors: any[];
  transferResults: any[];
}> {
  let totalProcessed = 0;
  let successCount = 0;
  let errorCount = 0;
  const validationErrors: any[] = [];
  const transferResults: any[] = [];

  // Build query with filters
  let query = supabase.from(sourceTableName).select('*');
  
  if (filters && Object.keys(filters).length > 0) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        query = query.eq(key, value);
      }
    });
  }

  // Get total count for progress tracking
  const { count: totalCount } = await query;
  
  if (!totalCount) {
    return {
      totalProcessed: 0,
      successCount: 0,
      errorCount: 0,
      validationErrors: [],
      transferResults: []
    };
  }

  // Process in batches
  for (let offset = 0; offset < totalCount; offset += batchSize) {
    const { data: batchData, error: fetchError } = await supabase
      .from(sourceTableName)
      .select('*')
      .range(offset, offset + batchSize - 1);

    if (fetchError) {
      console.error('Error fetching batch:', fetchError);
      errorCount += batchSize;
      continue;
    }

    if (!batchData || batchData.length === 0) {
      continue;
    }

    // Validate and transform batch
    const validationResult: ValidationResult = await validator.validateAndTransform(
      batchData,
      mappings,
      targetTableName,
      existingRecords
    );

    // Collect validation errors
    if (validationResult.errors.length > 0) {
      validationErrors.push(...validationResult.errors);
    }

    // Transfer valid data
    if (validationResult.transformedData && validationResult.transformedData.length > 0) {
      if (!dryRun) {
        const { data: insertedData, error: insertError } = await supabase
          .from(targetTableName)
          .insert(validationResult.transformedData)
          .select();

        if (insertError) {
          console.error('Error inserting batch:', insertError);
          errorCount += validationResult.transformedData.length;
          
          transferResults.push({
            batchStart: offset,
            batchSize: batchData.length,
            success: false,
            error: insertError.message,
            validationErrors: validationResult.errors
          });
        } else {
          successCount += insertedData?.length || 0;
          
          transferResults.push({
            batchStart: offset,
            batchSize: batchData.length,
            success: true,
            insertedCount: insertedData?.length || 0,
            validationErrors: validationResult.errors,
            validationWarnings: validationResult.warnings
          });

          // Update existing records for next batch
          if (insertedData) {
            existingRecords.push(...insertedData);
          }
        }
      } else {
        // Dry run - just count what would be transferred
        successCount += validationResult.transformedData.length;
        
        transferResults.push({
          batchStart: offset,
          batchSize: batchData.length,
          success: true,
          wouldInsertCount: validationResult.transformedData.length,
          validationErrors: validationResult.errors,
          validationWarnings: validationResult.warnings
        });
      }
    }

    totalProcessed += batchData.length;
  }

  return {
    totalProcessed,
    successCount,
    errorCount,
    validationErrors,
    transferResults
  };
}

/**
 * Gets sample data from source table for preview
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceTable = searchParams.get('sourceTable');
    const targetTable = searchParams.get('targetTable');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!sourceTable || !targetTable) {
      return NextResponse.json(
        { error: 'Необходимо указать исходную и целевую таблицы' },
        { status: 400 }
      );
    }

    // Get sample data from source table
    const { data: sourceData, error: sourceError } = await supabase
      .from(sourceTable)
      .select('*')
      .limit(limit);

    if (sourceError) {
      return NextResponse.json(
        { error: `Ошибка при получении данных из таблицы ${sourceTable}: ${sourceError.message}` },
        { status: 500 }
      );
    }

    // Get schema information
    const [sourceSchema, targetSchema] = await Promise.all([
      getTableSchema(sourceTable),
      getTableSchema(targetTable)
    ]);

    // Get AI mapping suggestions
    const mapper = new AIDataMapper();
    const mappingResult = await mapper.analyzeAndMap(sourceSchema!, targetSchema!);

    return NextResponse.json({
      success: true,
      sourceData: sourceData || [],
      sourceSchema,
      targetSchema,
      mappingSuggestion: mappingResult
    });

  } catch (error) {
    console.error('Error in preview endpoint:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get table schema
 */
async function getTableSchema(tableName: string) {
  try {
    const { data: columns, error } = await supabase
      .rpc('get_table_columns', { table_name: tableName });

    if (error) {
      console.error(`Error getting columns for table ${tableName}:`, error);
      return null;
    }

    const { data: sampleData, error: sampleError } = await supabase
      .from(tableName)
      .select('*')
      .limit(3);

    const tableColumns = columns.map((col: any) => ({
      name: col.column_name,
      type: col.data_type,
      nullable: col.is_nullable === 'YES',
      sampleValues: sampleData ? sampleData.map((row: any) => row[col.column_name]) : []
    }));

    return {
      tableName,
      columns: tableColumns
    };

  } catch (error) {
    console.error(`Error getting schema for table ${tableName}:`, error);
    return null;
  }
}
