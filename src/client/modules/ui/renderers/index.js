import { ClassicRenderer } from './ClassicRenderer';
import { NeonRenderer } from './NeonRenderer';
import { RetroRenderer } from './RetroRenderer';
import { GlassRenderer } from './GlassRenderer';
import { LcdRenderer } from './LcdRenderer';

const rendererClasses = {
    classic: ClassicRenderer,
    neon: NeonRenderer,
    retro: RetroRenderer,
    glass: GlassRenderer,
    lcd: LcdRenderer,
};

export const getRenderer = (skinName = 'classic') => {
    const RendererClass = rendererClasses[skinName] || rendererClasses.classic;
    return new RendererClass();
};

export const availableSkins = Object.keys(rendererClasses);
