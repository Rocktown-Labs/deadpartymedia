import { ChevronDown, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface MultiSelectProps {
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  emptyLabel?: string;
}

/**
 * Dropdown with checkboxes for multi-option fields (mediums, tags, etc.).
 * Replaces long inline button grids so forms stay compact on laptop screens.
 */
export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select options",
  emptyLabel = "No options yet",
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const toggleOption = (option: string) => {
    onChange(
      selected.includes(option)
        ? selected.filter((item) => item !== option)
        : [...selected, option],
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`flex min-h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
          isOpen ? "border-[#7CFC00]/60" : "border-gray-800 hover:border-gray-600"
        } bg-[#0A0A0A]`}
        onClick={() => setIsOpen((open) => !open)}
        role="combobox"
        aria-expanded={isOpen}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setIsOpen((open) => !open);
          }
        }}
      >
        <span className="flex flex-wrap gap-1 overflow-hidden">
          {selected.length === 0 ? (
            <span className="text-gray-500">{placeholder}</span>
          ) : (
            selected.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1 rounded bg-[#7CFC00]/15 px-1.5 py-0.5 text-xs text-[#7CFC00]"
              >
                {item}
                <button
                  type="button"
                  aria-label={`Remove ${item}`}
                  className="text-[#7CFC00]/70 hover:text-white"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleOption(item);
                  }}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))
          )}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </div>

      {isOpen ? (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-gray-800 bg-[#0A0A0A] p-1 shadow-xl">
          {options.length === 0 ? (
            <p className="px-2 py-1.5 text-gray-500 text-sm">{emptyLabel}</p>
          ) : (
            options.map((option) => {
              const checked = selected.includes(option);

              return (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-gray-200 text-sm hover:bg-[#1A1A1A]"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleOption(option)}
                    className="size-4 accent-[#7CFC00]"
                  />
                  {option}
                </label>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
