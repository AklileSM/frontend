import React, { useState } from 'react';
import { useSelectedDate } from '../components/selectedDate ';
import { useNavigate } from 'react-router-dom';

const Calendar: React.FC = () => {
  const { setSelectedDate } = useSelectedDate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const navigate = useNavigate();

  // Define data availability for specific dates
  const dataByDate: { [key: string]: { images: number; videos: number; pointclouds: number } } = {
    // '2024-10-07': { images: 2, videos: 0, pointclouds: 2 },
    '2024-10-09': { images: 5, videos: 0, pointclouds: 1 },
    '2024-10-11': { images: 4, videos: 0, pointclouds: 1 },
    '2024-10-14': { images: 4, videos: 0, pointclouds: 2 },
    // '2024-10-16': { images: 4, videos: 0, pointclouds: 2 },
    // '2024-10-18': { images: 5, videos: 0, pointclouds: 2 },
    // '2024-10-21': { images: 5, videos: 0, pointclouds: 2 },
    // '2024-10-23': { images: 5, videos: 0, pointclouds: 2 },
    // '2024-10-25': { images: 5, videos: 0, pointclouds: 2 },
    // '2024-10-28': { images: 5, videos: 0, pointclouds: 2 },
    // '2024-11-01': { images: 5, videos: 0, pointclouds: 2 },
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDayOfMonth = (new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() + 6) % 7;
    const daysArray = Array(firstDayOfMonth).fill(null);

    for (let day = 1; day <= daysInMonth; day++) {
      daysArray.push(day);
    }

    return daysArray;
  };

  const handleDateClick = (day: number) => {
    const formattedDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(formattedDate);
    navigate('/A6_stern');
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleYearChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentDate(new Date(Number(event.target.value), currentDate.getMonth(), 1));
  };

  const yearsRange = Array.from({ length: 21 }, (_, i) => currentDate.getFullYear() - 10 + i);

  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-2">
        <button onClick={handlePrevMonth} className="px-2 py-1 text-primary text-sm">
          &#8592;
        </button>
        <div className="text-sm font-semibold flex items-center space-x-2 text-white">
          <span>{currentDate.toLocaleString('default', { month: 'long' })}</span>
          <div className="relative flex items-center">
            <select
              value={currentDate.getFullYear()}
              onChange={handleYearChange}
              className="appearance-none bg-transparent text-white text-sm font-semibold focus:outline-none cursor-pointer pr-6 no-scrollbar"
            >
              {yearsRange.map((year) => (
                <option key={year} value={year} className="bg-gray-800 text-white">
                  {year}
                </option>
              ))}
            </select>
            <span className="absolute right-1 top-1/2 transform -translate-y-1/2 text-primary pointer-events-none">
              &#8595;
            </span>
          </div>
        </div>
        <button onClick={handleNextMonth} className="px-2 py-1 text-primary text-sm">
          &#8594;
        </button>
      </div>

      <div className="w-full rounded-sm border shadow-default border-strokedark bg-boxdark">
        <table className="w-full text-xs">
          <thead>
            <tr className="grid grid-cols-7 bg-primary text-white text-center">
              <th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th><th>Sun</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.ceil(generateCalendarDays().length / 7) }).map((_, rowIndex) => (
              <tr key={rowIndex} className="grid grid-cols-7">
                {generateCalendarDays()
                  .slice(rowIndex * 7, rowIndex * 7 + 7)
                  .map((day, index) => {
                    const formattedDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const hasData = dataByDate.hasOwnProperty(formattedDate);

                    return (
                      <td
                        key={index}
                        className={`relative h-12 cursor-pointer border border-stroke p-1 text-center transition duration-500 ${
                          day ? (hasData ? 'bg-blue-500 text-white' : 'font-medium text-white') : 'bg-gray-800'
                        } hover:bg-opacity-80 border-strokedark hover:bg-meta-4`}
                        onClick={() => day && handleDateClick(day)}
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

export default Calendar;
