import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { TARGET_FIELDS } from '@/types/mapper';
import ConfidenceBadge from './ConfidenceBadge';

interface ColumnMappingDropdownProps {
    sourceColumn: string;
    currentMapping: string | null;
    confidence: number;
    onMappingChange: (value: string) => void;
    usedMappings: string[];
}

const ColumnMappingDropdown = ({
    sourceColumn,
    currentMapping,
    confidence,
    onMappingChange,
    usedMappings,
}: ColumnMappingDropdownProps) => {
    return (
        <div className="flex flex-col gap-1">
            <Select
                value={currentMapping || 'skip'}
                onValueChange={onMappingChange}
            >
                <SelectTrigger className="w-full bg-white border-purple-200 hover:border-primary focus:ring-primary/20 transition-colors">
                    <SelectValue placeholder="Выберите поле" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-purple-100 shadow-lg z-50">
                    {TARGET_FIELDS.map((field) => {
                        const isUsed = usedMappings.includes(field.value) && field.value !== currentMapping && field.value !== 'skip';
                        return (
                            <SelectItem
                                key={field.value}
                                value={field.value}
                                disabled={isUsed}
                                className={`cursor-pointer ${field.value === currentMapping
                                        ? 'bg-purple-50 text-primary font-medium'
                                        : ''
                                    } ${isUsed ? 'opacity-50' : ''}`}
                            >
                                {field.label}
                                {isUsed && ' (занято)'}
                            </SelectItem>
                        );
                    })}
                </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground truncate">{sourceColumn}</span>
                <ConfidenceBadge confidence={confidence} />
            </div>
        </div>
    );
};

export default ColumnMappingDropdown;
