import { useState, useRef } from 'react';
import * as THREE from 'three';

const MarkerTool = () => {
  const [isMarkerMode, setIsMarkerMode] = useState(false);
  const [drawingPaths, setDrawingPaths] = useState<THREE.Vector3[][]>([]);
  const [activePath, setActivePath] = useState<THREE.Vector3[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const activePathRef = useRef<THREE.BufferGeometry | null>(null);

  const toggleMarkerMode = () => {
    setIsMarkerMode((prevMode) => !prevMode);
  };

  const finalizePath = (path: THREE.Vector3[]) => {
    setDrawingPaths((prevPaths) => [...prevPaths, path]);
  };

  const handlePointerDown = (event: any, camera: THREE.Camera, scene: THREE.Scene) => {
    if (!isMarkerMode || !camera || !scene) return;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const rect = event.target.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(scene.children);
    if (intersects.length > 0) {
      const point = intersects[0].point;
      setActivePath([new THREE.Vector3(point.x, point.y, point.z)]); // Start a new path
      setIsDrawing(true);

      if (!activePathRef.current) {
        activePathRef.current = new THREE.BufferGeometry();
      }
    }
  };

  const handlePointerMove = (event: any, camera: THREE.Camera, scene: THREE.Scene) => {
    if (!isDrawing || !camera || !scene) return;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const rect = event.target.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(scene.children);
    if (intersects.length > 0) {
      const point = intersects[0].point;

      setActivePath((prevPath) => {
        const lastPoint = prevPath[prevPath.length - 1];
        const minDistance = 0.2; // Minimum distance between points

        const newPath = [...prevPath];
        if (lastPoint && lastPoint.distanceTo(point) >= minDistance) {
          newPath.push(new THREE.Vector3(point.x, point.y, point.z));
        }

        if (activePathRef.current) {
          const vertices = newPath.flatMap((p) => [p.x, p.y, p.z]);
          activePathRef.current.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(vertices, 3)
          );
          activePathRef.current.computeBoundingSphere();
        }

        return newPath;
      });
    }
  };

  const handlePointerUp = () => {
    if (activePath.length > 0) {
      finalizePath(activePath);
      setActivePath([]); 
    }
    setIsDrawing(false);
  };

  return {
    isMarkerMode,
    setIsMarkerMode,
    drawingPaths,
    toggleMarkerMode,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    activePathRef,
  };
};

export default MarkerTool;
