import React from 'react';
import 'aframe';
import 'aframe-extras';

// Initialize aframe-extras and enable the PLY loader
import 'aframe-extras/dist/aframe-extras.loaders.js';

const AFrameScene: React.FC = () => {
  return (
    <a-scene>
      {/* Sky with a 360° image */}
      <a-sky src="path/to/your-360-image.jpg"></a-sky>

      {/* Basic 3D shapes for demonstration */}
      <a-box position="0 1 -5" rotation="0 45 0" color="#4CC3D9"></a-box>
      <a-sphere position="1 1.25 -3" radius="1.25" color="#EF2D5E"></a-sphere>
      <a-cylinder position="-1 0.75 -3" radius="0.5" height="1.5" color="#FFC65D"></a-cylinder>
      <a-plane position="0 0 -4" rotation="-90 0 0" width="4" height="4" color="#7BC8A4"></a-plane>

      {/* 3D Model loaded from PLY file */}
      <a-entity
        ply-model="src: url(/PCD/20241007/Room.ply)"
        position="0 1 -5"
        scale="1 1 1"
      ></a-entity>

      {/* Camera with cursor for navigation */}
      <a-camera>
        <a-cursor></a-cursor>
      </a-camera>
    </a-scene>
  );
};

export default AFrameScene;
