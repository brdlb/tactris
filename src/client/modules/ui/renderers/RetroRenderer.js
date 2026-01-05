import { ClassicRenderer } from './ClassicRenderer';

export class RetroRenderer extends ClassicRenderer {
    drawGrid(ctx, width, height, rows, cols) {
        const cellW = width / cols;
        const cellH = height / rows;

        // GameBoy Green Background
        ctx.fillStyle = '#9bbc0f';
        ctx.fillRect(0, 0, width, height);

        // Subtle grid lines
        ctx.strokeStyle = '#8bac0f';
        ctx.lineWidth = 1;
        for (let y = 0; y <= rows; y++) {
            ctx.beginPath();
            ctx.moveTo(0, Math.floor(y * cellH) + 0.5);
            ctx.lineTo(width, Math.floor(y * cellH) + 0.5);
            ctx.stroke();
        }
        for (let x = 0; x <= cols; x++) {
            ctx.beginPath();
            ctx.moveTo(Math.floor(x * cellW) + 0.5, 0);
            ctx.lineTo(Math.floor(x * cellW) + 0.5, height);
            ctx.stroke();
        }
    }

    drawBlock(ctx, anim, cellW, cellH) {
        if (anim.progress <= 0 && anim.target === 0) return;

        const px = Math.floor(anim.x * cellW);
        const py = Math.floor(anim.y * cellH);
        const pw = Math.floor(cellW) - 2;
        const ph = Math.floor(cellH) - 2;

        ctx.save();

        const centerX = px + Math.floor(cellW) / 2;
        const centerY = py + Math.floor(cellH) / 2;

        ctx.translate(centerX, centerY);
        const currentScale = anim.target === 0 ? anim.progress * 0.9 : 0.9; // Retro blocks are slightly smaller
        ctx.scale(currentScale, currentScale);
        ctx.translate(-centerX, -centerY);

        // Dark green color for retro style
        ctx.fillStyle = '#0f380f';
        ctx.globalAlpha = anim.state === 'drawing' ? anim.progress : 1;

        // Inner shadow effect
        ctx.fillRect(px + 1, py + 1, pw, ph);

        ctx.fillStyle = '#306230';
        ctx.fillRect(px + 2, py + 2, pw - 4, ph - 4);

        ctx.fillStyle = '#0f380f';
        ctx.fillRect(px + 4, py + 4, pw - 8, ph - 8);

        ctx.restore();
    }
}
