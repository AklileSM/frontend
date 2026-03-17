// Updated LengthTool.tsx
import React, { useState } from 'react';
import * as THREE from 'three';

const LengthTool = () => {
    const [isLengthMode, setIsLengthMode] = useState(false);
    const [points, setPoints] = useState<THREE.Vector3[]>([]);
    const [lines, setLines] = useState<[THREE.Vector3, THREE.Vector3][]>([]);
    const [activeLineStart, setActiveLineStart] = useState<THREE.Vector3 | null>(null);
    const [activeLineEnd, setActiveLineEnd] = useState<THREE.Vector3 | null>(null);

    const [isPromptOpen, setIsPromptOpen] = useState(false);
    const [virtualMeasurement, setVirtualMeasurement] = useState(0);
    const [realMeasurement, setRealMeasurement] = useState('');
    const [scaleFactor, setScaleFactor] = useState<number | null>(null);
    const [isCalibrated, setIsCalibrated] = useState(false);

    const toggLengthMode = () => {
        setIsLengthMode((prevMode) => !prevMode);
    };

    const handleAddPoint = (point: THREE.Vector3) => {
        if (!activeLineStart) {
            setActiveLineStart(point);
        } else {
            const newLine: [THREE.Vector3, THREE.Vector3] = [activeLineStart, point];
            setLines((prevLines) => [...prevLines, newLine]);
            setActiveLineStart(null);
            setActiveLineEnd(null);
    
            const distance = activeLineStart.distanceTo(point);
            setVirtualMeasurement(parseFloat(distance.toFixed(2))); // Convert string to number
    
            // Trigger modal only if not calibrated
            if (!isCalibrated) {
                setIsPromptOpen(true);
            }
        }
    };       

    const handleUpdateLineEnd = (point: THREE.Vector3) => {
        setActiveLineEnd(point);
    };

    const handleLengthClick = (event: any, camera: THREE.Camera, scene: THREE.Scene) => {
        if (isLengthMode) {
            const raycaster = new THREE.Raycaster();
            const mouse = new THREE.Vector2();

            const rect = event.target.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(scene.children, true);

            if (intersects.length > 0) {
                const point = intersects[0].point;
                handleAddPoint(new THREE.Vector3(point.x, point.y, point.z));
            }
        }
    };

    const handleLengthPointerMove = (event: any, camera: THREE.Camera, scene: THREE.Scene) => {
        if (isLengthMode && activeLineStart) {
            const raycaster = new THREE.Raycaster();
            const mouse = new THREE.Vector2();

            const rect = event.target.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(scene.children, true);

            if (intersects.length > 0) {
                const point = intersects[0].point;
                handleUpdateLineEnd(new THREE.Vector3(point.x, point.y, point.z));
            }
        }
    };

    const handleRealMeasurementSubmit = () => {
        const realDistance = parseFloat(realMeasurement);
        const calculatedScaleFactor = realDistance / virtualMeasurement;
        setScaleFactor(calculatedScaleFactor);
        setIsCalibrated(true); // Mark as calibrated
        console.log('Virtual Distance:', virtualMeasurement);
        console.log('Scale Factor:', calculatedScaleFactor);
    
        setIsPromptOpen(false);
        setRealMeasurement('');
    };    

    const convertToRealWorldDistance = (virtualDistance: number): number => {
        if (scaleFactor) {
            return virtualDistance * scaleFactor;
        }
        return virtualDistance; // Always return a number
    };    

    return {
        toggLengthMode,
        setIsLengthMode,
        isLengthMode,
        points,
        lines,
        activeLineStart,
        activeLineEnd,
        handleAddPoint,
        handleUpdateLineEnd,
        handleLengthClick,
        handleLengthPointerMove,
        isPromptOpen,
        setIsPromptOpen,
        virtualMeasurement,
        realMeasurement,
        setRealMeasurement,
        handleRealMeasurementSubmit,
        convertToRealWorldDistance,
        isCalibrated
    };
};

export default LengthTool;
