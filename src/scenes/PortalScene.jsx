import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import vertexShader from '../shaders/vertex.glsl?raw';
import fragmentShader from '../shaders/fragment.glsl?raw';

export default function PortalScene() {
  const meshRef = useRef();
  const materialRef = useRef();
  const particlesRef = useRef();
  const { size } = useThree();
  
  // Interpolated values for smooth motion
  const progressRef = useRef(0);
  const targetProgressRef = useRef(0);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const targetMouseRef = useRef({ x: 0.5, y: 0.5 });

  // Generate random particles
  const particles = useMemo(() => {
    const count = 500;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 5; // Spread in space
    }
    return positions;
  }, []);

  // Generate glowing star texture for particles
  const starTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }, []);

  // Generate textures for 11 pages
  const textures = useMemo(() => {
    const texs = [];
    const names = [
      "EXPANDING PORTAL",
      "IMPLODING PORTAL",
      "FILM BURN",
      "DIAGONAL SLASH",
      "REVERSE SLASH",
      "CONCENTRIC RIPPLES",
      "HORIZONTAL SPLIT",
      "SWIPE RIGHT",
      "SWIPE LEFT",
      "VERTICAL WIPE",
      "THE END"
    ];
    
    for (let i = 0; i < 11; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 2048;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      
      // Only draw text if it's not the final page ("THE END" is now handled in HTML)
      if (i < 10) {
        // Make font slightly smaller to fit longer names
        ctx.font = '900 160px Inter, system-ui, sans-serif'; 
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(names[i], canvas.width / 2, canvas.height / 2);
      }
      
      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      texs.push(tex);
    }
    return texs;
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      targetMouseRef.current.x = e.clientX / window.innerWidth;
      targetMouseRef.current.y = 1.0 - (e.clientY / window.innerHeight);
    };

    // Read from Lenis for a perfectly smooth, interpolated scroll position
    // Lenis exposes its smoothed scroll value via a scroll event with { scroll, limit }
    const handleLenisScroll = ({ scroll, limit }) => {
      targetProgressRef.current = limit > 0 ? scroll / limit : 0;
    };

    // Find the global Lenis instance - it attaches to window.lenis by convention
    // We poll briefly until it's ready, then subscribe
    const subscribe = () => {
      if (window.__lenis) {
        window.__lenis.on('scroll', handleLenisScroll);
        // Set initial value immediately
        const limit = window.__lenis.limit;
        const scroll = window.__lenis.scroll;
        targetProgressRef.current = limit > 0 ? scroll / limit : 0;
        return true;
      }
      return false;
    };

    // Fallback to raw scroll if Lenis isn't found
    const handleRawScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      targetProgressRef.current = scrollHeight > 0 ? window.scrollY / scrollHeight : 0;
    };

    if (!subscribe()) {
      window.addEventListener('scroll', handleRawScroll);
      handleRawScroll();
    }

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      if (window.__lenis) window.__lenis.off('scroll', handleLenisScroll);
      window.removeEventListener('scroll', handleRawScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    
    if (materialRef.current) {
      // Smooth lerp using delta time for frame-rate independent easing.
      // Factor of 12 gives fast response but irons out discrete scroll event jitter.
      const lerpFactor = 1 - Math.exp(-12 * delta);
      progressRef.current += (targetProgressRef.current - progressRef.current) * lerpFactor;
      
      // Lerp mouse with same technique
      mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * lerpFactor;
      mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * lerpFactor;

      // Update uniforms
      materialRef.current.uniforms.uTime.value = time;
      materialRef.current.uniforms.uProgress.value = progressRef.current;
      materialRef.current.uniforms.uMouse.value.set(mouseRef.current.x, mouseRef.current.y);
      materialRef.current.uniforms.uResolution.value.set(size.width, size.height);
    }

    // Animate particles
    if (particlesRef.current) {
      // Base rotation over time
      const baseRotationY = time * 0.02;
      const baseRotationZ = time * 0.01;
      
      // Calculate mouse offset from center (-0.5 to 0.5)
      const mouseOffsetX = mouseRef.current.x - 0.5;
      const mouseOffsetY = mouseRef.current.y - 0.5;
      
      // Apply parallax rotation based on mouse
      particlesRef.current.rotation.x = mouseOffsetY * 0.5;
      particlesRef.current.rotation.y = baseRotationY + (mouseOffsetX * 0.5);
      particlesRef.current.rotation.z = baseRotationZ;
      
      // Apply slight position shift based on mouse
      particlesRef.current.position.x = mouseOffsetX * -1.0;
      particlesRef.current.position.y = mouseOffsetY * -1.0;
      
      // Move particles with progress
      particlesRef.current.position.z = progressRef.current * 2;
    }
  });

  const uniforms = useRef({
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uResolution: { value: new THREE.Vector2() },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uText1: { value: textures[0] },
    uText2: { value: textures[1] },
    uText3: { value: textures[2] },
    uText4: { value: textures[3] },
    uText5: { value: textures[4] },
    uText6: { value: textures[5] },
    uText7: { value: textures[6] },
    uText8: { value: textures[7] },
    uText9: { value: textures[8] },
    uText10: { value: textures[9] },
    uText11: { value: textures[10] },
  });

  return (
    <>
      {/* Fullscreen Shader Quad */}
      <mesh ref={meshRef} renderOrder={1}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms.current}
          depthWrite={false}
          depthTest={false}
          transparent={true}
        />
      </mesh>

      {/* Particle Field */}
      <points ref={particlesRef} renderOrder={0}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particles.length / 3}
            array={particles}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.06}
          color="#ffffff"
          transparent
          opacity={0.8}
          map={starTexture}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </>
  );
}
