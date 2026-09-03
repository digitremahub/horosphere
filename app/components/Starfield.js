"use client";

import { useEffect, useRef } from "react";

export default function Starfield() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let stars = [];
    let raf;
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      const count = Math.round((window.innerWidth * window.innerHeight) / 9000);
      stars = [];
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: (Math.random() * 1.1 + 0.3) * dpr,
          phase: Math.random() * Math.PI * 2,
          speed: 0.4 + Math.random() * 0.6,
        });
      }
    }

    function isDark() {
      const attr = document.documentElement.getAttribute("data-theme");
      if (attr === "dark") return true;
      if (attr === "light") return false;
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    function draw(t) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!isDark()) {
        raf = requestAnimationFrame(draw);
        return;
      }
      for (const s of stars) {
        const tw = reduced ? 0.6 : 0.4 + 0.6 * Math.abs(Math.sin(t * 0.0005 * s.speed + s.phase));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(230,225,255," + tw * 0.85 + ")";
        ctx.fill();
      }
      if (!reduced) raf = requestAnimationFrame(draw);
    }

    window.addEventListener("resize", resize);
    resize();
    raf = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas id="sky" ref={canvasRef} />;
}
