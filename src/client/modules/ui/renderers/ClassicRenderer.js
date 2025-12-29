export class ClassicRenderer {
    constructor() {
        this.styles = {
            cellBg: '',
            gridBg: '',
            occupiedColor: ''
        };
        this.animations = new Map(); // Key: "x,y", Value: { progress, target, color, state, x, y, tx, ty }
        this.lastRenderTime = 0;
    }

    updateStyles(computedStyle) {
        this.styles = {
            cellBg: computedStyle.getPropertyValue('--cell-bg').trim() || (document.documentElement.getAttribute('data-theme') === 'dark' ? '#000000' : '#ffffff'),
            gridBg: computedStyle.getPropertyValue('--grid-bg').trim() || '#ccc',
            occupiedColor: computedStyle.getPropertyValue('--occupied-pixel-color').trim() || (document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#000000')
        };
    }

    // Handles the interpolation of animation values
    animate(clearingDetails) {
        let needsUpdate = false;
        const speed = 0.3; // Base speed
        const moveSpeed = 0.2; // Speed for position interpolation

        let anyFading = false;
        let anyShifting = false;

        // Check if we are still in Phase 1 (fading)
        this.animations.forEach((anim) => {
            if (anim.target === 0 && anim.progress > 0) {
                anyFading = true;
            }
        });

        // Trigger Phase 2 if Phase 1 is done
        if (!anyFading && clearingDetails) {
            this.animations.forEach((anim, key) => {
                if (anim.isMoving) {
                    const [finalX, finalY] = key.split(',').map(Number);
                    anim.tx = finalX;
                    anim.ty = finalY;
                    anim.isMoving = false;
                }
            });
        }

        this.animations.forEach((anim, key) => {
            let itemNeedsUpdate = false;

            // Progress interpolation
            const pDiff = anim.target - anim.progress;
            if (Math.abs(pDiff) > 0.001) {
                anim.progress += pDiff * speed;
                itemNeedsUpdate = true;
            } else {
                anim.progress = anim.target;
            }

            // Position interpolation
            const xDiff = anim.tx - anim.x;
            const yDiff = anim.ty - anim.y;
            if (Math.abs(xDiff) > 0.001 || Math.abs(yDiff) > 0.001) {
                anim.x += xDiff * moveSpeed;
                anim.y += yDiff * moveSpeed;
                itemNeedsUpdate = true;
                anyShifting = true;
            } else {
                anim.x = anim.tx;
                anim.y = anim.ty;
            }

            if (itemNeedsUpdate) {
                needsUpdate = true;
            } else if (anim.target === 0 && anim.progress === 0) {
                this.animations.delete(key);
            }
        });

        return {
            needsUpdate: needsUpdate || this.animations.size > 0,
            isStable: !needsUpdate && !anyFading && !anyShifting
        };
    }

    // Handles updating the animation state based on grid changes
    updateAnimationState(grid, clearingDetails) {
        const rows = grid.length;
        const cols = grid[0]?.length || 0;

        const nextAnimations = new Map();
        const currentAnimationKeys = new Set(this.animations.keys());

        // Helper to find which block this is after a shift
        const getMove = (targetX, targetY) => {
            if (!clearingDetails || !clearingDetails.movingBlocks) return null;
            return clearingDetails.movingBlocks.find(m => m.toX === targetX && m.toY === targetY);
        };

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const cell = grid[y][x];
                const key = `${x},${y}`;
                if (cell) {
                    const move = getMove(x, y);
                    const sourceKey = move ? `${move.fromX},${move.fromY}` : key;

                    if (this.animations.has(sourceKey)) {
                        const anim = this.animations.get(sourceKey);
                        anim.target = 1;
                        anim.color = cell.color;
                        anim.state = cell.state;

                        if (move) {
                            // Phase 1: Keep it at the source position for now
                            anim.x = move.fromX;
                            anim.y = move.fromY;
                            anim.tx = move.fromX;
                            anim.ty = move.fromY;
                            anim.isMoving = true; // Mark for Phase 2
                        } else {
                            anim.tx = x;
                            anim.ty = y;
                        }

                        nextAnimations.set(key, anim);
                        currentAnimationKeys.delete(sourceKey);
                    } else {
                        // New block (e.g. just placed or drawing)
                        nextAnimations.set(key, {
                            x, y, tx: x, ty: y,
                            progress: 0,
                            target: 1,
                            color: cell.color,
                            state: cell.state
                        });
                    }
                }
            }
        }

        // Handle remaining blocks (fading out)
        currentAnimationKeys.forEach(oldKey => {
            const anim = this.animations.get(oldKey);
            if (anim) {
                anim.target = 0;
                const clearingKey = oldKey.startsWith('clearing-') ? oldKey : `clearing-${oldKey}-${Date.now()}`;
                nextAnimations.set(clearingKey, anim);
            }
        });

        this.animations = nextAnimations;
    }

    render(ctx, grid, dimensions, tutorialHintPixels) {
        const { width, height, dpr } = dimensions;

        ctx.save();
        ctx.scale(dpr, dpr);

        const rows = grid.length;
        const cols = grid[0]?.length || 0;

        if (cols === 0) {
            ctx.restore();
            return;
        }

        const cellW = width / cols;
        const cellH = height / rows;

        // Draw Background
        this.drawGrid(ctx, width, height, rows, cols);

        // Draw Blocks
        this.animations.forEach((anim) => {
            this.drawBlock(ctx, anim, cellW, cellH);
        });

        // Draw Tutorial Hints
        this.drawTutorialHints(ctx, tutorialHintPixels, cellW, cellH);

        ctx.restore();
    }

    renderStatic(ctx, grid, dimensions) {
        const { width, height, dpr } = dimensions;
        ctx.save();
        ctx.scale(dpr, dpr);

        const rows = grid.length;
        const cols = grid[0]?.length || 0;
        if (cols === 0) {
            ctx.restore();
            return;
        }

        const cellW = width / cols;
        const cellH = height / rows;

        this.drawGrid(ctx, width, height, rows, cols);

        grid.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell) {
                    this.drawBlock(ctx, {
                        x, y,
                        progress: 1,
                        target: 1,
                        color: cell.color,
                        state: cell.state
                    }, cellW, cellH);
                }
            });
        });

        ctx.restore();
    }

    drawGrid(ctx, width, height, rows, cols) {
        const cellW = width / cols;
        const cellH = height / rows;

        // Clear and draw grid background
        ctx.fillStyle = this.styles.gridBg;
        ctx.fillRect(0, 0, width, height);

        // Draw empty cells background
        ctx.fillStyle = this.styles.cellBg;
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                ctx.fillRect(x * cellW + 0.5, y * cellH + 0.5, cellW - 1, cellH - 1);
            }
        }
    }

    drawBlock(ctx, anim, cellW, cellH) {
        if (anim.progress <= 0 && anim.target === 0) return;

        const px = anim.x * cellW;
        const py = anim.y * cellH;
        const pw = cellW - 1;
        const ph = cellH - 1;

        ctx.save();

        if (anim.state === 'drawing') {
            // Fade from white to user color for drawing state
            ctx.fillStyle = this.lerpColor('rgb(255, 255, 255)', anim.color, anim.progress);
            ctx.globalAlpha = 1; // Keep opaque for color transition effect
        } else {
            ctx.fillStyle = this.styles.occupiedColor;
            ctx.globalAlpha = anim.progress; // Alpha for solid blocks
        }

        const centerX = px + cellW / 2;
        const centerY = py + cellH / 2;

        ctx.translate(centerX, centerY);
        const currentScale = anim.target === 0 ? anim.progress : 1;
        ctx.scale(currentScale, currentScale);
        ctx.translate(-centerX, -centerY);

        ctx.fillRect(px + 0.5, py + 0.5, pw, ph);
        ctx.restore();
    }

    drawTutorialHints(ctx, hints, cellW, cellH) {
        if (!hints || hints.length === 0) return;

        ctx.strokeStyle = this.styles.occupiedColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        hints.forEach(p => {
            const px = p.x * cellW;
            const py = p.y * cellH;
            ctx.strokeRect(px + 2, py + 2, cellW - 4, cellH - 4);
        });
        ctx.setLineDash([]);
    }

    lerpColor(color1, color2, t) {
        const parse = (s) => (s.match(/\d+/g) || [255, 255, 255]).map(Number);
        const [r1, g1, b1] = parse(color1);
        const [r2, g2, b2] = parse(color2);
        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);
        return `rgb(${r}, ${g}, ${b})`;
    }
}
