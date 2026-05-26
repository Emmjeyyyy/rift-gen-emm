import React, { useEffect } from 'react';
import './App.css';
import Portal from './components/Portal';
import useLenis from './hooks/useLenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

function App() {
  // Initialize smooth scrolling
  useLenis();

  useEffect(() => {
    // Force scroll to top on refresh
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    // Intro animation for Page 1
    const tl = gsap.timeline();

    tl.to('.hero-section .title', {
      opacity: 1,
      y: 0,
      duration: 1.5,
      ease: 'power4.out',
      delay: 0.5
    })
      .to('.hero-section .subtitle', {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: 'power3.out'
      }, '-=1');

    // We no longer need GSAP for Page 1 since it's rendered in WebGL
    // and naturally clipped by the shader mask.
  }, []);

  const transitions = [
    "EXPANDING PORTAL",
    "IMPLODING PORTAL",
    "FILM BURN",
    "DIAGONAL SLASH",
    "REVERSE SLASH",
    "CONCENTRIC RIPPLES",
    "HORIZONTAL SPLIT",
    "SWIPE RIGHT",
    "SWIPE LEFT",
    "VERTICAL WIPE"
  ];

  const scrollToTransition = (index) => {
    // Each transition spans 1/10th of the total scroll height
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    // Scroll to the exact beginning of the chosen transition
    const targetScroll = (index / 10.0) * scrollHeight;
    window.scrollTo({ top: targetScroll, behavior: 'smooth' });
  };

  return (
    <div className="app-container" style={{ height: '1100vh', position: 'relative' }}>

      {/* Page 2 (Light Page) - Sits in the background, revealed by the shader */}
      <div className="page-2" style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundColor: '#000000',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
      }}>
      </div>

      {/* WebGL Canvas - Acts as a burning mask over Page 2 */}
      <div className="canvas-container" style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
        <Portal />
      </div>

      {/* HTML Overlay for the Final Page */}
      <div className="final-page-overlay" style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: '100vh',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <h1 style={{ fontSize: '4rem', margin: '0 0 2rem 0', fontWeight: '900' }}>THE END</h1>
        <p style={{ marginBottom: '2rem', fontSize: '1.2rem', opacity: 0.8 }}>Jump back to:</p>

        <ul style={{
          listStyle: 'none',
          padding: 0,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem 3rem',
          textAlign: 'center'
        }}>
          {transitions.map((name, index) => (
            <li
              key={index}
              style={{
                fontSize: '1.2rem',
                cursor: 'pointer',
                padding: '0.5rem 1rem',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                background: 'rgba(255,255,255,0.05)'
              }}
              onClick={() => scrollToTransition(index)}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
