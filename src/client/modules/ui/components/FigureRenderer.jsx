import React, { useLayoutEffect, useRef, useEffect } from 'react';

const FigureRenderer = ({
  figure,
  color,
  cellSize = 10,
  padding = 1,
  margin = '5px'
}) => {
  const canvasRef = useRef(null);
  const animatedCells = useRef([]); // Array of {x, y, tx, ty}
  const animationFrameRef = useRef(null);

  // Synchronize target positions when the figure changes
  useEffect(() => {
    if (!figure || !figure.cells) return;

    const targetCells = figure.cells;

    if (animatedCells.current.length === 0) {
      // Initialize cells at their target positions
      animatedCells.current = targetCells.map(([tx, ty]) => ({
        x: tx,
        y: ty,
        tx,
        ty
      }));
    } else {
      // Map new targets to existing animated cells by index
      targetCells.forEach(([tx, ty], i) => {
        if (animatedCells.current[i]) {
          animatedCells.current[i].tx = tx;
          animatedCells.current[i].ty = ty;
        } else {
          // If more cells are added, start them from the position of the first existing cell
          const start = animatedCells.current[0] || { x: tx, y: ty };
          animatedCells.current.push({ x: start.x, y: start.y, tx, ty });
        }
      });

      // If there are fewer cells, remove the extra ones
      if (animatedCells.current.length > targetCells.length) {
        animatedCells.current = animatedCells.current.slice(0, targetCells.length);
      }
    }
  }, [figure]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = 4;
    const h = 4;
    const displayWidth = w * (cellSize + padding);
    const displayHeight = h * (cellSize + padding);

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    const animate = () => {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      ctx.fillStyle = color;

      animatedCells.current.forEach(cell => {
        // Smooth interpolation (lerp)
        const ease = 0.25;
        const dx = cell.tx - cell.x;
        const dy = cell.ty - cell.y;

        if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
          cell.x += dx * ease;
          cell.y += dy * ease;
        } else {
          cell.x = cell.tx;
          cell.y = cell.ty;
        }

        const px = cell.x * (cellSize + padding);
        const py = cell.y * (cellSize + padding);

        ctx.fillRect(px, py, cellSize, cellSize);
      });

      ctx.restore();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [color, cellSize, padding]);

  if (!figure || !figure.cells) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        margin: margin,
        display: 'block'
      }}
    />
  );
};

export default FigureRenderer;
