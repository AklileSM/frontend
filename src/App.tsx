import { useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';

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
import Register from './pages/Auth/Register';
import Unauthorized from './pages/Auth/Unauthorized';
import ProfilePage from './pages/ProfilePage';
import PdfViewerPage from './pages/PdfViewerPage';

function App() {
  const [loading, setLoading] = useState<boolean>(true);
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

  if (loading) return <Loader />;

  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/unauthorized';

  return (
    <AuthProvider>
      <SelectedDateProvider>
        {/* Public auth routes */}
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
        </Routes>

        {/* Protected app routes: home is full-screen without sidebar/header layout */}
        {!isAuthPage && (
          <>
            <Routes>
              <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            </Routes>
            {pathname !== '/' && (
              <DefaultLayout>
                <Routes>
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
                  <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                  <Route path="/pdfViewer" element={<ProtectedRoute><PdfViewerPage /></ProtectedRoute>} />
                </Routes>
              </DefaultLayout>
            )}
          </>
        )}
      </SelectedDateProvider>
    </AuthProvider>
  );
}

export default App;
