import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import SidebarLinkGroup from './SidebarLinkGroup';
import Calendar from '../../pages/Calendar';
import { useNavigate } from 'react-router-dom';
import { getHDImagePath } from '../../utils/pathutils'
import FileTree from '../FileTree';


// Define a type for the file structure
type MediaFiles = {
  images?: string[];
  videos?: string[];
  pointclouds?: string[];
};

// Type for the file tree data, allowing string keys
const fileTreeData: Record<string, MediaFiles> = {
  "2024-10-07": {
    images: ["room02.jpg", "room03.jpg"],
    pointclouds: ["Room 2.glb", "Room 3.glb"]
  },
  "2024-10-09": {
    images: ["room02.jpg", "room03.jpg", "room04.jpg", "room05.jpg", "room06.jpg"],
    pointclouds: ["Room 2.glb"]
  },
  "2024-10-11": {
    images: ["room02.jpg", "room03.jpg", "room04.jpg", "room06.jpg"],
    pointclouds: ["room02.e57"]
  }
};

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { pathname } = useLocation();
  const [fileTreeOpen, setFileTreeOpen] = useState<{ [key: string]: boolean }>({});
  const navigate = useNavigate();

  const toggleDateNode = (date: string) => {
    setFileTreeOpen((prev) => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  return (
    <div
      className={`fixed h-full transition-all duration-300 ${
        sidebarOpen ? 'w-64' : 'w-16'
      } bg-gray-800 text-white flex flex-col`}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="p-2 m-4 mt-5 bg-primary rounded-lg text-white self-end mr-3"
      >
        {sidebarOpen ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Logo Section */}
      <div className="hidden sm:block ml-4">
        {/* Light mode image */}
        {sidebarOpen && (
        <img 
          className="w-30 -mt-14 ml-1 " 
          src="Logo/LogoforDark.png" 
          alt="Logo for light mode" 
        />
        )}
      </div>


      {/* Sidebar Content */}
      <div className="flex-grow overflow-y-auto mt-4">
        {/* Main Navigation List */}
        <ul className="mb-6 flex flex-col gap-1.5">
          {/* Projects Section */}
          <SidebarLinkGroup activeCondition={pathname === '/' || pathname.includes('dashboard')}>
            {(handleClick, open) => (
              <React.Fragment>
                {/* Only render the item if sidebar is open */}
                {sidebarOpen && (
                  <NavLink
                    to="#"
                    className={`group relative flex items-center gap-2.5 px-4 py-2 mt-5 rounded-sm font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4 ${
                      (pathname === '/' || pathname.includes('dashboard')) && 'bg-graydark dark:bg-meta-4'
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      handleClick();
                    }}
                  >
                    <svg
                      className="fill-current"
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M6.10322 0.956299H2.53135C1.5751 0.956299 0.787598 1.7438 0.787598 2.70005V6.27192C0.787598 7.22817 1.5751 8.01567 2.53135 8.01567H6.10322C7.05947 8.01567 7.84697 7.22817 7.84697 6.27192V2.72817C7.8751 1.7438 7.0876 0.956299 6.10322 0.956299ZM6.60947 6.30005C6.60947 6.5813 6.38447 6.8063 6.10322 6.8063H2.53135C2.2501 6.8063 2.0251 6.5813 2.0251 6.30005V2.72817C2.0251 2.44692 2.2501 2.22192 2.53135 2.22192H6.10322C6.38447 2.22192 6.60947 2.44692 6.60947 2.72817V6.30005Z"
                        fill=""
                      />
                      <path
                        d="M15.4689 0.956299H11.8971C10.9408 0.956299 10.1533 1.7438 10.1533 2.70005V6.27192C10.1533 7.22817 10.9408 8.01567 11.8971 8.01567H15.4689C16.4252 8.01567 17.2127 7.22817 17.2127 6.27192V2.72817C17.2127 1.7438 16.4252 0.956299 15.4689 0.956299ZM15.9752 6.30005C15.9752 6.5813 15.7502 6.8063 15.4689 6.8063H11.8971C11.6158 6.8063 11.3908 6.5813 11.3908 6.30005V2.72817C11.3908 2.44692 11.6158 2.22192 11.8971 2.22192H15.4689C15.7502 2.22192 15.9752 2.44692 15.9752 2.72817V6.30005Z"
                        fill=""
                      />
                      <path
                        d="M6.10322 9.92822H2.53135C1.5751 9.92822 0.787598 10.7157 0.787598 11.672V15.2438C0.787598 16.2001 1.5751 16.9876 2.53135 16.9876H6.10322C7.05947 16.9876 7.84697 16.2001 7.84697 15.2438V11.7001C7.8751 10.7157 7.0876 9.92822 6.10322 9.92822ZM6.60947 15.272C6.60947 15.5532 6.38447 15.7782 6.10322 15.7782H2.53135C2.2501 15.7782 2.0251 15.5532 2.0251 15.272V11.7001C2.0251 11.4188 2.2501 11.1938 2.53135 11.1938H6.10322C6.38447 11.1938 6.60947 11.4188 6.60947 11.7001V15.272Z"
                        fill=""
                      />
                      <path
                        d="M15.4689 9.92822H11.8971C10.9408 9.92822 10.1533 10.7157 10.1533 11.672V15.2438C10.1533 16.2001 10.9408 16.9876 11.8971 16.9876H15.4689C16.4252 16.9876 17.2127 16.2001 17.2127 15.2438V11.7001C17.2127 10.7157 16.4252 9.92822 15.4689 9.92822ZM15.9752 15.272C15.9752 15.5532 15.7502 15.7782 15.4689 15.7782H11.8971C11.6158 15.7782 11.3908 15.5532 11.3908 15.272V11.7001C11.3908 11.4188 11.6158 11.1938 11.8971 11.1938H15.4689C15.7502 11.1938 15.9752 11.4188 15.9752 11.7001V15.272Z"
                        fill=""
                      />
                      <path d="M6.10322 0.956299H2.53135...Z" fill="" />
                    </svg>
                    <span>Projects</span>
                    <svg
                      className={`absolute right-4 top-1/2 -translate-y-1/2 fill-current ${
                        open && 'rotate-180'
                      }`}
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {/* Dropdown arrow icon */}
                      <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M4.41107 6.9107C4.73651 6.58527 5.26414 6.58527 5.58958 6.9107L10.0003 11.3214L14.4111 6.91071C14.7365 6.58527 15.2641 6.58527 15.5896 6.91071C15.915 7.23614 15.915 7.76378 15.5896 8.08922L10.5896 13.0892C10.2641 13.4147 9.73651 13.4147 9.41107 13.0892L4.41107 8.08922C4.08563 7.76378 4.08563 7.23614 4.41107 6.9107Z"
                              fill=""
                            />
                    </svg>
                  </NavLink>
                )}

                {/* Dropdown Menu for Projects */}
                {sidebarOpen && open && (
                  <div className="transform overflow-hidden">
                    <ul className="mt-4 mb-5.5 flex flex-col gap-2.5 pl-6">
                      <li>
                        <NavLink
                          to="projectx"
                          className={({ isActive }) =>
                            'group relative flex items-center gap-2.5 rounded-md px-4 font-medium text-bodydark2 duration-300 ease-in-out hover:text-white ' +
                            (isActive && '!text-white')
                          }
                        >
                          Project X
                        </NavLink>
                      </li>
                      <li>
                        <NavLink
                          to="/projecty"
                          className={({ isActive }) =>
                            'group relative flex items-center gap-2.5 rounded-md px-4 font-medium text-bodydark2 duration-300 ease-in-out hover:text-white ' +
                            (isActive && '!text-white')
                          }
                        >
                          Project Y
                        </NavLink>
                      </li>
                      <li>
                        <NavLink
                          to="/A6_Stern"
                          className={({ isActive }) =>
                            'group relative flex items-center gap-2.5 rounded-md px-4 font-medium text-bodydark2 duration-300 ease-in-out hover:text-white ' +
                            (isActive && '!text-white')
                          }
                        >
                          A6 Stern
                        </NavLink>
                      </li>
                    </ul>
                  </div>
                )}
              </React.Fragment>
            )}
          </SidebarLinkGroup>

          {/* File Tree Section */}
          {sidebarOpen && (
            <FileTree />
          )}





        </ul>
      </div>

      {/* Calendar Item at the Bottom */}
      <div className="w-full mb-4">
        {sidebarOpen && (
          <div className="w-full px-3.5">
            <Calendar />
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
