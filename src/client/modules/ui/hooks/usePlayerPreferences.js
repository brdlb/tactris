import { useState, useEffect } from 'react';
import { getUserColor, setUserHue } from '../../../utils/colorUtils';
import SocketManager from '../../network/SocketManager';

const usePlayerPreferences = (roomIdRef) => {
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
    const [personalColor, setPersonalColor] = useState(() => getUserColor());

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
    };

    const handleHueChange = (newHue) => {
        if (newHue !== undefined) {
            setUserHue(newHue);
        }
        const newColor = getUserColor();
        setPersonalColor(newColor);
        if (roomIdRef?.current) {
            SocketManager.updatePlayerColor(roomIdRef.current, newColor);
        }
    };

    return {
        theme,
        toggleTheme,
        personalColor,
        handleHueChange
    };
};

export default usePlayerPreferences;
