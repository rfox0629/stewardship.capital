"use client";

import { useEffect, useRef } from "react";

type Star = {
  x: number;
  y: number;
  /** Apparent size, 0 faint to 1 bright. */
  mag: number;
  /** 0 at rest, 1 fully lit. */
  a: number;
  phase: number;
  /** Indices of the nearest stars, for constellation lines. */
  near: number[];
};

const RADIUS = 270;
const IDLE_MS = 2000;
/* Cool light, the same as the laptop's and the AI in the name. */
const LIGHT = "156, 202, 255";

/** A small deterministic generator, so the sky never reshuffles on resize. */
const rng = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

/**
 * The night over the tent.
 *
 * A quiet field of stars. Attention (the pointer, or a slow drift when nobody
 * is pointing) wakes the stars near it: they brighten into the cool light and
 * join their neighbours in constellation lines, then settle back. Many small
 * points, drawn together into something that holds its shape.
 *
 * The same structure as Stewardship.Capital's field, drawn as a sky. Canvas
 * 2D, no dependencies, and a single still frame under reduced motion.
 */
export function StarField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    let frame = 0;
    let pointerX = -9999;
    let pointerY = -9999;
    let lastPointer = -IDLE_MS * 2;
    let attractorX = 0;
    let attractorY = 0;
    let seeded = false;

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      /* A jittered grid with gaps reads as a sky rather than a pattern. Fewer,
         larger cells on a phone. */
      const cell = width < 640 ? 44 : 52;
      const random = rng(20260925);
      stars = [];
      for (let y = -cell; y < height + cell; y += cell) {
        for (let x = -cell; x < width + cell; x += cell) {
          if (random() < 0.34) continue;
          const mag = Math.pow(random(), 2.6);
          stars.push({
            x: x + random() * cell,
            y: y + random() * cell,
            mag,
            a: 0,
            phase: random() * Math.PI * 2,
            near: [],
          });
        }
      }
      /* Each star knows its four nearest neighbours within reach. */
      const reach = cell * 2.3;
      for (let i = 0; i < stars.length; i += 1) {
        const s = stars[i];
        const found: Array<[number, number]> = [];
        for (let j = 0; j < stars.length; j += 1) {
          if (i === j) continue;
          const dx = stars[j].x - s.x;
          const dy = stars[j].y - s.y;
          const d = dx * dx + dy * dy;
          if (d < reach * reach) found.push([d, j]);
        }
        found.sort((p, q) => p[0] - q[0]);
        s.near = found.slice(0, 4).map(([, j]) => j).filter((j) => j > i);
      }

      if (!seeded) {
        attractorX = width * 0.68;
        attractorY = height * 0.24;
        seeded = true;
      }
    };

    const wake = (x: number, y: number, rate: number) => {
      for (let i = 0; i < stars.length; i += 1) {
        const s = stars[i];
        const dx = x - s.x;
        const dy = y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const target = dist < RADIUS ? Math.pow(1 - dist / RADIUS, 1.6) : 0;
        s.a += (target - s.a) * rate;
      }
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      /* Constellations: only between stars that attention has lit. */
      ctx.lineWidth = 1;
      for (let i = 0; i < stars.length; i += 1) {
        const s = stars[i];
        for (const j of s.near) {
          const t = stars[j];
          const e = Math.min(s.a, t.a);
          if (e < 0.08) continue;
          ctx.strokeStyle = `rgba(${LIGHT}, ${((e - 0.08) * 0.8).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(t.x, t.y);
          ctx.stroke();
        }
      }

      /* The stars. At rest they are faint and twinkle; lit, they take the
         cool light and a soft halo. */
      for (let i = 0; i < stars.length; i += 1) {
        const s = stars[i];
        const twinkle = 0.55 + 0.45 * Math.sin(time * 0.0011 + s.phase);
        const rest = (0.1 + s.mag * 0.5) * twinkle;
        const size = 0.55 + s.mag * 1.1 + s.a * 1.6;
        if (s.a > 0.05) {
          const glow = s.a * (0.35 + s.mag * 0.4);
          const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, size * 6);
          g.addColorStop(0, `rgba(${LIGHT}, ${glow.toFixed(3)})`);
          g.addColorStop(1, `rgba(${LIGHT}, 0)`);
          ctx.fillStyle = g;
          ctx.fillRect(s.x - size * 6, s.y - size * 6, size * 12, size * 12);
          ctx.fillStyle = `rgba(${Math.round(255 - 99 * s.a)}, ${Math.round(255 - 53 * s.a)}, 255, ${Math.min(1, rest + s.a).toFixed(3)})`;
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${rest.toFixed(3)})`;
        }
        ctx.beginPath();
        ctx.arc(s.x, s.y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const render = (time: number) => {
      const idle = time - lastPointer > IDLE_MS;
      /* Idle, attention drifts across the sky on its own, slowly, so the
         page is alive on a phone and on first load. */
      const targetX = idle ? width * 0.55 + Math.cos(time * 0.00016) * width * 0.36 : pointerX;
      const targetY = idle ? height * 0.24 + Math.sin(time * 0.00023) * height * 0.13 : pointerY;
      const chase = idle ? 0.02 : 0.14;
      attractorX += (targetX - attractorX) * chase;
      attractorY += (targetY - attractorY) * chase;
      wake(attractorX, attractorY, 0.09);
      draw(time);
      frame = window.requestAnimationFrame(render);
    };

    const renderStatic = () => {
      for (let pass = 0; pass < 40; pass += 1) wake(width * 0.7, height * 0.22, 0.2);
      draw(0);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerX = event.clientX - rect.left;
      pointerY = event.clientY - rect.top;
      lastPointer = performance.now();
    };

    const onResize = () => {
      build();
      if (reduceMotion) renderStatic();
    };

    build();
    if (reduceMotion) {
      renderStatic();
    } else {
      frame = window.requestAnimationFrame(render);
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    }
    window.addEventListener("resize", onResize);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="tm-sky" aria-hidden="true" />;
}
