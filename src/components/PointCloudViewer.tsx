// PointCloudViewer.tsx
import React, { useRef, useEffect, useState, useCallback } from "react";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import * as THREE from "three";

type PointCloudProps = {
  url: string; // URL to the .ply file
};

const PointCloud: React.FC<PointCloudProps> = ({ url }) => {
  const geometry = useLoader(PLYLoader, url);
  const pointsRef = useRef<THREE.Points>(null!);

  useEffect(() => {
    geometry.computeBoundingBox();
    const boundingBox = geometry.boundingBox;

    if (boundingBox) {
      const center = new THREE.Vector3();
      boundingBox.getCenter(center);
      geometry.translate(-center.x, -center.y, -center.z);
    }
  }, [geometry]);

  const material = new THREE.PointsMaterial({
    size: 0.01,
    vertexColors: true,
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
};

const WASDControls = () => {
  const { camera } = useThree();

  // State to track which keys are pressed
  const [keys, setKeys] = useState({
    w: false,
    a: false,
    s: false,
    d: false,
  });

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    setKeys((prevKeys) => ({ ...prevKeys, [event.key.toLowerCase()]: true }));
  }, []);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    setKeys((prevKeys) => ({ ...prevKeys, [event.key.toLowerCase()]: false }));
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Move the camera based on which keys are pressed
  useFrame(() => {
    const speed = 0.1;

    if (keys.w) camera.position.z -= speed; // Move forward
    if (keys.s) camera.position.z += speed; // Move backward
    if (keys.a) camera.position.x -= speed; // Move left
    if (keys.d) camera.position.x += speed; // Move right
  });

  return null;
};

const PointCloudViewer: React.FC<PointCloudProps> = ({ url }) => {
  return (
    <Canvas
      style={{ width: "100vw", height: "100vh" }}
      camera={{ position: [0, 0, 5], fov: 75 }}
    >
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <OrbitControls enableDamping={false} autoRotate={false} />
      <PointCloud url={url} />
      <WASDControls /> {/* Add custom WASD controls */}
    </Canvas>
  );
};

export default PointCloudViewer;
