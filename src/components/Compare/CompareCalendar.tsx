import React, { useState } from 'react';
import CalendarMonthYearControls from '../CalendarMonthYearControls';

interface CompareCalendarProps {
  availableDates?: string[];
  onDateSelect: (date: string) => void;
}

const CompareCalendar: React.FC<CompareCalendarProps> = ({ availableDates = [], onDateSelect }) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDayOfMonth =
      (new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() + 6) % 7;
    const daysArray = Array(firstDayOfMonth).fill(null);

    for (let day = 1; day <= daysInMonth; day++) {
      daysArray.push(day);
    }

    return daysArray;
  };

  const handleDateClick = (day: number) => {
    const formattedDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (!availableDates.includes(formattedDate)) return;
    setSelectedDate(formattedDate);
    onDateSelect(formattedDate);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const calendarDays = generateCalendarDays();

  return (
    <div className="relative w-full max-w-full p-2">
      <div className="flex justify-between items-center mb-2">
        <button onClick={handlePrevMonth} className="px-2 py-1 text-primary text-sm">
          &#8592;
        </button>
        <div className="min-w-0 flex-1">
          <CalendarMonthYearControls
            currentDate={currentDate}
            onCurrentDateChange={setCurrentDate}
            variant="default"
          />
        </div>
        <button onClick={handleNextMonth} className="px-2 py-1 text-primary text-sm">
          &#8594;
        </button>
      </div>

      <div className="w-full max-w-full rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <table className="w-full text-xs">
          <thead>
            <tr className="grid grid-cols-7 rounded-t-sm bg-primary text-white">
              <th>Mon</th>
              <th>Tue</th>
              <th>Wed</th>
              <th>Thu</th>
              <th>Fri</th>
              <th>Sat</th>
              <th>Sun</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.ceil(calendarDays.length / 7) }).map((_, rowIndex) => (
              <tr key={rowIndex} className="grid grid-cols-7">
                {calendarDays
                  .slice(rowIndex * 7, rowIndex * 7 + 7)
                  .map((day, index) => {
                    const formattedDate = day
                      ? `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                      : '';
                    const hasData = !!day && availableDates.includes(formattedDate);
                    const isSelected = !!day && selectedDate === formattedDate;

                    return (
                      <td
                        key={index}
                        className={`ease relative h-20 border border-stroke p-2 transition duration-500 dark:border-strokedark ${
                          day
                            ? hasData
                              ? isSelected
                                ? 'cursor-pointer bg-primary text-white'
                                : 'cursor-pointer bg-primary font-medium text-white hover:bg-gray dark:hover:bg-meta-4'
                              : 'cursor-not-allowed font-medium text-black dark:text-white'
                            : 'bg-gray-100 dark:bg-meta-4'
                        }`}
                        onClick={() => day && hasData && handleDateClick(day)}
                      >
                        {day || ''}
                      </td>
                    );
                  })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CompareCalendar;
