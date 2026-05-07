import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import Loader from './common/Loader';
import PageTitle from './components/PageTitle';
import DefaultLayout from './layout/DefaultLayout';
import FileExplorer from './pages/Dashboard/FileExplorer';
import { SelectedDateProvider } from './components/selectedDate ';
import InteractiveViewer from './components/InteractiveViewer';
import StaticViewer from './components/StaticViewer';
import ComparePage from './components/Compare/ComparePage';
import Aframe_IntViewer from './components/Aframe_IntViewer';
import RoomFileViewer from './pages/RoomFileViewer';
import StaticViewerRoom from './components/staticViewerRoom';
import InteractiveViewerRoom from './components/interactiveViewerRoom';

import StaticPointCloudViewer from './components/StaticPointCloudViewer';
import PublicLandingPage from './pages/PublicLandingPage';

import ProtectedRoute from './components/Auth/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Unauthorized from './pages/Auth/Unauthorized';
import ProfilePage from './pages/ProfilePage';
import PdfViewerPage from './pages/PdfViewerPage';
import ProjectsDashboard from './pages/Dashboard/ProjectsDashboard';
import ProjectHomePage from './pages/ProjectHomePage';
import AdminPage from './pages/Admin/AdminPage';
import AdminUsersPage from './pages/Admin/AdminUsersPage';
import AdminProjectsPage from './pages/Admin/AdminProjectsPage';
import ProjectSettingsPage from './pages/ProjectSettings/ProjectSettingsPage';
import { ProjectProvider } from './context/ProjectContext';

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
  const isProjectHome = /^\/projects\/[^/]+$/.test(pathname);
  const isProjectSettings = /^\/projects\/[^/]+\/settings/.test(pathname);
  const isProjectsPage = pathname === '/projects';

  return (
    <AuthProvider>
      <ProjectProvider>
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
              <Route path="/" element={<RootPage />} />
              <Route path="/projects" element={<ProtectedRoute><ProjectsDashboard /></ProtectedRoute>} />
              <Route path="/projects/:slug/settings" element={<ProtectedRoute requireAdmin><ProjectSettingsPage /></ProtectedRoute>} />
              <Route path="/projects/:slug" element={<ProtectedRoute><ProjectHomePage /></ProtectedRoute>} />
            </Routes>
            {pathname !== '/' && !isProjectHome && !isProjectsPage && !isProjectSettings && (
              <DefaultLayout>
                <Routes>
                  <Route
                    path="/A6_Stern"
                    element={
                      <ProtectedRoute>
                        <>
                          <PageTitle title="A6_stern | Projects " />
                          <FileExplorer filterProjectSlug="a6-stern" />
                        </>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/projectx"
                    element={
                      <ProtectedRoute>
                        <>
                          <PageTitle title="Project X | Projects " />
                          <FileExplorer filterProjectSlug="projectx" projectLabel="Project X" />
                        </>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/projecty"
                    element={
                      <ProtectedRoute>
                        <>
                          <PageTitle title="Project Y | Projects " />
                          <FileExplorer filterProjectSlug="projecty" projectLabel="Project Y" />
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
                  <Route
                    path="/staticPointCloudViewer"
                    element={
                      <ProtectedRoute>
                        <StaticPointCloudViewer />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                  <Route path="/pdfViewer" element={<ProtectedRoute><PdfViewerPage /></ProtectedRoute>} />
                  <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminPage /></ProtectedRoute>} />
                  <Route path="/admin/users" element={<ProtectedRoute requireAdmin><AdminUsersPage /></ProtectedRoute>} />
                  <Route path="/admin/projects" element={<ProtectedRoute requireAdmin><AdminProjectsPage /></ProtectedRoute>} />
                </Routes>
              </DefaultLayout>
            )}
          </>
        )}
      </SelectedDateProvider>
      </ProjectProvider>
    </AuthProvider>
  );
}

function RootPage() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return <PublicLandingPage />;
  return <Navigate to="/projects" replace />;
}

export default App;
