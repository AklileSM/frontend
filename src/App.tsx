import { useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';

import Loader from './common/Loader';
import PageTitle from './components/PageTitle';
import DefaultLayout from './layout/DefaultLayout';
import FileExplorer from './pages/Dashboard/FileExplorer';
import { SelectedDateProvider } from './components/selectedDate ';
import Projectx from './pages/Projectx';
import Projecty from './pages/Projecty';
import HomePage from './pages/HomePage'; 
import InteractiveViewer from './components/InteractiveViewer';
import StaticViewer from './components/StaticViewer';
import ComparePage from './components/Compare/ComparePage';
import Aframe_IntViewer from './components/Aframe_IntViewer';
import RoomFileViewer from './pages/RoomFileViewer';
import StaticViewerRoom from './components/staticViewerRoom';
import InteractiveViewerRoom from './components/interactiveViewerRoom';
import PCDViewer from './components/PCDViewer';
import PotreeViewer from './components/PotreeViewer';

function App() {
  const [loading, setLoading] = useState<boolean>(true);
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  const getTitleForPath = (path: string) => {
    switch (path) {
      case "/A6_Stern":
        return "Projects | A6_stern";
      case "/projectx":
        return "Projects | Project X";
      case "/projecty":
        return "Projects | Project Y";
      default:
        return "Projects | A6_stern";
    }
  };

  const currentTitle = getTitleForPath(pathname);

  return loading ? (
    <Loader />
  ) : (
    <SelectedDateProvider>
      {pathname === '/' ? (
        <Routes>
          <Route index element={<HomePage />} /> {/* Full-screen homepage */}
        </Routes>
      ) : (
        <DefaultLayout title={currentTitle}>
          <Routes>
            <Route
              path="/A6_Stern"
              element={
                <>
                  <PageTitle title="A6_stern | Projects " />
                  <FileExplorer />
                </>
              }
            />
            <Route
              path="/projectx"
              element={
                  <Projectx />
              }
            />
            <Route
              path="/projecty"
              element={
                <>
                  <PageTitle title="Project Y | Projects " />
                  <Projecty />
                </>
              }
            />
            <Route path="/interactiveViewer" element={<InteractiveViewer />} />
            <Route path="/interactiveViewerRoom" element={<InteractiveViewerRoom />} />
            <Route path="/staticViewer" element={<StaticViewer />} />
            <Route path="/staticViewerRoom" element={<StaticViewerRoom />} />
            <Route path="/Compare" element={<ComparePage />} />
            <Route path="/PCDViewer" element={<Aframe_IntViewer />} />
            <Route path="/RoomExplorer" element={<RoomFileViewer room={''} />} />
            <Route path='/PCD' element={<PCDViewer/>} />
            <Route path='/Potree' element={<PotreeViewer/>}/>
            
          </Routes>
        </DefaultLayout>
      )}
    </SelectedDateProvider>
  );
}

export default App;
