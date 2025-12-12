import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ExerciseLibraryItem {
  id: string;
  name: string;
  video_url: string | null;
  instructions: string | null;
}

interface ExerciseAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (exercise: ExerciseLibraryItem) => void;
  placeholder?: string;
  className?: string;
}

const ExerciseAutocomplete = ({
  value,
  onChange,
  onSelect,
  placeholder = "e.g., Bench Press",
  className,
}: ExerciseAutocompleteProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const { data: suggestions = [] } = useQuery({
    queryKey: ["exercise-library", value],
    queryFn: async () => {
      if (!value || value.length < 2) return [];

      const { data, error } = await supabase
        .from("exercise_library")
        .select("id, name, video_url, instructions")
        .ilike("name", `%${value}%`)
        .limit(10);

      if (error) {
        console.error("Error fetching exercise suggestions:", error);
        return [];
      }
      return data as ExerciseLibraryItem[];
    },
    enabled: value.length >= 2,
  });

  useEffect(() => {
    setHighlightedIndex(0);
  }, [suggestions]);

  const handleSelect = (exercise: ExerciseLibraryItem) => {
    onChange(exercise.name);
    onSelect?.(exercise);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (suggestions[highlightedIndex]) {
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          // Delay closing to allow click on suggestion
          setTimeout(() => setIsOpen(false), 150);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn("bg-secondary border-border", className)}
        autoComplete="off"
      />
      {isOpen && suggestions.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((exercise, index) => (
            <li
              key={exercise.id}
              onClick={() => handleSelect(exercise)}
              className={cn(
                "px-3 py-2 cursor-pointer text-sm",
                index === highlightedIndex
                  ? "bg-primary/20 text-foreground"
                  : "text-foreground hover:bg-secondary"
              )}
            >
              <span className="font-medium">{exercise.name}</span>
              {exercise.video_url && (
                <span className="ml-2 text-xs text-primary">📹</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ExerciseAutocomplete;
