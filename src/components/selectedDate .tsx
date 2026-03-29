import React, { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';

/** Scope keys match `filterProjectSlug` in FileExplorer (`a6-stern`, `projectx`, `projecty`). */
export const EXPLORER_DATE_SCOPE_A6 = 'a6-stern';

interface SelectedDateContextProps {
  /** Selected date for A6 date-based explorer (sidebar calendar / legacy). */
  selectedDate: string | null;
  setSelectedDate: (date: string | null) => void;
  getDateForScope: (scope: string) => string | null;
  setDateForScope: (scope: string, date: string | null) => void;
}

const SelectedDateContext = createContext<SelectedDateContextProps | undefined>(undefined);

export const SelectedDateProvider = ({ children }: { children: ReactNode }) => {
  const [datesByScope, setDatesByScope] = useState<Record<string, string | null>>({});

  const getDateForScope = useCallback((scope: string) => datesByScope[scope] ?? null, [datesByScope]);

  const setDateForScope = useCallback((scope: string, date: string | null) => {
    setDatesByScope((prev) => ({ ...prev, [scope]: date }));
  }, []);

  const selectedDate = datesByScope[EXPLORER_DATE_SCOPE_A6] ?? null;

  const setSelectedDate = useCallback(
    (date: string | null) => {
      setDateForScope(EXPLORER_DATE_SCOPE_A6, date);
    },
    [setDateForScope],
  );

  const value = useMemo(
    () => ({
      selectedDate,
      setSelectedDate,
      getDateForScope,
      setDateForScope,
    }),
    [selectedDate, setSelectedDate, getDateForScope, setDateForScope],
  );

  return <SelectedDateContext.Provider value={value}>{children}</SelectedDateContext.Provider>;
};

export const useSelectedDate = () => {
  const context = useContext(SelectedDateContext);
  if (!context) {
    throw new Error('useSelectedDate must be used within a SelectedDateProvider');
  }
  return context;
};
