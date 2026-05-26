# ⚡ Rift

A scroll-driven WebGL transition showcase built with React, Three.js, and GLSL shaders. Each scroll section tears open a fiery rift to reveal the next page, complete with glowing edges, organic noise, and interactive star particles.

---

## 📦 Tech Stack

| Library | Purpose |
|---|---|
| [React](https://react.dev/) | UI framework |
| [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber) | React renderer for Three.js |
| [Three.js](https://threejs.org/) | WebGL & 3D graphics |
| [Lenis](https://lenis.darkroom.engineering/) | Smooth scroll |
| [GSAP + ScrollTrigger](https://gsap.com/) | Intro animations |
| GLSL | Custom fragment & vertex shaders |

---

## 🚀 Setup

```bash
# 1. Clone or enter the project folder
cd rift-gen-emm

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🗂️ Project Structure

```
src/
├── components/
│   └── Portal.jsx          # Mounts the R3F Canvas
├── scenes/
│   └── PortalScene.jsx     # All WebGL logic, particles, uniforms
├── shaders/
│   ├── vertex.glsl         # Pass-through vertex shader
│   └── fragment.glsl       # All 10 transition effects live here
├── hooks/
│   └── useLenis.js         # Smooth scroll setup
├── App.jsx                 # Page layout + interactive end menu
└── index.css               # Global styles + custom scrollbar
```

---

## 🏗️ How It Works

### Overview

The entire experience is a single scrollable page (`height: 1100vh`). A fullscreen WebGL canvas is fixed on top as a transparent mask. As you scroll, a `uProgress` uniform (0.0 → 1.0) is fed into the GLSL fragment shader, which uses it to drive 10 sequential transition effects, each revealing a new colored "page" beneath.

### 1. Canvas Setup — `Portal.jsx`

A simple R3F Canvas with transparency enabled so the HTML background shows through.

```jsx
// src/components/Portal.jsx
import { Canvas } from '@react-three/fiber';
import PortalScene from '../scenes/PortalScene';

export default function Portal() {
  return (
    <Canvas gl={{ antialias: true, alpha: true }}>
      <PortalScene />
    </Canvas>
  );
}
```

### 2. Fullscreen Shader Quad — `PortalScene.jsx`

A `2x2` plane geometry fills the screen. The vertex shader passes clip-space coordinates directly — no camera needed.

```jsx
// Fullscreen quad in PortalScene.jsx
<mesh renderOrder={1}>
  <planeGeometry args={[2, 2]} />
  <shaderMaterial
    vertexShader={vertexShader}
    fragmentShader={fragmentShader}
    uniforms={uniforms.current}
    transparent={true}
    depthWrite={false}
    depthTest={false}
  />
</mesh>
```

### 3. Vertex Shader — `vertex.glsl`

Pass-through: just forwards the UV coordinates to the fragment shader.

```glsl
// src/shaders/vertex.glsl
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
```

### 4. Scroll → Progress — `PortalScene.jsx`

The scene subscribes to the [Lenis](https://lenis.darkroom.engineering/) smooth scroll instance (exposed as `window.__lenis`) to get a perfectly interpolated scroll position, avoiding the jitter of raw `scroll` events.

A delta-time-based exponential lerp is applied each frame to smooth out any remaining micro-jitter:

```js
// useFrame in PortalScene.jsx
const lerpFactor = 1 - Math.exp(-12 * delta); // frame-rate independent
progressRef.current += (targetProgressRef.current - progressRef.current) * lerpFactor;
```

### 5. Smooth Scroll — `useLenis.js`

```js
// src/hooks/useLenis.js
const lenis = new Lenis({
  duration: 1.5,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
});

// Expose globally so the WebGL scene can subscribe
window.__lenis = lenis;

// Force back to top on every refresh
lenis.scrollTo(0, { immediate: true });

// Drive Lenis with GSAP's ticker
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

---

## ✨ The 10 Transition Effects

All effects live in `src/shaders/fragment.glsl`. The core concept is a **distance field** (`dists[i]`) compared against a **threshold** (`bounds[i]`) that moves with scroll progress. When `dist < bound`, the pixel is "revealed".

A shared **edge noise** value makes every transition edge look torn and organic:

```glsl
// Layered noise for the torn paper edge
float gentleWave  = fbm(st * 1.5 + vec2(0.0, uTime * 0.05));
float fineCrumble = fbm(st * 12.0);
float microDetail = fbm(st * 30.0 + 1.3);
float tinyGrit    = snoise(st * 80.0);

float edgeNoise = gentleWave * 0.35
                + fineCrumble * 0.08
                + microDetail * 0.04
                + tinyGrit * 0.015;
```

Progress is split into 10 equal phases:

```glsl
float p[10];
for(int i = 0; i < 10; i++) {
  p[i] = clamp(uProgress * 10.0 - float(i), 0.0, 1.0);
}
```

---

### Effect 1 — Expanding Portal

A radial distance field. The reveal grows outward from the center like a portal opening.

```glsl
dists[0] = length(st) + edgeNoise * 0.5;
bounds[0] = p[0] * 4.0 - 1.0;
```

---

### Effect 2 — Imploding Portal

Reversed radial. The outer edges are revealed first, collapsing inward.

```glsl
dists[1] = -length(st) + edgeNoise * 0.5;
bounds[1] = p[1] * 4.0 - 3.0;
```

---

### Effect 3 — Organic Film Burn

Uses Fractal Brownian Motion (FBM) as the distance field, creating an uneven, fire-like burn that spreads randomly across the surface.

```glsl
dists[2] = fbm(st * 3.0) * 0.5 + 0.5 + edgeNoise * 0.5;
bounds[2] = p[2] * 2.5 - 0.5;
```

---

### Effect 4 — Diagonal Slash (↗)

A diagonal linear wipe from bottom-left to top-right.

```glsl
dists[3] = (st.x + st.y) * 0.5 + edgeNoise * 0.4;
bounds[3] = p[3] * 4.0 - 2.0;
```

---

### Effect 5 — Reverse Slash (↖)

A diagonal linear wipe in the opposite direction (bottom-right to top-left).

```glsl
dists[4] = (-st.x + st.y) * 0.5 + edgeNoise * 0.4;
bounds[4] = p[4] * 4.0 - 2.0;
```

---

### Effect 6 — Concentric Ripples

An animated sine wave ripple based on radial distance. The rings animate outward in real time using `uTime`.

```glsl
dists[5] = sin(length(st) * 15.0 - uTime * 2.0) * 0.5 + 0.5 + edgeNoise * 0.3;
bounds[5] = p[5] * 2.5 - 0.5;
```

---

### Effect 7 — Horizontal Split

Uses `abs(st.x)` to split the screen from the center simultaneously to the left and right edges.

```glsl
dists[6] = abs(st.x) + edgeNoise * 0.4;
bounds[6] = p[6] * 4.0 - 1.0;
```

---

### Effect 8 — Swipe Right

A simple horizontal wipe that sweeps from left to right.

```glsl
dists[7] = st.x + edgeNoise * 0.4;
bounds[7] = p[7] * 5.0 - 2.5;
```

---

### Effect 9 — Swipe Left

A horizontal wipe that sweeps in the opposite direction, right to left.

```glsl
dists[8] = -st.x + edgeNoise * 0.4;
bounds[8] = p[8] * 5.0 - 2.5;
```

---

### Effect 10 — Vertical Wipe

A classic vertical wipe from top to bottom.

```glsl
dists[9] = st.y + edgeNoise * 0.4;
bounds[9] = p[9] * 3.0 - 1.5;
```

---

## 💡 Glowing Edge Effect

After the masks are calculated, a glowing tear edge is applied to whichever transition is currently active:

```glsl
// Soft outer glow (pulses with time)
float glowMask = smoothstep(0.08, 0.0, activeEdgeDist) - smoothstep(0.0, -0.02, activeEdgeDist);
float pulse = 0.8 + 0.2 * sin(uTime * 3.0);
finalColor.rgb += vec3(0.9, 0.95, 1.0) * glowMask * pulse * 1.5;

// Hard white-hot core
float coreMask = smoothstep(0.01, 0.0, activeEdgeDist) - smoothstep(0.0, -0.01, activeEdgeDist);
finalColor.rgb += vec3(1.0) * coreMask * 2.5;

// Flying dust particles at the tear edge
float dustNoise = snoise(st * 20.0 - vec2(0.0, uTime * 1.0));
float dust = smoothstep(0.85, 1.0, dustNoise);
float dustMask = smoothstep(0.15, 0.0, activeEdgeDist) - smoothstep(0.0, -0.05, activeEdgeDist);
finalColor.rgb += vec3(1.0) * dust * dustMask * 2.0;
```

---

## 🌟 Star Particle Field

500 particles are scattered in 3D space. Each is rendered as a glowing white radial gradient texture with additive blending. They react to cursor movement via a parallax rotation effect:

```js
// In PortalScene.jsx useFrame
const mouseOffsetX = mouseRef.current.x - 0.5;
const mouseOffsetY = mouseRef.current.y - 0.5;

particlesRef.current.rotation.x = mouseOffsetY * 0.5;
particlesRef.current.rotation.y = (time * 0.02) + mouseOffsetX * 0.5;
particlesRef.current.position.x = mouseOffsetX * -1.0;
particlesRef.current.position.y = mouseOffsetY * -1.0;
```

---

## ➕ Adding a New Effect

1. **Increment the phase count** in `fragment.glsl` (arrays, loops).
2. **Add a new distance field:**
   ```glsl
   dists[10] = /* your formula using st and edgeNoise */;
   bounds[10] = p[10] * N.0 - offset;
   ```
3. **Add a new page color:**
   ```glsl
   colors[11] = vec3(r, g, b);
   ```
4. **Add a new texture uniform** in `PortalScene.jsx` and the uniforms ref.
5. **Add the name** to both the `names[]` array (PortalScene) and the `transitions[]` array (App.jsx).
6. **Increase the scroll height** (`height` in `App.jsx`) by `100vh`.
7. **Update the phase multiplier** (`uProgress * N.0`) in all loops in the fragment shader.

---

## 🎨 Customizing Colors

Each page background color is defined at the top of the composite block in `fragment.glsl`:

```glsl
colors[0] = vec3(0.0, 0.0, 0.0);    // Page 1: Black
colors[1] = vec3(0.02, 0.05, 0.15); // Page 2: Dark Blue
// ... etc.
```

Values are in linear RGB, range 0.0–1.0. Keep them dark — bright colors look washed out next to the glowing tear.
