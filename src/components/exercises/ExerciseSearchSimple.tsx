import { Search } from 'lucide-react';
import { Input } from '../ui/Input';

export interface ExerciseSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function ExerciseSearch({ value, onChange }: ExerciseSearchProps) {
  return (
    <div className="flex gap-3 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          className="pl-10"
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search exercises..."
          type="text"
          value={value}
        />
      </div>
    </div>
  );
}
