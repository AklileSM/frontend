import React, { useEffect, useRef, useState } from 'react';

interface CheckboxDropdownProps {
  label: string;
  options: string[];
  hidden: Set<string>;
  onToggle: (value: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

const CheckboxDropdown: React.FC<CheckboxDropdownProps> = ({
  label,
  options,
  hidden,
  onToggle,
  onSelectAll,
  onClearAll,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const visibleCount = options.length - hidden.size;
  const allSelected = hidden.size === 0;
  const noneSelected = hidden.size === options.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) onSelectAll();
    else onClearAll();
  };

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md border border-stroke bg-white px-3 py-1.5 text-sm font-medium text-black shadow-sm hover:bg-gray-50 dark:border-strokedark dark:bg-boxdark dark:text-white dark:hover:bg-gray-700"
      >
        <span>{label}</span>
        <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs text-white leading-none">
          {visibleCount}/{options.length}
        </span>
        <svg
          className={`h-4 w-4 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-md border border-stroke bg-white shadow-lg dark:border-strokedark dark:bg-boxdark">
          {/* Select all row */}
          <label className="flex cursor-pointer items-center gap-2 border-b border-stroke px-3 py-2 text-sm font-semibold text-black dark:border-strokedark dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = !allSelected && !noneSelected;
              }}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Select all
          </label>

          <div className="max-h-56 overflow-y-auto">
            {options.map((opt) => (
              <label
                key={opt}
                className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <input
                  type="checkbox"
                  checked={!hidden.has(opt)}
                  onChange={() => onToggle(opt)}
                  className="h-4 w-4 accent-primary"
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckboxDropdown;
