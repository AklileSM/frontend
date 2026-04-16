import React, { useState, useRef, useEffect } from 'react';
import HomeCalendar from './HomeCalendar';
import ChartAll from '../components/Charts/Overview of data collected/ChartAll';
import ChartLocation from '../components/Charts/Overview of data collected per location/ChartLocation';
import HomeHeader from '../components/Header/HomeHeader';
import { useNavigate } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Skeleton helpers
// ---------------------------------------------------------------------------

const SkeletonBlock = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700 ${className ?? ''}`} />
);

const ChartSkeleton = () => (
  <div className="space-y-3 p-1">
    <SkeletonBlock className="h-4 w-1/3" />
    <div className="flex items-end gap-2 pt-2" style={{ height: 160 }}>
      {[60, 90, 45, 120, 75, 100, 55, 80].map((h, i) => (
        <div
          key={i}
          className="flex-1 animate-pulse rounded-t bg-gray-200 dark:bg-gray-700"
          style={{ height: `${h}px` }}
        />
      ))}
    </div>
    <SkeletonBlock className="h-3 w-2/3" />
    <SkeletonBlock className="h-3 w-1/2" />
  </div>
);

const CalendarSkeleton = () => (
  <div className="space-y-2">
    {/* header row */}
    <div className="flex items-center justify-between">
      <SkeletonBlock className="h-6 w-6 rounded-full" />
      <SkeletonBlock className="h-4 w-32" />
      <SkeletonBlock className="h-6 w-6 rounded-full" />
    </div>
    {/* weekday labels */}
    <div className="grid grid-cols-7 gap-1">
      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
        <div key={i} className="text-center text-xs font-semibold text-gray-300 dark:text-gray-600">
          {d}
        </div>
      ))}
    </div>
    {/* day cells */}
    {Array.from({ length: 5 }).map((_, row) => (
      <div key={row} className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, col) => (
          <SkeletonBlock key={col} className="h-10 rounded" />
        ))}
      </div>
    ))}
  </div>
);

const FloorplanPlaceholder = () => (
  <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 px-8 py-16 text-center">
    {/* Blueprint icon */}
    <svg
      className="h-14 w-14 text-gray-300 dark:text-gray-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20H5a2 2 0 01-2-2V6a2 2 0 012-2h4m6 16h4a2 2 0 002-2V6a2 2 0 00-2-2h-4m-6 16V4m6 16V4M9 4h6" />
    </svg>
    <p className="text-lg font-semibold text-gray-400 dark:text-gray-500">No floormap yet</p>
    <p className="text-sm text-gray-400 dark:text-gray-600 max-w-xs">
      A floor plan for this project hasn't been added. Upload one to enable the interactive map.
    </p>
  </div>
);

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const HomePage: React.FC = () => {
  const [selectedSlug, setSelectedSlug] = useState<string>('a6-stern');
  const isA6 = selectedSlug === 'a6-stern';

  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0 });
  const [pinnedCalendarPosition, setPinnedCalendarPosition] = useState<{ top: number; left: number } | null>(null);
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ChartLocation' | 'HomeCalendar'>('ChartLocation');

  const roomRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  const updateCalendarPosition = (top: number, left: number) => {
    if (calendarPosition.top !== top || calendarPosition.left !== left) {
      setCalendarPosition({ top, left });
    }
  };

  const handleRoomHover = (e: React.MouseEvent<HTMLDivElement>, room: string) => {
    setHoveredRoom(room);
  };

  const handleRoomLeave = () => {
    setHoveredRoom(null);
  };

  const handleRoomClick = (e: React.MouseEvent<HTMLDivElement>, room: string) => {
    e.stopPropagation();
    setPinnedCalendarPosition({ top: e.clientY, left: e.clientX });
    navigate('/RoomExplorer', { state: { room } });
  };

  const handleOutsideClick = () => {
    setPinnedCalendarPosition(null);
    setCalendarVisible(false);
  };

  const handleScroll = () => {
    setPinnedCalendarPosition(null);
    setCalendarVisible(false);
  };

  useEffect(() => {
    if (pinnedCalendarPosition) setCalendarVisible(false);
    document.addEventListener('click', handleOutsideClick);
    window.addEventListener('scroll', handleScroll);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [pinnedCalendarPosition]);

  return (
    <>
      <HomeHeader selectedSlug={selectedSlug} onProjectChange={setSelectedSlug} />

      <div className="relative flex flex-col lg:flex-row items-start justify-between min-h-screen bg-slate-100 dark:bg-black text-white p-8 overflow-hidden">

        {/* Left column — floorplan */}
        <div className="lg:w-2/3 pr-8 mt-20 ml-13">
          <div className="absolute inset-0 bg-gradient-radial from-transparent via-[#525f7f] to-black opacity-40 blur-3xl" style={{ zIndex: 0 }} />

          <h1 className="ml-3 text-5xl font-extrabold dark:text-primary text-black mb-7">
            Interactive Floorplan
          </h1>
          <p className="ml-3 text-xl text-gray-600 dark:text-gray-400 mb-7 text-left max-w-5xl">
            {isA6
              ? 'Hover over a room to display associated data dynamically in the data overview. Click on a room to navigate to a detailed explorer page for that room. Use the calendar to view specific data by date, or toggle between the data overview and the calendar.'
              : 'Select a room from the floor plan to explore captured data. No rooms or uploads have been configured for this project yet.'}
          </p>

          {/* Floor plan / placeholder */}
          <div className="relative p-4 dark:bg-gray-700 rounded-lg shadow-lg max-w-7xl max-h-[80vh] mb-12 mt-3">
            {isA6 ? (
              <>
                <img
                  src="/Images/floorplan.jpg"
                  alt="Floorplan"
                  className="rounded-lg w-full h-auto object-contain"
                />
                {/* Hotspots */}
                <div
                  ref={roomRef}
                  onMouseEnter={(e) => handleRoomHover(e, 'room1')}
                  onMouseLeave={handleRoomLeave}
                  onClick={(e) => handleRoomClick(e, 'room1')}
                  className="absolute top-[15%] left-[6.5%] w-[25%] h-[20%] sm:w-[4%] sm:h-[8%] md:w-[3%] md:h-[6%] lg:w-[13%] lg:h-[30%] bg-black bg-opacity-0 hover:bg-opacity-10 cursor-pointer rounded"
                  title="Room 1"
                />
                <div
                  onMouseEnter={(e) => handleRoomHover(e, 'room2')}
                  onMouseLeave={handleRoomLeave}
                  onClick={(e) => handleRoomClick(e, 'room2')}
                  className="absolute top-[15%] left-[20.5%] w-[5%] h-[10%] sm:w-[4%] sm:h-[8%] md:w-[3%] md:h-[6%] lg:w-[10%] lg:h-[30%] bg-black bg-opacity-0 hover:bg-opacity-10 cursor-pointer rounded"
                  title="Room 2"
                />
                <div
                  onMouseEnter={(e) => handleRoomHover(e, 'room3')}
                  onMouseLeave={handleRoomLeave}
                  onClick={(e) => handleRoomClick(e, 'room3')}
                  className="absolute top-[15%] left-[31%] w-[5%] h-[10%] sm:w-[4%] sm:h-[8%] md:w-[3%] md:h-[6%] lg:w-[10.5%] lg:h-[30%] bg-black bg-opacity-0 hover:bg-opacity-10 cursor-pointer rounded"
                  title="Room 3"
                />
                <div
                  onMouseEnter={(e) => handleRoomHover(e, 'room4')}
                  onMouseLeave={handleRoomLeave}
                  onClick={(e) => handleRoomClick(e, 'room4')}
                  className="absolute top-[15%] left-[42.5%] w-[8%] h-[15%] sm:w-[6%] sm:h-[12%] md:w-[5%] md:h-[10%] lg:w-[9.5%] lg:h-[30%] bg-black bg-opacity-0 hover:bg-opacity-10 cursor-pointer rounded"
                  title="Room 4"
                />
                <div
                  onMouseEnter={(e) => handleRoomHover(e, 'room5')}
                  onMouseLeave={handleRoomLeave}
                  onClick={(e) => handleRoomClick(e, 'room5')}
                  className="absolute top-[15%] left-[52.6%] w-[8%] h-[15%] sm:w-[6%] sm:h-[12%] md:w-[5%] md:h-[10%] lg:w-[9%] lg:h-[30%] bg-black bg-opacity-0 hover:bg-opacity-10 cursor-pointer rounded"
                  title="Room 5"
                />
                <div
                  onMouseEnter={(e) => handleRoomHover(e, 'room6')}
                  onMouseLeave={handleRoomLeave}
                  onClick={(e) => handleRoomClick(e, 'room6')}
                  className="absolute top-[35%] left-[70%] w-[10%] h-[20%] sm:w-[8%] sm:h-[15%] md:w-[6%] md:h-[12%] lg:w-[13%] lg:h-[38%] rotate-[124deg] bg-black bg-opacity-0 hover:bg-opacity-10 cursor-pointer rounded"
                  title="Room 6"
                />
              </>
            ) : (
              <FloorplanPlaceholder />
            )}
          </div>
        </div>

        {/* Right column — charts + calendar */}
        <div className="lg:w-1/3 flex flex-col space-y-5 mr-10">
          {/* Overview chart card */}
          <div className="p-6 dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
            {isA6 ? <ChartAll /> : <ChartSkeleton />}
          </div>

          {/* Tabbed section */}
          <div className="pt-3 p-6 dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300" style={{ zIndex: 10 }}>
            <div className="flex justify-center border-b border-gray-700 mb-4">
              <button
                onClick={() => setActiveTab('ChartLocation')}
                className={`py-2 px-4 text-sm font-semibold ${activeTab === 'ChartLocation' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}
              >
                Data Overview
              </button>
              <button
                onClick={() => setActiveTab('HomeCalendar')}
                className={`py-2 px-4 text-sm font-semibold ${activeTab === 'HomeCalendar' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}
              >
                Calendar
              </button>
            </div>

            <div className="mt-4" style={{ minHeight: '350px' }}>
              {isA6 ? (
                activeTab === 'ChartLocation' ? (
                  <ChartLocation hoveredRoom={hoveredRoom} />
                ) : (
                  <HomeCalendar />
                )
              ) : (
                activeTab === 'ChartLocation' ? (
                  <ChartSkeleton />
                ) : (
                  <CalendarSkeleton />
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {(calendarVisible || pinnedCalendarPosition) && (
        <div
          style={{
            position: 'fixed',
            top: pinnedCalendarPosition ? pinnedCalendarPosition.top + 10 : calendarPosition.top + 10,
            left: pinnedCalendarPosition ? pinnedCalendarPosition.left + 10 : calendarPosition.left + 10,
            zIndex: 20,
          }}
          className="bg-gray-700 p-4 rounded-lg shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <HomeCalendar />
        </div>
      )}
    </>
  );
};

export default HomePage;
