import React, { useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei'; // Import Html for overlay text

const AngleTool = () => {
    const [isAngleMode, setIsAngleMode] = useState(false);
    const [points, setPoints] = useState<THREE.Vector3[]>([]); // Stores the three points
    const [lines, setLines] = useState<[THREE.Vector3, THREE.Vector3][]>([]); // Stores the two lines
    const [currentDynamicPoint, setCurrentDynamicPoint] = useState<THREE.Vector3 | null>(null);
    const [angle, setAngle] = useState<number | null>(null); // The calculated angle

    const toggleAngleMode = () => {
        setIsAngleMode((prevMode) => {
            if (prevMode) {
                // Reset state when turning off
                setPoints([]);
                setLines([]);
                setCurrentDynamicPoint(null);
                setAngle(null);
            }
            return !prevMode;
        });
    };

    const handleAddPoint = (point: THREE.Vector3) => {
        if (points.length === 3) return; // Limit to three points

        setPoints((prevPoints) => {
            const newPoints = [...prevPoints, point];

            // Add lines after the second point
            if (newPoints.length === 2) {
                setLines([[newPoints[0], newPoints[1]]]);
            } else if (newPoints.length === 3) {
                setLines((prevLines) => [...prevLines, [newPoints[1], newPoints[2]]]);
                calculateAngle(newPoints[0], newPoints[1], newPoints[2]);
            }

            return newPoints;
        });
    };

    const handleDynamicPointUpdate = (point: THREE.Vector3) => {
        if (points.length === 1) {
            // Dynamically update the first line
            setCurrentDynamicPoint(point);
        } else if (points.length === 2) {
            // Dynamically update the second line
            setCurrentDynamicPoint(point);
            calculateAngle(points[0], points[1], point);
        }
    };
    

    const calculateAngle = (pointA: THREE.Vector3, pointB: THREE.Vector3, pointC: THREE.Vector3) => {
        const vectorAB = new THREE.Vector3().subVectors(pointA, pointB).normalize();
        const vectorBC = new THREE.Vector3().subVectors(pointC, pointB).normalize();

        const dotProduct = vectorAB.dot(vectorBC);
        const angleRadians = Math.acos(THREE.MathUtils.clamp(dotProduct, -1, 1));
        const angleDegrees = THREE.MathUtils.radToDeg(angleRadians);

        setAngle(angleDegrees);
    };

    return {
        toggleAngleMode,
        isAngleMode,
        setIsAngleMode,
        points,
        lines,
        currentDynamicPoint,
        angle,
        handleAddPoint,
        handleDynamicPointUpdate,
    };
};

export default AngleTool;

export const AngleToolRenderer: React.FC<{ 
    tool: ReturnType<typeof AngleTool>, 
    scene: THREE.Scene, 
    camera: THREE.Camera,
}> = ({ tool }) => {
    const { points, lines, currentDynamicPoint, angle, isAngleMode } = tool;

    const dynamicLineGeometry = useMemo(() => {
        const geometry = new THREE.BufferGeometry();
        if (points.length === 1 && currentDynamicPoint) {
            // Dynamic line for the first line
            geometry.setFromPoints([points[0], currentDynamicPoint]);
        } else if (points.length === 2 && currentDynamicPoint) {
            // Dynamic line for the second line
            geometry.setFromPoints([points[1], currentDynamicPoint]);
        } else {
            geometry.setFromPoints([]); // Empty geometry
        }
        return geometry;
    }, [points, currentDynamicPoint]);
    

    return (
        <>
            {isAngleMode && (
                <>
                    {/* Render static lines */}
                    {lines.map(([start, end], index) => (
                        <line key={index}>
                            <bufferGeometry attach="geometry">
                                <bufferAttribute
                                    attach="attributes-position"
                                    count={2}
                                    array={new Float32Array([
                                        start.x, start.y, start.z,
                                        end.x, end.y, end.z,
                                    ])}
                                    itemSize={3}
                                />
                            </bufferGeometry>
                            <lineBasicMaterial color="blue" />
                        </line>
                    ))}

                    {/* Render dynamic line */}
                    {currentDynamicPoint && (
                        <line>
                            <primitive attach="geometry" object={dynamicLineGeometry} />
                            <lineBasicMaterial color="blue" />
                        </line>
                    )}

                    {/* Render points */}
                    {points.map((point, index) => (
                        <mesh key={index} position={[point.x, point.y, point.z]}>
                            <sphereGeometry args={[3, 64, 64]} />
                            <meshBasicMaterial color="blue" />
                        </mesh>
                    ))}

                    {/* Render dynamic point */}
                    {currentDynamicPoint && (
                        <mesh position={[currentDynamicPoint.x, currentDynamicPoint.y, currentDynamicPoint.z]}>
                            <sphereGeometry args={[2, 32, 32]} />
                            <meshBasicMaterial color="green" />
                        </mesh>
                    )}

                    {/* Render angle as text */}
                    {angle !== null && points.length >= 2 && (
                        <Html position={[points[1].x, points[1].y, points[1].z]}>
                            <div
                                style={{
                                    background: 'rgba(0, 0, 0, 0.7)',
                                    color: 'white',
                                    padding: '5px 10px',
                                    borderRadius: '4px',
                                }}
                            >
                                {angle.toFixed(2)}°
                            </div>
                        </Html>
                    )}
                </>
            )}
        </>
    );
};
