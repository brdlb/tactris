import { ClassicRenderer } from './ClassicRenderer';

export class NeonRenderer extends ClassicRenderer {
    drawGrid(ctx, width, height, rows, cols) {
        const cellW = width / cols;
        const cellH = height / rows;

        // Dark background for neon effect
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, width, height);

        // Draw grid lines with a subtle glow
        ctx.strokeStyle = '#222';
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

        let color = this.styles.occupiedColor;
        if (anim.state === 'drawing') {
            color = this.lerpColor('rgb(255, 255, 255)', anim.color, anim.progress);
        }

        const centerX = px + Math.floor(cellW) / 2;
        const centerY = py + Math.floor(cellH) / 2;

        ctx.translate(centerX, centerY);
        const currentScale = anim.target === 0 ? anim.progress : 1;
        ctx.scale(currentScale, currentScale);
        ctx.translate(-centerX, -centerY);

        // Neon Glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.globalAlpha = anim.state === 'drawing' ? 1 : anim.progress;

        // Rounded rectangle for neon look
        this.roundRect(ctx, px + 1, py + 1, pw, ph, 4);
        ctx.fill();

        // Brighter center
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.globalAlpha = (anim.state === 'drawing' ? 1 : anim.progress) * 0.5;
        this.roundRect(ctx, px + 3, py + 3, pw - 4, ph - 4, 2);
        ctx.stroke();

        ctx.restore();
    }

    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
}
