import React, { useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { getRenderer } from '../renderers';

const RoomPreview = ({ grid, skin = 'classic' }) => {
    const canvasRef = useRef(null);
    const renderer = useMemo(() => getRenderer(skin), [skin]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        const displayWidth = Math.floor(rect.width);
        const displayHeight = Math.floor(rect.height);

        if (canvas.width !== Math.floor(displayWidth * dpr) || canvas.height !== Math.floor(displayHeight * dpr)) {
            canvas.width = Math.floor(displayWidth * dpr);
            canvas.height = Math.floor(displayHeight * dpr);
        }

        const computedStyle = getComputedStyle(canvas);
        renderer.updateStyles(computedStyle);

        renderer.renderStatic(ctx, grid, {
            width: displayWidth,
            height: displayHeight,
            dpr
        });
    }, [grid, renderer]);

    useLayoutEffect(() => {
        draw();
    }, [draw]);

    return (
        <canvas
            ref={canvasRef}
            className="lobby-room-canvas"
            style={{
                width: '100%',
                height: '100%',
                display: 'block'
            }}
        />
    );
};

export default RoomPreview;
