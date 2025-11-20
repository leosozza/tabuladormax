import { List, ToggleLeft, Hash, Calendar, Type } from "lucide-react";
import { useFieldFilterOptions } from "@/hooks/useFieldFilterOptions";

interface FieldTypeIconProps {
  fieldKey: string;
}

export function FieldTypeIcon({ fieldKey }: FieldTypeIconProps) {
  const config = useFieldFilterOptions(fieldKey);
  
  switch (config?.type) {
    case 'enum':
      return <List className="h-3 w-3" />;
    case 'boolean':
      return <ToggleLeft className="h-3 w-3" />;
    case 'number':
      return <Hash className="h-3 w-3" />;
    case 'date':
      return <Calendar className="h-3 w-3" />;
    default:
      return <Type className="h-3 w-3" />;
  }
}
