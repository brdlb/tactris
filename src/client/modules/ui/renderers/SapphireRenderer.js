import { ClassicRenderer } from './ClassicRenderer';

export class SapphireRenderer extends ClassicRenderer {
    drawGrid(ctx, width, height, rows, cols) {
        const cellW = width / cols;
        const cellH = height / rows;
        ctx.fillStyle = '#101c50';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#132057';
        for (let y = 0; y < rows; y++) {
            for (let x = y % 2; x < cols; x += 2) {
                ctx.fillRect(x * cellW, y * cellH, cellW, cellH);
            }
        }

        const frame = Math.min(4, Math.min(cellW, cellH) * 0.1);
        ctx.strokeStyle = '#384fcd';
        ctx.lineWidth = frame;
        ctx.strokeRect(frame / 2, frame / 2, width - frame, height - frame);
    }

    drawBlock(ctx, anim, cellW, cellH) {
        if (anim.progress <= 0) return;

        const size = Math.min(cellW, cellH);
        const inset = Math.min(4.5, size * 0.12);
        const scale = anim.target === 0 ? anim.progress : 1;
        const width = (cellW - 2 * inset) * scale;
        const height = (cellH - 2 * inset) * scale;
        const x = (anim.x + 0.5) * cellW - width / 2;
        const y = (anim.y + 0.5) * cellH - height / 2;
        const radius = Math.min(width, height) * 0.1;

        ctx.save();
        ctx.globalAlpha = anim.progress * (anim.state === 'drawing' ? 0.8 : 1);
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, radius);
        ctx.fillStyle = anim.color || '#258fff';
        ctx.fill();

        const face = ctx.createRadialGradient(
            x + width * 0.45, y + height * 0.4, Math.min(width, height) * 0.12,
            x + width / 2, y + height / 2, Math.max(width, height) * 0.66
        );
        face.addColorStop(0, '#ffffff66');
        face.addColorStop(0.45, '#ffffff30');
        face.addColorStop(0.8, '#10102344');
        face.addColorStop(1, '#080c22a0');
        ctx.fillStyle = face;
        ctx.fill();
        ctx.strokeStyle = '#080e2d';
        ctx.lineWidth = Math.min(1.3, radius * 0.6);
        ctx.stroke();
        ctx.restore();
    }

    drawTutorialHints(ctx, hints, cellW, cellH) {
        if (!hints?.length) return;

        const inset = Math.min(4.5, Math.min(cellW, cellH) * 0.12);
        ctx.strokeStyle = '#f5f7ff';
        ctx.lineWidth = Math.min(2, inset);
        for (const { x, y } of hints) {
            ctx.strokeRect(x * cellW + inset, y * cellH + inset, cellW - 2 * inset, cellH - 2 * inset);
        }
    }
}
