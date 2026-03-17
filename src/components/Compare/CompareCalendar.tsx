import React, { useState } from 'react';
import { isSameDay, isToday, format, eachDayOfInterval, endOfMonth, startOfMonth, addMonths, subMonths, getDay } from 'date-fns';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface CompareCalendarProps {
  availableDates?: string[]; // Optional prop, dates in 'yyyy-MM-dd' format
  onDateSelect: (date: string) => void; // Function to trigger FileExplorer with the selected date
}

const CompareCalendar: React.FC<CompareCalendarProps> = ({ availableDates = [], onDateSelect }) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date()); // Track the month being viewed

  // Generate the days for the current month only
  const startDate = startOfMonth(currentMonth);
  const endDate = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  // Calculate the number of leading blank days (based on the first day of the month)
  const leadingBlanks = Array((getDay(startDate) + 6) % 7).fill(null); // Adjust to start on Monday

  // Calculate trailing blanks to complete the last row if needed
  const totalCells = leadingBlanks.length + days.length;
  const trailingBlanks = Array((7 - (totalCells % 7)) % 7).fill(null);

  // Day labels for the calendar header, starting on Monday
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Check if a date is available (exists in availableDates array)
  const isAvailableDate = (date: Date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    return availableDates.includes(formattedDate);
  };

  const handleDateClick = (date: Date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    setSelectedDate(formattedDate);
    onDateSelect(formattedDate); // Call the function to trigger FileExplorer for this date
  };

  // Handlers for navigating months
  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <div className="calendar-container max-w-sm mx-auto p-4 bg-white dark:bg-boxdark rounded-lg shadow-md">
      {/* Month Navigation */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={goToPreviousMonth}
          className="text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition"
        >
          <FaChevronLeft size={20} /> {/* Left arrow icon */}
        </button>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button
          onClick={goToNextMonth}
          className="text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition"
        >
          <FaChevronRight size={20} /> {/* Right arrow icon */}
        </button>
      </div>

      {/* Day Labels */}
      <div className="grid grid-cols-7 gap-2 text-center mb-2">
        {dayLabels.map((day, index) => (
          <div key={index} className="text-gray-500 dark:text-gray-400 font-semibold">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days with Leading and Trailing Blanks */}
      <div className="grid grid-cols-7 gap-2 text-center">
        {/* Leading Blanks */}
        {leadingBlanks.map((_, index) => (
          <div key={`leading-${index}`} className="p-2"></div>
        ))}

        {/* Actual Days of the Month */}
        {days.map((day: Date, index: number) => {
          const isAvailable = isAvailableDate(day);
          const isSelected = selectedDate && isSameDay(new Date(selectedDate), day);
          const isTodayDate = isToday(day);

          return (
            <button
              key={index}
              onClick={() => isAvailable && handleDateClick(day)}
              className={`p-2 rounded-full transition-colors ${
                isAvailable ? 'text-primary' : 'text-gray-400'
              } ${isSelected ? 'bg-primary text-white' : ''} ${
                isTodayDate ? 'border border-primary' : ''
              } ${!isAvailable ? 'cursor-not-allowed' : 'hover:bg-primary hover:text-white'}`}
              disabled={!isAvailable} // Disable button if not available
            >
              {format(day, 'd')}
            </button>
          );
        })}

        {/* Trailing Blanks */}
        {trailingBlanks.map((_, index) => (
          <div key={`trailing-${index}`} className="p-2"></div>
        ))}
      </div>
    </div>
  );
};

export default CompareCalendar;
