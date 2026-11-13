import { ClassicRenderer } from './ClassicRenderer';
import { NeonRenderer } from './NeonRenderer';
import { RetroRenderer } from './RetroRenderer';
import { GlassRenderer } from './GlassRenderer';
import { LcdRenderer } from './LcdRenderer';
import { AuroraRenderer } from './AuroraRenderer';
import { SapphireRenderer } from './SapphireRenderer';

const rendererClasses = {
    classic: ClassicRenderer,
    neon: NeonRenderer,
    retro: RetroRenderer,
    glass: GlassRenderer,
    lcd: LcdRenderer,
    aurora: AuroraRenderer,
    sapphire: SapphireRenderer,
};

export const getRenderer = (skinName = 'classic') => {
    const RendererClass = rendererClasses[skinName] || rendererClasses.classic;
    return new RendererClass();
};

export const availableSkins = Object.keys(rendererClasses);
