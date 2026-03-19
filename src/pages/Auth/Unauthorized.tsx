import React from 'react';
import { Link } from 'react-router-dom';

const Unauthorized: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-2 dark:bg-boxdark-2 px-4">
      <div className="w-full max-w-md bg-white dark:bg-boxdark rounded-xl shadow-card p-8 text-center">
        <h1 className="text-title-md font-semibold text-black dark:text-white">Access denied</h1>
        <p className="mt-2 text-body dark:text-bodydark">You don’t have permission to view this page.</p>
        <Link to="/A6_Stern" className="inline-block mt-6 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-md">Go to dashboard</Link>
      </div>
    </div>
  );
};

export default Unauthorized;
