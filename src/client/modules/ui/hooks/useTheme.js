import { useState, useEffect } from 'react';

export const useTheme = () => {
    const [theme, setTheme] = useState(() => {
        // Check for saved theme preference or default to 'light'
        const savedTheme = localStorage.getItem('tactris-theme');
        return savedTheme || 'light';
    });

    useEffect(() => {
        // Save theme preference to localStorage
        localStorage.setItem('tactris-theme', theme);
        
        // Apply theme to document body
        document.body.setAttribute('data-theme', theme);
    }, [theme]);

    const toggleTheme = (newTheme) => {
        setTheme(newTheme);
    };

    return { theme, toggleTheme };
};