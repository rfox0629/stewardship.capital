"use client";

import { useEffect, useRef } from "react";

type Node = {
  /** Lattice position. */
  bx: number;
  by: number;
  /** Rendered position, pulled toward attention. */
  x: number;
  y: number;
  /** 0 latent, 1 fully activated. */
  a: number;
  phase: number;
};

const SPACING = 46;
const RADIUS = 215;
const IDLE_MS = 2000;

/**
 * The Multiplier.
 *
 * A latent lattice of entrusted points. Attention wakes them: they pull
 * inward, connect to their neighbours, and resolve into structure, then relax
 * back. The accent only ever appears on what has been activated, so the colour
 * literally marks the thing that got built.
 *
 * Canvas 2D on a fixed lattice with precomputed neighbours. No dependencies,
 * no WebGL, and a single static frame under reduced motion.
 */
export function MultiplierField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let nodes: Node[] = [];
    let edges: Array<[number, number]> = [];
    let frame = 0;

    /* Attention. Follows the pointer, and wanders on its own when idle. */
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

      cols = Math.ceil(width / SPACING) + 3;
      rows = Math.ceil(height / SPACING) + 3;
      nodes = [];

      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          /* Deterministic jitter, so the lattice reads as organic structure
             rather than as graph paper, and never reshuffles on resize. */
          const seed = ((r * 73856093) ^ (c * 19349663)) >>> 0;
          const jx = ((seed % 1000) / 1000 - 0.5) * SPACING * 0.44;
          const jy = (((seed >>> 10) % 1000) / 1000 - 0.5) * SPACING * 0.44;
          const bx = (c - 1.5) * SPACING + jx;
          const by = (r - 1.5) * SPACING + jy;
          nodes.push({
            bx,
            by,
            x: bx,
            y: by,
            a: 0,
            phase: (((seed >>> 20) % 1000) / 1000) * Math.PI * 2,
          });
        }
      }

      edges = [];
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          const i = r * cols + c;
          if (c + 1 < cols) edges.push([i, i + 1]);
          if (r + 1 < rows) edges.push([i, i + cols]);
          if (c + 1 < cols && r + 1 < rows) edges.push([i, i + cols + 1]);
        }
      }

      if (!seeded) {
        attractorX = width * 0.62;
        attractorY = height * 0.5;
        seeded = true;
      }
    };

    const render = (time: number) => {
      const idle = time - lastPointer > IDLE_MS;

      /* When nobody is pointing, attention drifts on its own so the field is
         alive on touch devices and on first load. */
      const targetX = idle
        ? width * 0.5 + Math.cos(time * 0.00019) * width * 0.3
        : pointerX;
      const targetY = idle
        ? height * 0.5 + Math.sin(time * 0.00027) * height * 0.26
        : pointerY;

      const chase = idle ? 0.02 : 0.14;
      attractorX += (targetX - attractorX) * chase;
      attractorY += (targetY - attractorY) * chase;

      for (let i = 0; i < nodes.length; i += 1) {
        const n = nodes[i];
        const dx = attractorX - n.bx;
        const dy = attractorY - n.by;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const target = dist < RADIUS ? Math.pow(1 - dist / RADIUS, 1.7) : 0;
        n.a += (target - n.a) * 0.11;
        const pull = n.a * 11;
        n.x = n.bx + (dx / dist) * pull;
        n.y = n.by + (dy / dist) * pull;
      }

      ctx.clearRect(0, 0, width, height);

      /* Pass one: the latent structure. Always there, barely visible. */
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.055)";
      ctx.beginPath();
      for (let i = 0; i < edges.length; i += 1) {
        const a = nodes[edges[i][0]];
        const b = nodes[edges[i][1]];
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
      }
      ctx.stroke();

      /* Pass two: what attention has built. */
      for (let i = 0; i < edges.length; i += 1) {
        const a = nodes[edges[i][0]];
        const b = nodes[edges[i][1]];
        const e = Math.min(a.a, b.a);
        if (e < 0.05) continue;
        ctx.strokeStyle = `rgba(255, 77, 0, ${(e * 0.95).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      /* The points themselves. The dot is the unit of the whole system. */
      for (let i = 0; i < nodes.length; i += 1) {
        const n = nodes[i];
        const shimmer = 0.1 + 0.05 * Math.sin(time * 0.0006 + n.phase);
        const size = 0.9 + n.a * 2.1;
        ctx.beginPath();
        ctx.arc(n.x, n.y, size, 0, Math.PI * 2);
        if (n.a > 0.04) {
          ctx.fillStyle = `rgba(255, ${Math.round(77 + (255 - 77) * (1 - n.a))}, ${Math.round(
            (1 - n.a) * 255,
          )}, ${(0.12 + n.a * 0.88).toFixed(3)})`;
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${shimmer.toFixed(3)})`;
        }
        ctx.fill();
      }

      frame = window.requestAnimationFrame(render);
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

    const renderStatic = () => {
      attractorX = width * 0.62;
      attractorY = height * 0.46;
      for (let pass = 0; pass < 40; pass += 1) {
        for (let i = 0; i < nodes.length; i += 1) {
          const n = nodes[i];
          const dx = attractorX - n.bx;
          const dy = attractorY - n.by;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const target = dist < RADIUS ? Math.pow(1 - dist / RADIUS, 1.7) : 0;
          n.a += (target - n.a) * 0.2;
          n.x = n.bx + (dx / dist) * n.a * 11;
          n.y = n.by + (dy / dist) * n.a * 11;
        }
      }
      render(0);
      window.cancelAnimationFrame(frame);
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

  return <canvas ref={canvasRef} className="field" aria-hidden="true" />;
}
