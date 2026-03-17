import React, { createContext, useState, useContext, ReactNode } from 'react';

// Define the shape of the context data
interface SelectedDateContextProps {
  selectedDate: string | null;
  setSelectedDate: (date: string | null) => void;
}

const SelectedDateContext = createContext<SelectedDateContextProps | undefined>(undefined);

export const SelectedDateProvider = ({ children }: { children: ReactNode }) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  return (
    <SelectedDateContext.Provider value={{ selectedDate, setSelectedDate }}>
      {children}
    </SelectedDateContext.Provider>
  );
};

export const useSelectedDate = () => {
  const context = useContext(SelectedDateContext);
  if (!context) {
    throw new Error('useSelectedDate must be used within a SelectedDateProvider');
  }
  return context;
};
