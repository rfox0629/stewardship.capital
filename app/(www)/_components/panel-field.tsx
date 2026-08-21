"use client";

import { useEffect, useRef } from "react";

export type PanelMode = "converge" | "path" | "latent";

type Node = {
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  x: number;
  y: number;
  /** Activation. Orange. */
  a: number;
  /** How settled into the lattice this node is, 0 to 1. */
  s: number;
  phase: number;
};

const SPACING = 54;

/**
 * Product panel visuals.
 *
 * One engine, three behaviours, so every product world is drawn in the same
 * language as the hero without any of them being decorative:
 *
 *   converge  scattered points resolving into an ordered grid, which is what
 *             Spark actually does to a pile of ideas
 *   path      an autonomous agent finding its way across a latent field
 *   latent    structure with capacity, one node lit, nothing built yet
 */
export function PanelField({ mode }: { mode: PanelMode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
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
    let active = false;
    let progress = reduceMotion ? 1 : 0;
    let agentX = 0;
    let agentY = 0;
    let agentT = 0;

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      cols = Math.ceil(width / SPACING) + 2;
      rows = Math.ceil(height / SPACING) + 2;
      nodes = [];

      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          const seed = ((r * 73856093) ^ (c * 19349663)) >>> 0;
          const rand1 = (seed % 1000) / 1000;
          const rand2 = ((seed >>> 10) % 1000) / 1000;
          const jx = (rand1 - 0.5) * SPACING * 0.4;
          const jy = (rand2 - 0.5) * SPACING * 0.4;
          const tx = (c - 1) * SPACING + jx;
          const ty = (r - 1) * SPACING + jy;
          /* Scatter start for converge, which the other modes ignore. */
          const fx = tx + (rand1 - 0.5) * width * 0.85;
          const fy = ty + (rand2 - 0.5) * height * 0.85;
          nodes.push({
            fx,
            fy,
            tx,
            ty,
            x: tx,
            y: ty,
            a: 0,
            s: mode === "converge" ? 0 : 1,
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
        }
      }

      agentX = -40;
      agentY = height * 0.5;
    };

    const easeOut = (value: number) => 1 - Math.pow(1 - value, 3);

    const step = (time: number) => {
      if (mode === "converge") {
        if (active && progress < 1) progress = Math.min(1, progress + 0.014);
        const p = easeOut(progress);
        for (let i = 0; i < nodes.length; i += 1) {
          const n = nodes[i];
          /* Staggered by position, so the grid resolves left to right. */
          const local = Math.min(1, Math.max(0, p * 1.7 - (n.tx / width) * 0.7));
          const e = easeOut(local);
          n.x = n.fx + (n.tx - n.fx) * e;
          n.y = n.fy + (n.ty - n.fy) * e;
          n.s = e;
          /* The accent marks the moment a thing lands, not the resting
             state. Everything settles back to graphite except a sparse few. */
          const arrival = Math.max(0, 1 - Math.abs(e - 0.9) / 0.2);
          const residual = i % 7 === 0 ? 0.55 : 0;
          n.a = Math.max(arrival, e > 0.97 ? residual : 0);
        }
      } else if (mode === "path") {
        agentT += active ? 0.0022 : 0;
        const loop = agentT % 1;
        agentX = loop * (width + 120) - 60;
        /* Course corrections rather than a straight line. */
        agentY =
          height * 0.5 +
          Math.sin(loop * Math.PI * 3.1) * height * 0.24 +
          Math.sin(loop * Math.PI * 7.3) * height * 0.06;
        for (let i = 0; i < nodes.length; i += 1) {
          const n = nodes[i];
          const dx = agentX - n.tx;
          const dy = agentY - n.ty;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const target = dist < 130 ? Math.pow(1 - dist / 130, 1.8) : 0;
          n.a += (target - n.a) * (target > n.a ? 0.3 : 0.035);
          n.x = n.tx;
          n.y = n.ty;
        }
      } else {
        const pulse = 0.5 + 0.5 * Math.sin(time * 0.0014);
        for (let i = 0; i < nodes.length; i += 1) {
          const n = nodes[i];
          n.x = n.tx;
          n.y = n.ty;
          n.a = 0;
          n.s = 1;
        }
        /* One node lit in the middle of the field, with its immediate
           neighbours barely warming. Capacity, not a product. */
        const centre = Math.floor(rows / 2) * cols + Math.floor(cols / 2);
        const lit = 0.35 + pulse * 0.65;
        if (nodes[centre]) nodes[centre].a = lit;
        for (const offset of [-1, 1, -cols, cols]) {
          const neighbour = nodes[centre + offset];
          if (neighbour) neighbour.a = lit * 0.26;
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.075)";
      ctx.beginPath();
      for (let i = 0; i < edges.length; i += 1) {
        const a = nodes[edges[i][0]];
        const b = nodes[edges[i][1]];
        if (Math.min(a.s, b.s) < 0.96) continue;
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
      }
      ctx.stroke();

      for (let i = 0; i < edges.length; i += 1) {
        const a = nodes[edges[i][0]];
        const b = nodes[edges[i][1]];
        const e = Math.min(a.a, b.a);
        if (e < 0.12) continue;
        ctx.strokeStyle = `rgba(255, 77, 0, ${Math.min(0.7, e * 0.7).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      for (let i = 0; i < nodes.length; i += 1) {
        const n = nodes[i];
        const size = 0.9 + n.a * 1.8;
        ctx.beginPath();
        ctx.arc(n.x, n.y, size, 0, Math.PI * 2);
        ctx.fillStyle =
          n.a > 0.08
            ? `rgba(255, 77, 0, ${(0.12 + n.a * 0.78).toFixed(3)})`
            : `rgba(255, 255, 255, ${(0.06 + n.s * 0.12).toFixed(3)})`;
        ctx.fill();
      }

      if (mode === "path") {
        ctx.beginPath();
        ctx.arc(agentX, agentY, 3.4, 0, Math.PI * 2);
        ctx.fillStyle = "#ff4d00";
        ctx.fill();
      }
    };

    const loop = (time: number) => {
      step(time);
      draw();
      frame = window.requestAnimationFrame(loop);
    };

    build();

    const observer = new IntersectionObserver(
      (entries) => {
        active = entries[0]?.isIntersecting ?? false;
        if (active && !frame && !reduceMotion) {
          frame = window.requestAnimationFrame(loop);
        }
        if (!active && frame) {
          window.cancelAnimationFrame(frame);
          frame = 0;
        }
      },
      { threshold: 0.05 },
    );
    observer.observe(canvas);

    if (reduceMotion) {
      active = true;
      step(0);
      draw();
    }

    const onResize = () => {
      build();
      if (reduceMotion) {
        step(0);
        draw();
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, [mode]);

  return <canvas ref={canvasRef} className="panel-field" aria-hidden="true" />;
}
