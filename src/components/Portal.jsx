import React from 'react';
import { Canvas } from '@react-three/fiber';
import PortalScene from '../scenes/PortalScene';

export default function Portal() {
  return (
    <Canvas 
      gl={{ antialias: true, alpha: true }}
    >
      <PortalScene />
    </Canvas>
  );
}
