uniform float uTime;
uniform float uProgress;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform sampler2D uText1;
uniform sampler2D uText2;
uniform sampler2D uText3;
uniform sampler2D uText4;
uniform sampler2D uText5;
uniform sampler2D uText6;
uniform sampler2D uText7;
uniform sampler2D uText8;
uniform sampler2D uText9;
uniform sampler2D uText10;
uniform sampler2D uText11;

varying vec2 vUv;


// Simplex 2D noise
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
    dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Fractal Brownian Motion for the rough paper edge
float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    // Loop of octaves
    for (int i = 0; i < 5; i++) {
        value += amplitude * snoise(st * frequency);
        st *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

void main() {
  vec2 uv = vUv;
  
  // Aspect ratio correction
  vec2 st = uv * 2.0 - 1.0;
  st.x *= uResolution.x / uResolution.y;
  
  // Mouse interaction
  vec2 mouse = uMouse * 2.0 - 1.0;
  mouse.x *= uResolution.x / uResolution.y;
  
  // Torn paper edge — uneven with small jagged detail
  float fineCrumble = fbm(st * 12.0);             // medium-fine grain
  float microDetail = fbm(st * 30.0 + 1.3);       // micro crumbles
  float tinyGrit = snoise(st * 80.0);             // pixel-level grit
  
  // Stronger, longer waves for a pronounced wavy tear
  float gentleWave = fbm(st * 1.5 + vec2(0.0, uTime * 0.05));
  
  float edgeNoise = gentleWave * 0.35             // large, pronounced wave
                  + fineCrumble * 0.08            // medium crumble
                  + microDetail * 0.04            // fine crumble
                  + tinyGrit * 0.015;             // grit
  
  // Calculate progress for 10 phases (each is 1/10th of uProgress)
  float p[10];
  for(int i = 0; i < 10; i++) {
    p[i] = clamp(uProgress * 10.0 - float(i), 0.0, 1.0);
  }
  
  // --- Distance Fields for 10 Transitions ---
  float dists[10];
  float bounds[10];
  
  // 1. Expanding Portal
  dists[0] = length(st) + edgeNoise * 0.5;
  bounds[0] = p[0] * 4.0 - 1.0; 
  
  // 2. Imploding Portal
  dists[1] = -length(st) + edgeNoise * 0.5;
  bounds[1] = p[1] * 4.0 - 3.0; 
  
  // 3. Organic Film Burn 
  dists[2] = fbm(st * 3.0) * 0.5 + 0.5 + edgeNoise * 0.5;
  bounds[2] = p[2] * 2.5 - 0.5; 
  
  // 4. Diagonal Slash (Left to Right)
  dists[3] = (st.x + st.y) * 0.5 + edgeNoise * 0.4;
  bounds[3] = p[3] * 4.0 - 2.0; 
  
  // 5. Reverse Slash (Right to Left)
  dists[4] = (-st.x + st.y) * 0.5 + edgeNoise * 0.4;
  bounds[4] = p[4] * 4.0 - 2.0; 
  
  // 6. Concentric Ripples
  dists[5] = sin(length(st) * 15.0 - uTime * 2.0) * 0.5 + 0.5 + edgeNoise * 0.3;
  bounds[5] = p[5] * 2.5 - 0.5; 
  
  // 7. Horizontal Split
  dists[6] = abs(st.x) + edgeNoise * 0.4;
  bounds[6] = p[6] * 4.0 - 1.0; 
  
  // 8. Swipe Right (Left to Right)
  dists[7] = st.x + edgeNoise * 0.4;
  bounds[7] = p[7] * 5.0 - 2.5; 
  
  // 9. Swipe Left (Right to Left)
  dists[8] = -st.x + edgeNoise * 0.4;
  bounds[8] = p[8] * 5.0 - 2.5; 
  
  // 10. Vertical Wipe
  dists[9] = st.y + edgeNoise * 0.4;
  bounds[9] = p[9] * 3.0 - 1.5;
  
  // Calculate Masks and activeEdgeDist
  float masks[10];
  float activeEdgeDist = 100.0;
  
  for(int i = 0; i < 10; i++) {
    float edgeDist = dists[i] - bounds[i];
    masks[i] = smoothstep(0.02, 0.0, edgeDist);
    // If we are currently in this phase's progress bounds, use its edgeDist for glow
    float inPhase = step(float(i), uProgress * 10.0) * step(uProgress * 10.0, float(i + 1));
    activeEdgeDist = mix(activeEdgeDist, edgeDist, inPhase);
  }
  
  // Handle edge cases where uProgress is exactly 0 or exactly 1
  if (uProgress <= 0.0) activeEdgeDist = dists[0] - bounds[0];
  if (uProgress >= 1.0) activeEdgeDist = dists[9] - bounds[9];
  
  // Glow Edge Regions
  float glowMask = smoothstep(0.08, 0.0, activeEdgeDist) - smoothstep(0.0, -0.02, activeEdgeDist);
  
  // Core intense white edge
  float coreMask = smoothstep(0.01, 0.0, activeEdgeDist) - smoothstep(0.0, -0.01, activeEdgeDist);
  
  // Colors (11 Pages)
  vec3 colors[11];
  colors[0] = vec3(0.0, 0.0, 0.0);    // Page 1: Black
  colors[1] = vec3(0.02, 0.05, 0.15); // Page 2: Dark Blue
  colors[2] = vec3(0.15, 0.02, 0.02); // Page 3: Deep Crimson
  colors[3] = vec3(0.02, 0.15, 0.05); // Page 4: Forest Green
  colors[4] = vec3(0.1, 0.02, 0.2);   // Page 5: Violet
  colors[5] = vec3(0.2, 0.15, 0.0);   // Page 6: Gold
  colors[6] = vec3(0.1, 0.1, 0.1);    // Page 7: Charcoal
  colors[7] = vec3(0.02, 0.15, 0.15); // Page 8: Teal
  colors[8] = vec3(0.2, 0.05, 0.0);   // Page 9: Burnt Orange
  colors[9] = vec3(0.0, 0.1, 0.2);    // Page 10: Sapphire
  colors[10] = vec3(0.0, 0.0, 0.0);   // Page 11: Black
  
  // Sample textures
  float textAlphas[11];
  textAlphas[0] = texture2D(uText1, uv).a;
  textAlphas[1] = texture2D(uText2, uv).a;
  textAlphas[2] = texture2D(uText3, uv).a;
  textAlphas[3] = texture2D(uText4, uv).a;
  textAlphas[4] = texture2D(uText5, uv).a;
  textAlphas[5] = texture2D(uText6, uv).a;
  textAlphas[6] = texture2D(uText7, uv).a;
  textAlphas[7] = texture2D(uText8, uv).a;
  textAlphas[8] = texture2D(uText9, uv).a;
  textAlphas[9] = texture2D(uText10, uv).a;
  textAlphas[10] = texture2D(uText11, uv).a;
  
  vec3 textColor = vec3(1.0);
  for(int i = 0; i < 11; i++) {
    colors[i] = mix(colors[i], textColor, textAlphas[i]);
  }
  
  // Composite pages sequentially
  vec3 finalColorRgb = colors[0];
  for(int i = 0; i < 10; i++) {
    finalColorRgb = mix(finalColorRgb, colors[i+1], masks[i]);
  }
  
  // Dynamic Alpha: 
  // Page 1 is active when mask0=0.
  float isPage1 = 1.0 - masks[0];
  
  float alpha = (1.0 - isPage1) + (textAlphas[0] * isPage1) + glowMask + coreMask;
  alpha = clamp(alpha, 0.0, 1.0);
  
  vec4 finalColor = vec4(finalColorRgb, alpha);
  
  // White Glow Colors
  vec3 softGlowColor = vec3(0.9, 0.95, 1.0);
  vec3 coreWhite = vec3(1.0, 1.0, 1.0);
  
  float pulse = 0.8 + 0.2 * sin(uTime * 3.0);
  finalColor.rgb += softGlowColor * glowMask * pulse * 1.5;
  finalColor.a = max(finalColor.a, glowMask * pulse);
  
  finalColor.rgb += coreWhite * coreMask * 2.5;
  finalColor.a = max(finalColor.a, coreMask);
  
  // Dust
  float dustNoise = snoise(st * 20.0 - vec2(0.0, uTime * 1.0));
  float dust = smoothstep(0.85, 1.0, dustNoise);
  float dustMask = smoothstep(0.15, 0.0, activeEdgeDist) - smoothstep(0.0, -0.05, activeEdgeDist);
  dust *= dustMask;
  finalColor.rgb += coreWhite * dust * 2.0;
  finalColor.a = max(finalColor.a, dust);
  
  gl_FragColor = finalColor;
}
