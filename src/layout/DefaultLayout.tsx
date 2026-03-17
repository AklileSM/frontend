import React, { useState, ReactNode } from 'react';
import Header from '../components/Header/index';
import Sidebar from '../components/Sidebar/index';

const DefaultLayout: React.FC<{ children: ReactNode; title?: string }> = ({ children, title }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div 
      className="dark:bg-boxdark-2 dark:text-bodydark"
      style={{
        scrollbarColor: '#4B5563 #1F2937',
      }}
    >
      <div className="flex h-screen overflow-hidden">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <div
          className={`relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden transition-all duration-300 ${
            sidebarOpen ? "ml-64" : "ml-16"
          }`}
        >
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title={title} />
          <main>
            <div className="mx-auto p-4 md:p-6 2xl:p-10">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default DefaultLayout;
