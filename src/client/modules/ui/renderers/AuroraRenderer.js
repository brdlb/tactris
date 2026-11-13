import { ClassicRenderer } from './ClassicRenderer';

export class AuroraRenderer extends ClassicRenderer {
    updateStyles() {
        this.styles.occupiedColor = '#d5f8ff';
    }

    drawGrid(ctx, width, height) {
        const background = ctx.createLinearGradient(0, 0, width, height);
        background.addColorStop(0, '#35616d');
        background.addColorStop(0.42, '#172e58');
        background.addColorStop(1, '#101a40');
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);

        const edgeLight = ctx.createLinearGradient(0, 0, width, 0);
        edgeLight.addColorStop(0, '#8affd438');
        edgeLight.addColorStop(0.24, '#8affd400');
        edgeLight.addColorStop(0.76, '#8affd400');
        edgeLight.addColorStop(1, '#8affd438');
        ctx.fillStyle = edgeLight;
        ctx.fillRect(0, 0, width, height);
    }

    drawBlock(ctx, anim, cellW, cellH) {
        if (anim.progress <= 0) return;

        const size = Math.min(cellW, cellH);
        const lineWidth = Math.min(1.5, size * 0.12);
        const scale = anim.target === 0 ? anim.progress : 1;
        const width = (cellW - lineWidth) * scale;
        const height = (cellH - lineWidth) * scale;
        const x = (anim.x + 0.5) * cellW - width / 2;
        const y = (anim.y + 0.5) * cellH - height / 2;
        const color = anim.color || '#32aeff';

        ctx.save();
        ctx.globalAlpha = anim.progress * (anim.state === 'drawing' ? 0.7 : 1);
        ctx.shadowColor = color;
        ctx.shadowBlur = Math.min(12, size * 0.55) * ctx.getTransform().a;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, width, height);

        ctx.shadowBlur = 0;
        const sheen = ctx.createLinearGradient(x, y, x, y + height);
        sheen.addColorStop(0, '#ffffff50');
        sheen.addColorStop(0.55, '#ffffff08');
        sheen.addColorStop(1, '#080f3444');
        ctx.fillStyle = sheen;
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = '#f7ffffe8';
        ctx.lineWidth = lineWidth;
        ctx.strokeRect(x, y, width, height);
        ctx.restore();
    }
}
