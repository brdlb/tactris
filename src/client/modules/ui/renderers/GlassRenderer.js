import { ClassicRenderer } from './ClassicRenderer';

export class GlassRenderer extends ClassicRenderer {
    drawGrid(ctx, width, height, rows, cols) {
        const cellW = width / cols;
        const cellH = height / rows;

        // Gradient Background
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, '#1a1a2e');
        grad.addColorStop(1, '#16213e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Glassy grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
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
        const pw = Math.floor(cellW) - 4;
        const ph = Math.floor(cellH) - 4;

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

        // Glass effect
        const opacity = anim.state === 'drawing' ? 0.8 : anim.progress * 0.6;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;

        // Main block body
        this.roundRect(ctx, px + 2, py + 2, pw, ph, 8);
        ctx.fill();

        // Border
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = opacity;
        ctx.stroke();

        // Highligh/Reflection
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px + 6, py + ph - 2);
        ctx.lineTo(px + 6, py + 6);
        ctx.lineTo(px + pw - 2, py + 6);
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
