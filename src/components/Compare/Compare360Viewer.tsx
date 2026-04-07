import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { TextureLoader, BackSide, WebGLRenderer, Scene, Camera } from 'three';
import { extractDateFromImageRef, stripQueryLastPathSegment } from '../../utils/imageViewerMeta';

type CompareViewerSide = 'left' | 'right';
type CameraSyncState = {
  position: [number, number, number];
  target: [number, number, number];
  source: CompareViewerSide;
  seq: number;
};

interface Compare360ViewerProps {
  viewerSide: CompareViewerSide;
  imageUrl: string;
  /** When set (e.g. from API explorer), overlay shows this instead of parsing the presigned URL. */
  displayFileName?: string;
  roomLabel?: string;
  captureDate?: string;
  onClose: () => void;
  onScreenshotsUpdate?: (screenshots: string[]) => void;
  onImageDetailsUpdate?: (fileName: string, formattedDate: string) => void;
  sharedCameraState: CameraSyncState | null;
  onCameraStateChange: (
    side: CompareViewerSide,
    state: { position: [number, number, number]; target: [number, number, number] },
  ) => void;
  isSynchronized: boolean;
  onTakeScreenshot?: (takeScreenshot: () => string | null) => void;
}

const PanoramicSphere: React.FC<{ imageUrl: string }> = ({ imageUrl }) => {
  const { gl } = useThree();
  const texture = useLoader(TextureLoader, imageUrl);

  useEffect(() => {
    texture.anisotropy = gl.capabilities.getMaxAnisotropy();
  }, [texture, gl]);

  return (
    <mesh>
      <sphereGeometry args={[500, 60, 40]} />
      <meshBasicMaterial map={texture} side={BackSide} />
    </mesh>
  );
};

// Helper component inside Canvas to access gl, scene, and camera
const ScreenshotHelper: React.FC<{ setRefs: (gl: WebGLRenderer, scene: Scene, camera: Camera) => void }> = ({ setRefs }) => {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    setRefs(gl, scene, camera);
  }, [gl, scene, camera, setRefs]);

  return null;
};

const Compare360Viewer: React.FC<Compare360ViewerProps> = ({
  viewerSide,
  imageUrl,
  displayFileName: displayFileNameProp,
  roomLabel: roomLabelProp,
  captureDate: captureDateProp,
  onClose,
  onScreenshotsUpdate,
  onImageDetailsUpdate,
  sharedCameraState,
  onCameraStateChange,
  isSynchronized,
  onTakeScreenshot,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);
  const [isToolbarOpen, setIsToolbarOpen] = useState(false);
  const [gl, setGl] = useState<WebGLRenderer | null>(null);
  const [scene, setScene] = useState<Scene | null>(null);
  const [camera, setCamera] = useState<Camera | null>(null);
  const capturedScreenshotsRef = useRef<string[]>([]);
  const orbitControlsRef = useRef<any>(null);
  const isApplyingRemoteStateRef = useRef(false);
  const lastBroadcastAtRef = useRef(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentScreenshot, setCurrentScreenshot] = useState<string | null>(null);

  const viewingFileName =
    (displayFileNameProp && displayFileNameProp.trim()) || stripQueryLastPathSegment(imageUrl);
  const formattedDate =
    (captureDateProp && captureDateProp.trim().slice(0, 10)) ||
    extractDateFromImageRef(imageUrl) ||
    '';

  // Define refs at the top level
  const glRef = useRef<WebGLRenderer | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const cameraRef = useRef<Camera | null>(null);

  // First useEffect: Assign refs when gl, scene, and camera are updated
  useEffect(() => {
    if (gl && scene && camera) {
      console.log("Assigning gl, scene, and camera to refs");
      glRef.current = gl;
      sceneRef.current = scene;
      cameraRef.current = camera;
    }
  }, [gl, scene, camera]);

  // Second useEffect: Set up the onTakeScreenshot callback
  useEffect(() => {
    if (onTakeScreenshot) {
      console.log("Assigning stable screenshot callback");
      onTakeScreenshot(() => {
        if (glRef.current && sceneRef.current && cameraRef.current) {
          console.log("Rendering and taking screenshot");
          glRef.current.render(sceneRef.current, cameraRef.current);
          return glRef.current.domElement.toDataURL("image/png");
        }
        return null;
      });
    }
  }, [onTakeScreenshot]);
  
  
  useEffect(() => {
    if (!isSynchronized || !camera || !sharedCameraState) return;
    if (sharedCameraState.source === viewerSide) return;

    isApplyingRemoteStateRef.current = true;
    camera.position.set(...sharedCameraState.position);
    if (orbitControlsRef.current?.target) {
      orbitControlsRef.current.target.set(...sharedCameraState.target);
      orbitControlsRef.current.update();
    }
    isApplyingRemoteStateRef.current = false;
  }, [sharedCameraState, isSynchronized, camera, viewerSide]);

  useEffect(() => {
    if (!camera) return;
    const target = orbitControlsRef.current?.target;
    onCameraStateChange(viewerSide, {
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: target ? [target.x, target.y, target.z] : [0, 0, 0],
    });
  }, [camera, viewerSide, onCameraStateChange]);

  const handleCameraChange = () => {
    if (!camera || !isSynchronized || isApplyingRemoteStateRef.current) return;

    const now = Date.now();
    if (now - lastBroadcastAtRef.current < 50) return;
    lastBroadcastAtRef.current = now;

    const target = orbitControlsRef.current?.target;
    onCameraStateChange(viewerSide, {
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: target ? [target.x, target.y, target.z] : [0, 0, 0],
    });
  };
  
  let roomNumber: string;
  if (roomLabelProp && roomLabelProp.trim()) {
    roomNumber = roomLabelProp.trim();
  } else {
    roomNumber = 'Unknown Room';
    const roomMatch = viewingFileName.match(/room(\d+)/i);
    if (roomMatch) {
      roomNumber = `Room ${parseInt(roomMatch[1], 10)}`;
    }
  }

  useEffect(() => {
    if (onImageDetailsUpdate) {
      onImageDetailsUpdate(viewingFileName, formattedDate || 'Unknown Date');
    }
  }, [viewingFileName, formattedDate, onImageDetailsUpdate]);
  
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      viewerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const takeScreenshot = () => {
    if (gl && scene && camera) {
      gl.render(scene, camera);
      const dataUrl = gl.domElement.toDataURL("image/png");

      const newScreenshots = [...capturedScreenshotsRef.current, dataUrl];
      capturedScreenshotsRef.current = newScreenshots;
      if (onScreenshotsUpdate) {
        onScreenshotsUpdate(newScreenshots);
      }

      // Open modal with the new screenshot
      setCurrentScreenshot(dataUrl);
      setIsModalOpen(true);

      // const link = document.createElement("a");
      // link.href = dataUrl;
      // link.download = "screenshot.png";
      // link.click();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div ref={viewerRef} className="w-full h-full relative bg-gray-700 rounded-lg overflow-hidden shadow-lg">
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-center bg-white dark:bg-gray-800 p-3 rounded-lg shadow-md z-999">
        <p className="text-sm text-black dark:text-gray-300 font-semibold">Viewing: {viewingFileName}</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {roomNumber}, (Date: {formattedDate || 'Unknown Date'})
        </p>
      </div>
      <button
        onClick={() => setIsToolbarOpen(!isToolbarOpen)}
        className="absolute top-4 right-4 bg-primary text-white p-2 rounded-full shadow-lg transition-transform duration-300 hover:scale-105 flex items-center justify-center z-999"
      >
        <svg
          className={`w-5 h-5 transition-transform duration-300 ${isToolbarOpen ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            d="M4.41107 6.9107C4.73651 6.58527 5.26414 6.58527 5.58958 6.9107L10.0003 11.3214L14.4111 6.91071C14.7365 6.58527 15.2641 6.58527 15.5896 6.91071C15.915 7.23614 15.915 7.76378 15.5896 8.08922L10.5896 13.0892C10.2641 13.4147 9.73651 13.4147 9.41107 13.0892L4.41107 8.08922C4.08563 7.76378 4.08563 7.23614 4.41107 6.9107Z"
          />
        </svg>
      </button>

      {isToolbarOpen && (
        <div className="flex flex-col space-y-4 right-1.5 pt-3 top-12 absolute rounded-lg shadow-lg z-999 px-2">
          {/* Area Measure Icon */}
          <button className="bg-primary text-white w-10 h-10 rounded-lg shadow-lg flex items-center justify-center hover:bg-opacity-80 transition">
            <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="#ffffff" width="18" height="18">
                <path d="M4,12L4,13L12,13L12,12L13,12L13,4L12,4L12,3L4,3L4,4L3,4L3,12L4,12ZM7,7L9,7L9,9L7,9L7,7ZM16,12L16,16L12,16L12,15L4,15L4,16L0,16L0,12L1,12L1,4L0,4L0,0L4,0L4,1L12,1L12,0L16,0L16,4L15,4L15,12L16,12Z"></path>
            </svg>
            </button>

            {/* Length Measure Icon */}
            <button className="bg-primary text-white w-10 h-10 rounded-lg shadow-lg flex items-center justify-center hover:bg-opacity-80 transition">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="#ffffff" width="18" height="18">
                <path d="M62.839,17.992L46.021,1.174c-1.551-1.549-4.058-1.549-5.606,0L1.173,40.414 c-1.547,1.551-1.547,4.057,0,5.607L17.99,62.838c1.55,1.549,4.059,1.549,5.608,0l39.24-39.24 C64.387,22.049,64.387,19.541,62.839,17.992z M61.437,22.196l-39.24,39.241c-0.774,0.774-2.029,0.774-2.804,0L2.575,44.619 c-0.774-0.773-0.774-2.03-0.001-2.804l2.104-2.101l2.803,2.802c0.387,0.389,1.014,0.389,1.402,0 c0.387-0.386,0.387-1.013-0.001-1.399l-2.803-2.805l2.803-2.803l5.605,5.607c0.389,0.387,1.015,0.387,1.401,0 c0.388-0.389,0.388-1.016,0-1.402l-5.604-5.605l2.802-2.804l2.803,2.804c0.388,0.386,1.015,0.386,1.402,0 c0.386-0.389,0.386-1.014,0-1.402l-2.804-2.803l2.804-2.803l5.605,5.605c0.387,0.388,1.014,0.388,1.401,0 c0.388-0.388,0.388-1.015,0-1.401l-5.605-5.605l2.801-2.805l2.805,2.804c0.388,0.387,1.015,0.387,1.4,0.001 c0.389-0.389,0.389-1.016,0-1.402l-2.803-2.803l2.803-2.803l5.605,5.604c0.388,0.387,1.015,0.387,1.401,0 c0.388-0.388,0.388-1.015,0-1.401l-5.606-5.606l2.804-2.802l2.803,2.802 c0.388,0.388,1.015,0.388,1.401,0c0.388-0.388,0.388-1.015,0-1.401l-2.803-2.802l2.102-2.104 c0.774-0.772,2.03-0.772,2.804,0l16.817,16.817C62.211,20.167,62.211,21.423,61.437,22.196z"></path>
                <path d="M51.007,17.006c-2.209,0-4,1.791-4,4s1.791,4,4,4s4-1.791,4-4S53.216,17.006,51.007,17.006z M51.007,23.006 c-1.104,0-2-0.896-2-2s0.896-2,2-2s2,0.896,2,2S52.111,23.006,51.007,23.006z"></path>
            </svg>
            </button>

            {/* Angle Measure Icon */}
            <button className="bg-primary text-white p-2 rounded-lg shadow-lg hover:bg-opacity-80 transition -mb-2">
                <svg fill="#ffffff" viewBox="0 0 111.353 111.353" xmlns="http://www.w3.org/2000/svg" width="24px" height="24px">
                    <path d="M97,85.508c-2.75,0-4.988,2.239-4.988,4.989v4.007c-0.04,0-0.118,0-0.157,0l0,0l-44.231-0.078 c0.118-0.236,0.196-0.433,0.314-0.668c0.354-0.903-0.079-1.965-0.982-2.318c-0.903-0.353-1.964,0.079-2.318,0.982 c-0.275,0.668-0.589,1.336-0.982,2.004h-18.58l14.377-17.167c0.707,0.511,1.571,1.257,2.475,2.2 c0.354,0.393,0.825,0.55,1.296,0.55c0.432,0,0.864-0.157,1.218-0.472c0.707-0.667,0.747-1.808,0.079-2.515 c-0.982-1.061-1.964-1.886-2.789-2.514l49.731-56.645l2.004,2.003c0.98,0.981,2.239,1.454,3.496,1.454s2.553-0.472,3.496-1.454 c1.925-1.926,1.925-5.106,0-7.031L89.066,1.444c-1.925-1.925-5.106-1.925-7.031,0c-1.926,1.926-1.926,5.106,0,7.031l2.356,2.317 L10.541,96.074c-1.257,1.491-1.532,3.573-0.707,5.343c0.825,1.728,2.593,2.944,4.518,2.944l0,0l77.503-0.116 c0.039,0,0.078,0,0.157,0v2.121c0,2.75,2.238,4.987,4.988,4.987s4.989-2.237,4.989-4.987V90.457 C101.95,87.748,99.75,85.508,97,85.508z"></path>
                </svg>
            </button>

            {/* Marking Icon */}
            <button className="bg-primary text-white p-2 rounded-lg shadow-lg hover:bg-opacity-80 transition -mb-2">
                <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" fill="#ffffff" width="24px" height="24px">
                    <path d="M208.125,399.449c0,0,9.656-15.703,21.266-34.563L75.469,270.152c-11.609,18.859-21.281,34.563-21.281,34.563 s27.797,60.406-9.906,121.656l29.844,18.375l29.844,18.375C141.656,401.855,208.125,399.449,208.125,399.449z"></path>
                    <path d="M389.531,104.684c6.031-9.828,2.984-22.719-6.859-28.781L264.359,3.105 c-9.828-6.047-22.703-2.984-28.766,6.844L83.188,257.59l153.938,94.719L389.531,104.684z"></path>
                    <polygon points="22.531,488.637 74.188,488.637 87.484,467.043 48.219,442.871 "></polygon>
                    <path d="M482.406,484.449H117.844c-3.906,0-7.063,3.156-7.063,7.063v13.438c0,3.891,3.156,7.047,7.063,7.047h364.563 c3.906,0,7.063-3.156,7.063-7.047v-13.438C489.469,487.605,486.313,484.449,482.406,484.449z"></path>
                </svg>
            </button>

            {/* Screenshot Icon */}
            <button onClick={takeScreenshot} className="bg-primary text-white p-2 rounded-lg shadow-lg hover:bg-opacity-80 transition -mb-2">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#ffffff" stroke="#ffffff">
                <path d="M3 3h2v2H3V3zm4 0h2v2H7V3zm4 0h2v2h-2V3zm4 0h2v2h-2V3zm4 0h2v2h-2V3zm0 4h2v2h-2V7zM3 19h2v2H3v-2zm0-4h2v2H3v-2zm0-4h2v2H3v-2zm0-4h2v2H3V7zm7.667 4l1.036-1.555A1 1 0 0 1 12.535 9h2.93a1 1 0 0 1 .832.445L17.333 11H20a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h2.667zM9 19h10v-6h-2.737l-1.333-2h-1.86l-1.333 2H9v6zm5-1a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"></path>
              </svg>
            </button>
        </div>
      )}

      <button
        onClick={onClose}
        className="absolute z-999 top-4 left-4 bg-primary text-white p-2 rounded-full shadow-lg transition-transform duration-300 hover:scale-110"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <button
        onClick={toggleFullscreen}
        className="absolute bottom-4 right-4 bg-primary text-white p-3 rounded-full shadow-lg transition-transform duration-300 hover:scale-110 z-999"
      >
        {isFullscreen ? (
          <svg fill="#ffffff" height="24px" width="24px" viewBox="0 0 385.331 385.331" xmlns="http://www.w3.org/2000/svg">
            <path d="M264.943,156.665h108.273c6.833,0,11.934-5.39,11.934-12.211c0-6.833-5.101-11.85-11.934-11.838h-96.242V36.181 c0-6.833-5.197-12.03-12.03-12.03s-12.03,5.197-12.03,12.03v108.273c0,0.036,0.012,0.06,0.012,0.084 c0,0.036-0.012,0.06-0.012,0.096C252.913,151.347,258.23,156.677,264.943,156.665z"></path>
            <path d="M120.291,24.247c-6.821,0-11.838,5.113-11.838,11.934v96.242H12.03c-6.833,0-12.03,5.197-12.03,12.03 c0,6.833,5.197,12.03,12.03,12.03h108.273c0.036,0,0.06-0.012,0.084-0.012c0.036,0,0.06,0.012,0.096,0.012 c6.713,0,12.03-5.317,12.03-12.03V36.181C132.514,29.36,127.124,24.259,120.291,24.247z"></path>
            <path d="M120.387,228.666H12.115c-6.833,0.012-11.934,5.39-11.934,12.223c0,6.833,5.101,11.85,11.934,11.838h96.242v96.423 c0,6.833,5.197,12.03,12.03,12.03c6.833,0,12.03-5.197,12.03-12.03V240.877c0-0.036-0.012-0.06-0.012-0.084 c0-0.036,0.012-0.06,0.012-0.096C132.418,233.983,127.1,228.666,120.387,228.666z"></path>
            <path d="M373.3,228.666H265.028c-0.036,0-0.06,0.012-0.084,0.012c-0.036,0-0.06-0.012-0.096-0.012 c-6.713,0-12.03,5.317-12.03,12.03v108.273c0,6.833,5.39,11.922,12.223,11.934c6.821,0.012,11.838-5.101,11.838-11.922v-96.242 H373.3c6.833,0,12.03-5.197,12.03-12.03S380.134,228.678,373.3,228.666z"></path>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
            <path d="M4 4h5V2H2v7h2V4zm15 0h-5V2h7v7h-2V4zM4 20h5v2H2v-7h2v5zm15-5h2v7h-7v-2h5z" />
          </svg>
        )}
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-9999">
          <div className="bg-white dark:bg-boxdark rounded-lg shadow-xl w-[40rem] max-w-full p-6 relative">
            {/* Close Button with Styled SVG */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-transform transform hover:scale-110"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                className="w-6 h-6 text-gray-800 dark:text-white"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Title Section */}
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white text-center mb-4">
              Screenshot Taken
            </h2>

            {/* Screenshot Display */}
            <div className="flex justify-center items-center mb-6">
              {currentScreenshot && (
                <img
                  src={currentScreenshot}
                  alt="Screenshot"
                  className="rounded-md max-w-full max-h-full shadow-lg border border-gray-300 dark:border-gray-700"
                />
              )}
            </div>

            {/* Download Button */}
            <div className="flex justify-center">
              <button
                onClick={() => {
                  if (currentScreenshot) {
                    const link = document.createElement("a");
                    link.href = currentScreenshot;
                    link.download = "screenshot.png";
                    link.click();
                  }
                }}
                className="bg-primary text-white py-2 px-6 rounded-lg hover:bg-primary-dark transition-shadow shadow-md"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      <Canvas camera={{ fov: 70, position: [0, 0, 20] }}>
        <ScreenshotHelper setRefs={(gl, scene, camera) => {
          setGl(gl);
          setScene(scene);
          setCamera(camera);
        }} />
        <PanoramicSphere imageUrl={imageUrl} />
        <OrbitControls
          ref={orbitControlsRef}
          enablePan={true}
          enableZoom={false}
          enableDamping={true}
          dampingFactor={0.3}
          onChange={handleCameraChange}
        />
      </Canvas>
    </div>
  );
};

export default Compare360Viewer;
