import React, { useState, useEffect } from 'react';
import HomeCalendar from './HomeCalendar';
import ChartAll from '../components/Charts/Overview of data collected/ChartAll';
import ChartLocation from '../components/Charts/Overview of data collected per location/ChartLocation';
import HomeHeader from '../components/Header/HomeHeader';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listProjectRooms, type ApiProject, type ApiRoom } from '../services/apiClient';

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
    <div className="flex items-center justify-between">
      <SkeletonBlock className="h-6 w-6 rounded-full" />
      <SkeletonBlock className="h-4 w-32" />
      <SkeletonBlock className="h-6 w-6 rounded-full" />
    </div>
    <div className="grid grid-cols-7 gap-1">
      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
        <div key={i} className="text-center text-xs font-semibold text-gray-300 dark:text-gray-600">
          {d}
        </div>
      ))}
    </div>
    {Array.from({ length: 5 }).map((_, row) => (
      <div key={row} className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, col) => (
          <SkeletonBlock key={col} className="h-10 rounded" />
        ))}
      </div>
    ))}
  </div>
);

const FloorplanPlaceholder = ({ slug, isAdmin }: { slug: string; isAdmin: boolean }) => (
  <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 px-8 py-16 text-center">
    <svg
      className="h-14 w-14 text-gray-300 dark:text-gray-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20H5a2 2 0 01-2-2V6a2 2 0 012-2h4m6 16h4a2 2 0 002-2V6a2 2 0 00-2-2h-4m-6 16V4m6 16V4M9 4h6" />
    </svg>
    <p className="text-lg font-semibold text-gray-400 dark:text-gray-500">No floorplan yet</p>
    <p className="text-sm text-gray-400 dark:text-gray-600 max-w-xs">
      A floor plan for this project hasn't been added.
    </p>
    {isAdmin && (
      <Link
        to={`/projects/${slug}/settings`}
        state={{ tab: 'setup' }}
        className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Set up project
      </Link>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

interface HomePageProps {
  project: ApiProject;
}

const HomePage: React.FC<HomePageProps> = ({ project }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.is_admin ?? false;

  const [rooms, setRooms] = useState<ApiRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  const [pinnedCalendarPosition, setPinnedCalendarPosition] = useState<{ top: number; left: number } | null>(null);
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ChartLocation' | 'HomeCalendar'>('ChartLocation');

  useEffect(() => {
    setLoadingRooms(true);
    listProjectRooms(project.id)
      .then(setRooms)
      .catch(() => setRooms([]))
      .finally(() => setLoadingRooms(false));
  }, [project.id]);

  const handleRoomHover = (_e: React.MouseEvent<HTMLDivElement>, roomSlug: string) => {
    setHoveredRoom(roomSlug);
  };

  const handleRoomLeave = () => {
    setHoveredRoom(null);
  };

  const handleRoomClick = (e: React.MouseEvent<HTMLDivElement>, roomSlug: string) => {
    e.stopPropagation();
    setPinnedCalendarPosition({ top: e.clientY, left: e.clientX });
    navigate('/RoomExplorer', { state: { room: roomSlug } });
  };

  const handleOutsideClick = () => {
    setPinnedCalendarPosition(null);
  };

  const handleScroll = () => {
    setPinnedCalendarPosition(null);
  };

  useEffect(() => {
    document.addEventListener('click', handleOutsideClick);
    window.addEventListener('scroll', handleScroll);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [pinnedCalendarPosition]);

  const hasFloorplan = Boolean(project.floorplan_url);
  const placedRooms = rooms.filter((r) => r.floor_plan_coordinates !== null);
  const hasRooms = rooms.length > 0;

  return (
    <>
      <HomeHeader selectedSlug={project.slug} />

      <div className="relative flex flex-col lg:flex-row items-start justify-between min-h-screen bg-slate-100 dark:bg-black text-white p-8 overflow-hidden">

        {/* Left column — floorplan */}
        <div className="lg:w-2/3 pr-8 mt-20 ml-13">
          <div className="absolute inset-0 bg-gradient-radial from-transparent via-[#525f7f] to-black opacity-40 blur-3xl" style={{ zIndex: 0 }} />

          <h1 className="ml-3 text-5xl font-extrabold dark:text-primary text-black mb-7">
            Interactive Floorplan
          </h1>
          <p className="ml-3 text-xl text-gray-600 dark:text-gray-400 mb-7 text-left max-w-5xl">
            {hasFloorplan && hasRooms
              ? 'Hover over a room to display associated data dynamically in the data overview. Click on a room to navigate to a detailed explorer page for that room.'
              : 'Select a room from the floor plan to explore captured data.'}
          </p>

          {/* Floor plan / placeholder */}
          <div className="relative p-4 dark:bg-gray-700 rounded-lg shadow-lg max-w-7xl max-h-[80vh] mb-12 mt-3">
            {hasFloorplan ? (
              <>
                <img
                  src={project.floorplan_url!}
                  alt="Floorplan"
                  className="rounded-lg w-full h-auto object-contain"
                />
                {/* Dynamic hotspot overlays */}
                {placedRooms.map((room) => {
                  const c = room.floor_plan_coordinates!;
                  return (
                    <div
                      key={room.id}
                      onMouseEnter={(e) => handleRoomHover(e, room.slug)}
                      onMouseLeave={handleRoomLeave}
                      onClick={(e) => handleRoomClick(e, room.slug)}
                      title={room.name}
                      style={{
                        position: 'absolute',
                        top: `${c.y}%`,
                        left: `${c.x}%`,
                        width: `${c.width}%`,
                        height: `${c.height}%`,
                      }}
                      className="bg-black bg-opacity-0 hover:bg-primary hover:bg-opacity-20 cursor-pointer rounded border-2 border-transparent hover:border-primary transition-colors group"
                    >
                      <span className="absolute bottom-1 left-1 hidden group-hover:block rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">
                        {room.name}
                      </span>
                    </div>
                  );
                })}
                {/* Settings link for admins if rooms not set up */}
                {isAdmin && placedRooms.length === 0 && rooms.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/30">
                    <Link
                      to={`/projects/${project.slug}/settings`}
                      state={{ tab: 'setup' }}
                      className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                    >
                      Add rooms and place hotspots
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <FloorplanPlaceholder slug={project.slug} isAdmin={isAdmin} />
            )}
          </div>
        </div>

        {/* Right column — charts + calendar */}
        <div className="lg:w-1/3 flex flex-col space-y-5 mr-10">
          {/* Overview chart card */}
          <div className="p-6 dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
            {!loadingRooms ? <ChartAll /> : <ChartSkeleton />}
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
              {!loadingRooms ? (
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

      {pinnedCalendarPosition && (
        <div
          style={{
            position: 'fixed',
            top: pinnedCalendarPosition.top + 10,
            left: pinnedCalendarPosition.left + 10,
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
