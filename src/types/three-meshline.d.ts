declare module 'three.meshline' {
    import { BufferGeometry, Material, Vector3 } from 'three';
  
    export class MeshLine extends BufferGeometry {
      setPoints(points: number[] | Vector3[]): void;
    }
  
    export class MeshLineMaterial extends Material {
      constructor(parameters?: {
        color?: number | string;
        lineWidth?: number;
        sizeAttenuation?: boolean;
        near?: number;
        far?: number;
        resolution?: Vector2;
        dashArray?: number;
        dashOffset?: number;
        dashRatio?: number;
        alphaTest?: number;
        visibility?: boolean;
      });
    }
  }
  