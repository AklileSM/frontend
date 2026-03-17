import React, { useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei'; // Import Html for overlay text
import { invalidate } from '@react-three/fiber';

const AreaTool = () => {
    const [isAreaMode, setIsAreaMode] = useState(false);
    const [points, setPoints] = useState<THREE.Vector3[]>([]);
    const [lines, setLines] = useState<[THREE.Vector3, THREE.Vector3][]>([]);
    const [currentStartPoint, setCurrentStartPoint] = useState<THREE.Vector3 | null>(null);
    const [currentEndPoint, setCurrentEndPoint] = useState<THREE.Vector3 | null>(null);
    const [isPolygonClosed, setIsPolygonClosed] = useState(false); // Track polygon closure
    const [area, setArea] = useState<number | null>(null); // Store the calculated area
    const [isHoveringThreshold, setIsHoveringThreshold] = useState(false); // Track feedback

    const toggleAreaMode = () => {
        setIsAreaMode((prevMode) => {
            if (prevMode) {
                // Reset state when turning off
                setCurrentStartPoint(null);
                setCurrentEndPoint(null);
                setPoints([]);
                setLines([]);
                setIsPolygonClosed(false);
                setArea(null); // Clear area when resetting
            }
            return !prevMode; // Toggle mode
        });
    };

    const handleAddPoint = (point: THREE.Vector3) => {
        if (isPolygonClosed) return;

        if (!currentStartPoint) {
            setCurrentStartPoint(point);
            setPoints([point]);
        } else {
            const distanceToFirstPoint = point.distanceTo(points[0]);
            const threshold = 20; // Adjust this value based on scene scale
            if (distanceToFirstPoint < threshold) {
                // Snap to the starting point to close the polygon
                setLines((prevLines) => [...prevLines, [currentStartPoint, points[0]]]);
                setIsPolygonClosed(true);
                setCurrentStartPoint(null);
                setCurrentEndPoint(null);
            } else {
                // Add a new line and update the start point
                setLines((prevLines) => [...prevLines, [currentStartPoint, point]]);
                setCurrentStartPoint(point);
                setPoints((prevPoints) => [...prevPoints, point]);
            }
        }
    };

    const handleUpdateEndPoint = (point: THREE.Vector3) => {
        if (!isPolygonClosed) {
            setCurrentEndPoint(point); // Update dynamic endpoint
        }
    };

    const handleAreaClick = (event: any, camera: THREE.Camera, scene: THREE.Scene) => {
        if (isAreaMode) {
            const raycaster = new THREE.Raycaster();
            const mouse = new THREE.Vector2();

            // Convert mouse position to normalized device coordinates
            const rect = event.target.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            // Raycast to find intersection point
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(scene.children, true);

            if (intersects.length > 0) {
                const point = intersects[0].point;
                handleAddPoint(new THREE.Vector3(point.x, point.y, point.z));
            }
        }
    };

    const handleAreaPointerMove = (event: any, camera: THREE.Camera, scene: THREE.Scene) => {
        if (isAreaMode && currentStartPoint) {
            const raycaster = new THREE.Raycaster();
            const mouse = new THREE.Vector2();
    
            // Convert mouse position to normalized device coordinates
            const rect = event.target.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(scene.children, true);
    
            if (intersects.length > 0) {
                const point = intersects[0].point;
                setCurrentEndPoint(new THREE.Vector3(point.x, point.y, point.z));
    
                // Threshold check
                const threshold = 20; // Threshold value
                const distanceToFirstPoint = point.distanceTo(points[0]);
    
                if (distanceToFirstPoint < threshold) {
                    setIsHoveringThreshold(true); // Update hover state
                } else {
                    setIsHoveringThreshold(false); // Reset hover state
                }
    
                invalidate(); // Force React-three-fiber to update the scene
            }
        }
    };

    useEffect(() => {
        invalidate();
    }, [isHoveringThreshold]);
    
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Backspace" && currentStartPoint) {
                // Prevent browser back navigation
                event.preventDefault();
    
                setPoints((prevPoints) => {
                    const newPoints = [...prevPoints];
                    newPoints.pop(); // Remove the last point
                    return newPoints;
                });
    
                setLines((prevLines) => {
                    const newLines = [...prevLines];
                    newLines.pop(); // Remove the last line
                    return newLines;
                });
    
                setCurrentStartPoint((prevStartPoint) => {
                    const newPoints = points.slice(0, -1);
                    return newPoints.length > 0 ? newPoints[newPoints.length - 1] : null; // Set the previous point as the starting point
                });
    
                setIsPolygonClosed(false); // Ensure the polygon is no longer closed
            }
        };
    
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [currentStartPoint, points, lines]);    
    
    useEffect(() => {
        if (isPolygonClosed) {
            const calculatedArea = calculate2DPolygonArea(
                points.map((p) => new THREE.Vector2(p.x, p.y)) // Convert points to 2D
            );
            setArea(calculatedArea); // Save the area in state
            console.log(`Polygon Area: ${calculatedArea.toFixed(2)} units²`);
        }
    }, [isPolygonClosed, points]);

    

    // Memoized dynamic geometry for rendering dynamic line
    const dynamicAreaLineGeometry = useMemo(() => {
        const geometry = new THREE.BufferGeometry();
        if (currentStartPoint && currentEndPoint) {
            geometry.setFromPoints([currentStartPoint, currentEndPoint]);
        } else {
            geometry.setFromPoints([]); // Empty geometry
        }
        return geometry;
    }, [currentStartPoint, currentEndPoint]);

    const dynamicLineMeasurement = useMemo(() => {
        if (currentStartPoint && currentEndPoint) {
            return currentStartPoint.distanceTo(currentEndPoint).toFixed(2);
        }
        return null;
    }, [currentStartPoint, currentEndPoint]);

    return {
        toggleAreaMode,
        setIsAreaMode,
        isAreaMode,
        points,
        lines,
        currentStartPoint,
        currentEndPoint,
        isPolygonClosed,
        area, // Expose the area state
        handleAddPoint,
        handleUpdateEndPoint,
        handleAreaClick,
        handleAreaPointerMove,
        dynamicAreaLineGeometry, // Expose the dynamic line geometry
        isHoveringThreshold,
        dynamicLineMeasurement
    };
};

export default AreaTool;

export const calculate2DPolygonArea = (points: THREE.Vector2[]): number => {
    if (points.length < 3) return 0; // A polygon must have at least 3 points

    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const current = points[i];
        const next = points[(i + 1) % points.length]; // Wrap around to the first point
        area += current.x * next.y - current.y * next.x;
    }

    return Math.abs(area) * 0.5; // Return the absolute value of the area
};
