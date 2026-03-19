import { useEffect, useState } from 'react';
import { Route, Routes, useLocation, Navigate } from 'react-router-dom';

import Loader from './common/Loader';
import PageTitle from './components/PageTitle';
import DefaultLayout from './layout/DefaultLayout';
import FileExplorer from './pages/Dashboard/FileExplorer';
import { SelectedDateProvider } from './components/selectedDate ';
import Projectx from './pages/Projectx';
import Projecty from './pages/Projecty';
import InteractiveViewer from './components/InteractiveViewer';
import StaticViewer from './components/StaticViewer';
import ComparePage from './components/Compare/ComparePage';
import Aframe_IntViewer from './components/Aframe_IntViewer';
import RoomFileViewer from './pages/RoomFileViewer';
import StaticViewerRoom from './components/staticViewerRoom';
import InteractiveViewerRoom from './components/interactiveViewerRoom';
import PCDViewer from './components/PCDViewer';
import PotreeViewer from './components/PotreeViewer';
import HomePage from './pages/HomePage';

import ProtectedRoute from './components/Auth/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Auth/Login';
import Unauthorized from './pages/Auth/Unauthorized';

function App() {
  const [loading, setLoading] = useState<boolean>(true);
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

  const getTitleForPath = (path: string) => {
    switch (path) {
      case "/A6_Stern":
        return "Projects | A6_stern";
      case "/projectx":
        return "Projects | Project X";
      case "/projecty":
        return "Projects | Project Y";
      case "/":
        return "Home | A6_stern";
      default:
        return "Projects | A6_stern";
    }
  };

  const currentTitle = getTitleForPath(pathname);

  if (loading) return <Loader />;

  const isAuthPage = pathname === '/login' || pathname === '/unauthorized';

  return (
    <AuthProvider>
      <SelectedDateProvider>
        {/* Public auth routes */}
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
        </Routes>

        {/* Protected app routes */}
        {!isAuthPage && (
          <DefaultLayout title={currentTitle}>
            <Routes>
              <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
              <Route
                path="/A6_Stern"
                element={
                  <ProtectedRoute>
                    <>
                      <PageTitle title="A6_stern | Projects " />
                      <FileExplorer />
                    </>
                  </ProtectedRoute>
                }
              />
              <Route path="/projectx" element={<ProtectedRoute><Projectx /></ProtectedRoute>} />
              <Route
                path="/projecty"
                element={
                  <ProtectedRoute>
                    <>
                      <PageTitle title="Project Y | Projects " />
                      <Projecty />
                    </>
                  </ProtectedRoute>
                }
              />
              <Route path="/interactiveViewer" element={<ProtectedRoute><InteractiveViewer /></ProtectedRoute>} />
              <Route path="/interactiveViewerRoom" element={<ProtectedRoute><InteractiveViewerRoom /></ProtectedRoute>} />
              <Route path="/staticViewer" element={<ProtectedRoute><StaticViewer /></ProtectedRoute>} />
              <Route path="/staticViewerRoom" element={<ProtectedRoute><StaticViewerRoom /></ProtectedRoute>} />
              <Route path="/Compare" element={<ProtectedRoute><ComparePage /></ProtectedRoute>} />
              <Route path="/PCDViewer" element={<ProtectedRoute><Aframe_IntViewer /></ProtectedRoute>} />
              <Route path="/RoomExplorer" element={<ProtectedRoute><RoomFileViewer room={''} /></ProtectedRoute>} />
              <Route path="/PCD" element={<ProtectedRoute><PCDViewer /></ProtectedRoute>} />
              <Route path="/Potree" element={<ProtectedRoute><PotreeViewer /></ProtectedRoute>} />
            </Routes>
          </DefaultLayout>
        )}
      </SelectedDateProvider>
    </AuthProvider>
  );
}

export default App;
