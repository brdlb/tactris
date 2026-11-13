import { describe, expect, it } from 'vitest';
import { GlassRenderer } from './GlassRenderer';

describe('GlassRenderer line clearing', () => {
    it('removes a row and column before moving survivors toward the center', () => {
        const renderer = new GlassRenderer();
        const block = { color: 'rgb(255, 255, 255)' };
        const beforeGrid = Array.from({ length: 6 }, (_, y) =>
            Array.from({ length: 6 }, (_, x) =>
                y === 1 || x === 4 || (x === 5 && y === 0) ? block : null
            )
        );
        const clearedBlocks = beforeGrid.flatMap((row, y) =>
            row.flatMap((_, x) => y === 1 || x === 4 ? [{ x, y }] : [])
        );
        const grid = Array.from({ length: 6 }, () => Array(6).fill(null));
        grid[1][4] = block;
        const details = {
            beforeGrid,
            clearedBlocks,
            movingBlocks: [{ fromX: 5, fromY: 0, toX: 4, toY: 1 }]
        };

        renderer.updateAnimationState(grid, details);
        renderer.animate(details, 0);
        renderer.animate(details, 90);
        expect(renderer.animations.get('4,1').progress).toBe(0.5);
        expect(renderer.animations.get('5,0')).toMatchObject({ x: 5, y: 0 });

        renderer.animate(details, 180);
        expect(renderer.animations.size).toBe(1);
        renderer.updateAnimationState(grid, details);
        expect(renderer.animate(details, 300).isStable).toBe(false);
        expect(renderer.animations.get('5,0')).toMatchObject({ x: 4.5, y: 0.5 });
        expect(renderer.animate(details, 420).isStable).toBe(true);
        expect(renderer.animations.get('4,1')).toMatchObject({ x: 4, y: 1, progress: 1 });
    });
});
