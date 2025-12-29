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
            ctx.moveTo(0, y * cellH);
            ctx.lineTo(width, y * cellH);
            ctx.stroke();
        }
        for (let x = 0; x <= cols; x++) {
            ctx.beginPath();
            ctx.moveTo(x * cellW, 0);
            ctx.lineTo(x * cellW, height);
            ctx.stroke();
        }
    }

    drawBlock(ctx, anim, cellW, cellH) {
        if (anim.progress <= 0 && anim.target === 0) return;

        const px = anim.x * cellW;
        const py = anim.y * cellH;
        const pw = cellW - 2;
        const ph = cellH - 2;

        ctx.save();

        const centerX = px + cellW / 2;
        const centerY = py + cellH / 2;

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
