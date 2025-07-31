"use client";
import React, { useRef, useEffect } from "react";

interface CursorDitherTrailProps {
    trailColor?: string; // monochrome colour of dots
    dotSize?: number; // side length of a pixel square (1‑4px)
    fadeDuration?: number; // milliseconds for a dot to vanish
    className?: string;
}

export function CursorTrail({
    trailColor = "#ffffff", // lime by default
    dotSize = 4,
    fadeDuration = 600,
    className = "w-full h-full",
}: CursorDitherTrailProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let width = canvas.clientWidth;
        let height = canvas.clientHeight;
        canvas.width = width;
        canvas.height = height;

        // Adjust on resize
        const onResize = () => {
            width = canvas.clientWidth;
            height = canvas.clientHeight;
            canvas.width = width;
            canvas.height = height;
        };
        window.addEventListener("resize", onResize);

        // Convert hex → rgba once
        const int = parseInt(trailColor.replace("#", ""), 16);
        const r = (int >> 16) & 255;
        const g = (int >> 8) & 255;
        const b = int & 255;

        let lastX: number | null = null;
        let lastY: number | null = null;
        let isDrawing = false;

        // Track line segments with their creation time
        const lineSegments: Array<{
            x1: number;
            y1: number;
            x2: number;
            y2: number;
            createdAt: number;
        }> = [];

        const paintLine = (x: number, y: number) => {
            if (lastX !== null && lastY !== null && isDrawing) {
                // Add new line segment
                lineSegments.push({
                    x1: lastX,
                    y1: lastY,
                    x2: x,
                    y2: y,
                    createdAt: performance.now(),
                });
            }

            lastX = x;
            lastY = y;
        };

        // Render all line segments with fade effect
        const renderLines = () => {
            ctx.clearRect(0, 0, width, height);

            const now = performance.now();

            lineSegments.forEach(segment => {
                const age = now - segment.createdAt;
                const alpha = Math.max(0, 1 - age / fadeDuration);

                if (alpha > 0) {
                    ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
                    ctx.lineWidth = dotSize;
                    ctx.lineCap = "round";
                    ctx.lineJoin = "round";

                    ctx.beginPath();
                    ctx.moveTo(segment.x1, segment.y1);
                    ctx.lineTo(segment.x2, segment.y2);
                    ctx.stroke();
                }
            });

            // Remove old segments
            const cutoffTime = now - fadeDuration;
            while (
                lineSegments.length > 0 &&
                lineSegments[0].createdAt < cutoffTime
            ) {
                lineSegments.shift();
            }

            requestAnimationFrame(renderLines);
        };

        requestAnimationFrame(renderLines);

        const onMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            isDrawing = true;
            paintLine(x, y);
        };

        const onMouseDown = () => {
            isDrawing = true;
        };

        const onMouseUp = () => {
            isDrawing = false;
        };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mousedown", onMouseDown);
        window.addEventListener("mouseup", onMouseUp);

        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mousedown", onMouseDown);
            window.removeEventListener("mouseup", onMouseUp);
            window.removeEventListener("resize", onResize);
        };
    }, [trailColor, dotSize, fadeDuration]);

    return <canvas ref={canvasRef} className={className} />;
}

export default CursorTrail;
