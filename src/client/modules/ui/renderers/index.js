import { ClassicRenderer } from './ClassicRenderer';
import { NeonRenderer } from './NeonRenderer';

const rendererClasses = {
    classic: ClassicRenderer,
    neon: NeonRenderer,
};

export const getRenderer = (skinName = 'classic') => {
    const RendererClass = rendererClasses[skinName] || rendererClasses.classic;
    return new RendererClass();
};

export const availableSkins = Object.keys(rendererClasses);
