-- Functions for AI Data Mapper

-- Function to get table columns information
CREATE OR REPLACE FUNCTION get_table_columns(table_name TEXT)
RETURNS TABLE (
    column_name TEXT,
    data_type TEXT,
    is_nullable TEXT,
    column_default TEXT,
    character_maximum_length INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.column_name::TEXT,
        c.data_type::TEXT,
        c.is_nullable::TEXT,
        c.column_default::TEXT,
        c.character_maximum_length::INTEGER
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' 
      AND c.table_name = get_table_columns.table_name
    ORDER BY c.ordinal_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user tables (excluding system tables)
CREATE OR REPLACE FUNCTION get_user_tables()
RETURNS TABLE (
    table_name TEXT,
    row_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.table_name::TEXT,
        COALESCE(s.n_tup_ins - s.n_tup_del, 0)::BIGINT as row_count
    FROM information_schema.tables t
    LEFT JOIN pg_stat_user_tables s ON t.table_name = s.relname
    WHERE t.table_schema = 'public' 
      AND t.table_type = 'BASE TABLE'
      AND t.table_name NOT IN ('pg_stat_statements')
    ORDER BY t.table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get sample data from table with column types
CREATE OR REPLACE FUNCTION get_table_sample_data(table_name TEXT, limit_count INTEGER DEFAULT 5)
RETURNS TABLE (
    row_data JSONB,
    column_types JSONB
) AS $$
DECLARE
    columns_info RECORD;
    select_query TEXT;
    type_mapping JSONB;
BEGIN
    -- Build column type mapping
    type_mapping := '{}'::JSONB;
    
    FOR columns_info IN 
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = get_table_sample_data.table_name
        ORDER BY ordinal_position
    LOOP
        type_mapping := jsonb_set(
            type_mapping, 
            ('{' || columns_info.column_name || '}')::TEXT[], 
            to_jsonb(columns_info.data_type)
        );
    END LOOP;
    
    -- Build dynamic query
    select_query := 'SELECT row_to_json(t) as row_data, ' || quote_literal(type_mapping) || ' as column_types FROM ' || 
                   quote_ident(table_name) || ' t LIMIT ' || limit_count;
    
    RETURN QUERY EXECUTE select_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate data before insert
CREATE OR REPLACE FUNCTION validate_table_data(
    table_name TEXT,
    data JSONB,
    validation_rules JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE (
    is_valid BOOLEAN,
    errors JSONB,
    warnings JSONB,
    cleaned_data JSONB
) AS $$
DECLARE
    column_info RECORD;
    validation_error JSONB := '[]'::JSONB;
    validation_warning JSONB := '[]'::JSONB;
    cleaned_record JSONB := '{}'::JSONB;
    field_value TEXT;
    field_name TEXT;
    is_field_valid BOOLEAN := TRUE;
BEGIN
    -- Get table columns
    FOR column_info IN 
        SELECT column_name, data_type, is_nullable, character_maximum_length
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = validate_table_data.table_name
    LOOP
        field_name := column_info.column_name;
        field_value := (data ->> field_name);
        
        -- Check if field exists in data
        IF field_value IS NULL THEN
            IF column_info.is_nullable = 'NO' THEN
                validation_error := validation_error || jsonb_build_object(
                    'field', field_name,
                    'message', 'Поле обязательно для заполнения',
                    'severity', 'error'
                );
                is_field_valid := FALSE;
            END IF;
            CONTINUE;
        END IF;
        
        -- Type validation
        IF column_info.data_type = 'VARCHAR' OR column_info.data_type = 'TEXT' THEN
            IF column_info.character_maximum_length IS NOT NULL THEN
                IF length(field_value) > column_info.character_maximum_length THEN
                    validation_error := validation_error || jsonb_build_object(
                        'field', field_name,
                        'message', 'Превышена максимальная длина поля (' || column_info.character_maximum_length || ')',
                        'severity', 'error'
                    );
                    is_field_valid := FALSE;
                END IF;
            END IF;
        ELSIF column_info.data_type = 'INTEGER' THEN
            IF field_value !~ '^-?\d+$' THEN
                validation_error := validation_error || jsonb_build_object(
                    'field', field_name,
                    'message', 'Поле должно быть целым числом',
                    'severity', 'error'
                );
                is_field_valid := FALSE;
            END IF;
        ELSIF column_info.data_type = 'BOOLEAN' THEN
            IF field_value NOT IN ('true', 'false', '1', '0', 'yes', 'no', 'да', 'нет') THEN
                validation_error := validation_error || jsonb_build_object(
                    'field', field_name,
                    'message', 'Поле должно быть логическим значением',
                    'severity', 'error'
                );
                is_field_valid := FALSE;
            END IF;
        ELSIF column_info.data_type = 'TIMESTAMPTZ' THEN
            IF field_value !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}' THEN
                validation_warning := validation_warning || jsonb_build_object(
                    'field', field_name,
                    'message', 'Поле должно быть в формате timestamp',
                    'suggestion', 'Используйте формат ISO 8601'
                );
            END IF;
        ELSIF column_info.data_type = 'UUID' THEN
            IF field_value !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
                validation_error := validation_error || jsonb_build_object(
                    'field', field_name,
                    'message', 'Поле должно быть в формате UUID',
                    'severity', 'error'
                );
                is_field_valid := FALSE;
            END IF;
        END IF;
        
        -- Add to cleaned data if valid
        IF is_field_valid THEN
            cleaned_record := jsonb_set(cleaned_record, ('{' || field_name || '}')::TEXT[], to_jsonb(field_value));
        END IF;
        
        is_field_valid := TRUE;
    END LOOP;
    
    RETURN QUERY SELECT 
        (SELECT jsonb_array_length(validation_error) = 0) as is_valid,
        validation_error as errors,
        validation_warning as warnings,
        cleaned_record as cleaned_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_table_columns TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_tables TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_table_sample_data TO authenticated, anon;
GRANT EXECUTE ON FUNCTION validate_table_data TO authenticated, anon;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_mapper_table_columns 
ON information_schema.columns(table_schema, table_name) 
WHERE table_schema = 'public';

CREATE INDEX IF NOT EXISTS idx_ai_mapper_tables 
ON information_schema.tables(table_schema, table_name) 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
