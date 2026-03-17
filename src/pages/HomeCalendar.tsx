import React, { useState } from 'react';
import { useSelectedDate } from '../components/selectedDate ';
import { useNavigate } from 'react-router-dom';

const HomeCalendar: React.FC = () => {
  const { setSelectedDate } = useSelectedDate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDateData, setHoveredDateData] = useState<{ images: number; videos: number; pointclouds: number } | null>(null);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const dataByDate: { [key: string]: { images: number; videos: number; pointclouds: number } } = {
    '2024-10-07': { images: 2, videos: 0, pointclouds: 2 },
    '2024-10-09': { images: 5, videos: 0, pointclouds: 1 },
    '2024-10-11': { images: 4, videos: 0, pointclouds: 0 },
    '2024-10-14': { images: 4, videos: 0, pointclouds: 0 },
    '2024-10-16': { images: 4, videos: 0, pointclouds: 0 },
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

  const navigate = useNavigate();
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

  const handleDateHover = (day: number | null) => {
    if (!day) {
      setHoveredDateData(null);
      setHoveredDay(null);
      return;
    }
    const formattedDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setHoveredDateData(dataByDate[formattedDate] || null);
    setHoveredDay(day);
  };

  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-2">
        <button onClick={handlePrevMonth} className="px-2 py-1 text-primary text-sm">
          &#8592;
        </button>
        <div className="text-sm font-semibold flex items-center space-x-2 text-black dark:text-white">
          <span>{currentDate.toLocaleString('default', { month: 'long' })}</span>
          <div className="relative flex items-center">
            <select
              value={currentDate.getFullYear()}
              onChange={handleYearChange}
              className="appearance-none bg-transparent text-black dark:text-white text-sm font-semibold focus:outline-none cursor-pointer pr-6 no-scrollbar"
            >
              {yearsRange.map((year) => (
                <option key={year} value={year} className="bg-gray-100 dark:bg-gray-800 text-black dark:text-white">
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
            {Array.from({ length: Math.ceil(generateCalendarDays().length / 7) }).map((_, rowIndex) => (
              <tr key={rowIndex} className="grid grid-cols-7">
                {generateCalendarDays()
                  .slice(rowIndex * 7, rowIndex * 7 + 7)
                  .map((day, index) => (
                    <td
                      key={index}
                      className={`ease relative h-20 cursor-pointer border border-stroke p-2 transition duration-500 hover:bg-gray dark:border-strokedark dark:hover:bg-meta-4 ${
                        day
                          ? dataByDate[`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`]
                            ? 'bg-primary font-medium text-white'
                            : 'font-medium text-black dark:text-white'
                          : 'bg-gray-100 dark:bg-meta-4'
                      }`}
                      onClick={() => day && handleDateClick(day)}
                      onMouseEnter={() => handleDateHover(day)}
                      onMouseLeave={() => handleDateHover(null)}
                    >
                      {day || ''}
                      {hoveredDateData && day === hoveredDay && (
                        <div className="absolute top-full mt-1 left-1/2 transform -translate-x-1/2 bg-gray-700 text-white text-sm rounded p-2 shadow-lg z-10 w-36">
                          <p className="font-semibold">Available Data</p>
                          <p>Images: {hoveredDateData.images}</p>
                          <p>Videos: {hoveredDateData.videos}</p>
                          <p>Point Clouds: {hoveredDateData.pointclouds}</p>
                        </div>
                      )}
                    </td>
                  ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HomeCalendar;
