import React, { useEffect } from "react";

const PotreeViewer: React.FC = () => {
    useEffect(() => {
        if (!(window as any).Potree) {
          console.error("Potree is not loaded. Ensure the scripts are included in index.html.");
          return;
        }
      
        const Potree = (window as any).Potree;
        const container = document.getElementById("potree_render_area");
      
        if (!container) {
          console.error("Potree render area not found.");
          return;
        }
      
        const viewer = new Potree.Viewer(container);
      
        viewer.setEDLEnabled(false);
        viewer.setFOV(60);
        viewer.setPointBudget(10_000_000);
        viewer.loadSettingsFromURL();
        viewer.setBackground("gradient");
      
        viewer.loadGUI(() => {
          viewer.setLanguage("en");
          document.getElementById("menu_tools")?.nextElementSibling?.setAttribute("style", "display: block;");
          document.getElementById("menu_clipping")?.nextElementSibling?.setAttribute("style", "display: block;");
          viewer.toggleSidebar();
        });
      
        Potree.loadPointCloud("../PCD/potree/metadata.json", "sigeom.sa", (e: any) => {
          const scene = viewer.scene;
          const pointcloud = e.pointcloud;
          const material = pointcloud.material;
      
          material.size = 1;
          material.pointSizeType = Potree.PointSizeType.ADAPTIVE;
          material.shape = Potree.PointShape.SQUARE;
      
          scene.addPointCloud(pointcloud);
          viewer.fitToScreen();
        });
      
        // Cleanup logic
        return () => {
          const renderArea = document.getElementById("potree_render_area");
          if (renderArea) {
            while (renderArea.firstChild) {
              renderArea.removeChild(renderArea.firstChild);
            }
          }
          console.log("Viewer cleanup complete.");
        };
      }, []);      

  return (
    <div
      className="potree_container"
      style={{ position: "absolute", width: "100%", height: "100%", left: 0, top: 10, zIndex: 500 }}
    >
      <div id="potree_render_area" ></div>
      <div id="potree_sidebar_container"></div>
    </div>
  );
};

export default PotreeViewer;
