import { ClassicRenderer } from './ClassicRenderer';

const BLINK_INTERVAL = 85;
const BLINK_DURATION = BLINK_INTERVAL * 3;
const cellKey = (x, y) => `${x},${y}`;

export class LcdRenderer extends ClassicRenderer {
    setSegments(grid) {
        this.segmentsChanged = true;
        this.animations.clear();
        grid.forEach((row, y) => row.forEach((cell, x) => {
            if (cell) {
                this.animations.set(cellKey(x, y), { ...cell, x, y, progress: 1 });
            }
        }));
    }

    updateAnimationState(grid, clearingDetails) {
        this.latestGrid = grid;
        if (clearingDetails?.beforeGrid && clearingDetails !== this.lastClear) {
            this.lastClear = clearingDetails;
            this.setSegments(clearingDetails.beforeGrid);
            this.blink = { startedAt: null, blocks: clearingDetails.clearedBlocks };
            return;
        }

        if (!clearingDetails) this.blink = null;
        if (!this.blink) this.setSegments(grid);
    }

    animate(_clearingDetails, now = performance.now()) {
        const segmentsChanged = this.segmentsChanged;
        this.segmentsChanged = false;
        if (!this.blink) return { needsUpdate: segmentsChanged, isStable: true };

        this.blink.startedAt ??= now;
        const elapsed = now - this.blink.startedAt;
        if (elapsed >= BLINK_DURATION) {
            this.setSegments(this.latestGrid);
            this.blink = null;
            return { needsUpdate: true, isStable: true };
        }

        const visible = Math.floor(elapsed / BLINK_INTERVAL) % 2 === 1;
        if (!segmentsChanged && visible === this.blink.visible) {
            return { needsUpdate: false, isStable: false };
        }
        this.blink.visible = visible;
        for (const { x, y } of this.blink.blocks) {
            const segment = this.animations.get(cellKey(x, y));
            if (segment) segment.progress = Number(visible);
        }
        return { needsUpdate: true, isStable: false };
    }

    updateStyles() {
        this.styles.occupiedColor = '#29342d';
    }

    drawGrid(ctx, width, height, rows, cols) {
        const background = ctx.createLinearGradient(0, 0, width, height);
        background.addColorStop(0, '#a2ad93');
        background.addColorStop(0.55, '#aeb69a');
        background.addColorStop(1, '#969f85');
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);

        const cellW = width / cols;
        const cellH = height / rows;
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                this.drawSegment(ctx, x, y, cellW, cellH, '#465e501f');
            }
        }
    }

    drawBlock(ctx, anim, cellW, cellH) {
        if (!anim.progress) return;
        const ink = anim.state === 'drawing' ? '#53604b' : this.styles.occupiedColor;
        this.drawSegment(ctx, anim.x, anim.y, cellW, cellH, ink);

    }

    drawSegment(ctx, x, y, cellW, cellH, ink) {
        const size = Math.min(cellW, cellH) * 0.84;
        const left = (x + 0.5) * cellW - size / 2;
        const top = (y + 0.5) * cellH - size / 2;
        const stroke = size * 0.09;
        const inset = size * 0.23;

        ctx.strokeStyle = ink;
        ctx.lineWidth = stroke;
        ctx.strokeRect(left + stroke / 2, top + stroke / 2, size - stroke, size - stroke);
        ctx.fillStyle = ink;
        ctx.fillRect(left + inset, top + inset, size - 2 * inset, size - 2 * inset);
    }
}
