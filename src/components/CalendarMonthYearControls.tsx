import React, { useCallback, useEffect, useRef, useState } from 'react';

const MONTH_SHORT = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleString('default', { month: 'short' }),
);

type Variant = 'default' | 'dark';

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  handler: () => void,
  active: boolean,
) {
  useEffect(() => {
    if (!active) return;
    const onDown = (e: MouseEvent) => {
      const el = ref.current;
      if (el && !el.contains(e.target as Node)) handler();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [ref, handler, active]);
}

export interface CalendarMonthYearControlsProps {
  currentDate: Date;
  onCurrentDateChange: (next: Date) => void;
  variant?: Variant;
}

/**
 * Replaces long &lt;select&gt; month/year dropdowns with compact pill triggers and grid popovers.
 */
const CalendarMonthYearControls: React.FC<CalendarMonthYearControlsProps> = ({
  currentDate,
  onCurrentDateChange,
  variant = 'default',
}) => {
  const [monthOpen, setMonthOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [yearWindowStart, setYearWindowStart] = useState(() => currentDate.getFullYear() - 5);
  const wrapRef = useRef<HTMLDivElement>(null);

  const closeAll = useCallback(() => {
    setMonthOpen(false);
    setYearOpen(false);
  }, []);

  useClickOutside(wrapRef, closeAll, monthOpen || yearOpen);

  const triggerBase =
    variant === 'dark'
      ? 'rounded-md border border-strokedark bg-gray-800/80 px-2.5 py-1 text-sm font-semibold text-white shadow-sm hover:bg-meta-4 focus:outline-none focus:ring-2 focus:ring-primary/50'
      : 'rounded-md border border-stroke bg-gray-50 px-2.5 py-1 text-sm font-semibold text-black shadow-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50 dark:border-strokedark dark:bg-meta-4 dark:text-white dark:hover:bg-gray-700';

  const panelBase =
    variant === 'dark'
      ? 'absolute left-1/2 top-full z-50 mt-1 w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-strokedark bg-boxdark p-2 shadow-lg'
      : 'absolute left-1/2 top-full z-50 mt-1 w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-stroke bg-white p-2 shadow-lg dark:border-strokedark dark:bg-boxdark';

  const monthBtn =
    variant === 'dark'
      ? 'rounded px-1.5 py-1.5 text-xs font-medium text-white hover:bg-meta-4'
      : 'rounded px-1.5 py-1.5 text-xs font-medium text-gray-800 hover:bg-primary/10 dark:text-gray-200 dark:hover:bg-meta-4';

  const monthBtnActive =
    variant === 'dark' ? 'bg-primary text-white hover:bg-primary' : 'bg-primary text-white hover:bg-primary';

  const yearBtn =
    variant === 'dark'
      ? 'rounded px-1 py-1.5 text-xs font-medium tabular-nums text-white hover:bg-meta-4'
      : 'rounded px-1 py-1.5 text-xs font-medium tabular-nums text-gray-800 hover:bg-primary/10 dark:text-gray-200 dark:hover:bg-meta-4';

  const yearBtnActive =
    variant === 'dark' ? 'bg-primary text-white hover:bg-primary' : 'bg-primary text-white hover:bg-primary';

  const openYearPicker = () => {
    const y = currentDate.getFullYear();
    setYearWindowStart(y - 5);
    setYearOpen(true);
    setMonthOpen(false);
  };

  const openMonthPicker = () => {
    setMonthOpen(true);
    setYearOpen(false);
  };

  const pickMonth = (monthIndex: number) => {
    onCurrentDateChange(new Date(currentDate.getFullYear(), monthIndex, 1));
    setMonthOpen(false);
  };

  const pickYear = (year: number) => {
    onCurrentDateChange(new Date(year, currentDate.getMonth(), 1));
    setYearOpen(false);
  };

  const monthLabel = new Date(2000, currentDate.getMonth(), 1).toLocaleString('default', {
    month: 'short',
  });
  const yearLabel = currentDate.getFullYear();

  return (
    <div ref={wrapRef} className="relative flex flex-wrap items-center justify-center gap-2 px-1">
      <button
        type="button"
        onClick={() => (monthOpen ? closeAll() : openMonthPicker())}
        aria-expanded={monthOpen}
        aria-haspopup="dialog"
        className={`inline-flex items-center gap-1 ${triggerBase}`}
      >
        {monthLabel}
        <span className="text-primary" aria-hidden>
          ▾
        </span>
      </button>

      <button
        type="button"
        onClick={() => (yearOpen ? closeAll() : openYearPicker())}
        aria-expanded={yearOpen}
        aria-haspopup="dialog"
        className={`inline-flex items-center gap-1 ${triggerBase}`}
      >
        {yearLabel}
        <span className="text-primary" aria-hidden>
          ▾
        </span>
      </button>

      {monthOpen ? (
        <div className={panelBase} role="dialog" aria-label="Choose month">
          <div className="grid grid-cols-4 gap-1">
            {MONTH_SHORT.map((label, i) => (
              <button
                key={i}
                type="button"
                onClick={() => pickMonth(i)}
                className={`${monthBtn} ${i === currentDate.getMonth() ? monthBtnActive : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {yearOpen ? (
        <div className={panelBase} role="dialog" aria-label="Choose year">
          <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
            <button
              type="button"
              className="rounded px-2 py-1 text-sm font-semibold text-primary hover:bg-primary/10 dark:hover:bg-meta-4"
              onClick={() => setYearWindowStart((s) => s - 12)}
              aria-label="Previous years"
            >
              «
            </button>
            <span
              className={
                variant === 'dark'
                  ? 'text-xs font-medium tabular-nums text-gray-300'
                  : 'text-xs font-medium tabular-nums text-gray-600 dark:text-gray-300'
              }
            >
              {yearWindowStart}–{yearWindowStart + 11}
            </span>
            <button
              type="button"
              className="rounded px-2 py-1 text-sm font-semibold text-primary hover:bg-primary/10 dark:hover:bg-meta-4"
              onClick={() => setYearWindowStart((s) => s + 12)}
              aria-label="Next years"
            >
              »
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {Array.from({ length: 12 }, (_, i) => yearWindowStart + i).map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => pickYear(y)}
                className={`${yearBtn} ${y === currentDate.getFullYear() ? yearBtnActive : ''}`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default CalendarMonthYearControls;
