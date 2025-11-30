import React, { useState, useEffect } from 'react';
import { getUserHue, setUserHue } from '../../../utils/colorUtils';
import './GameBoard.css'; // Reusing existing styles for now

const SettingsModal = ({ isOpen, onClose, theme, onToggleTheme, onHueChange, onShowStats }) => {
    const [hue, setHue] = useState(getUserHue());

    useEffect(() => {
        if (isOpen) {
            setHue(getUserHue());
        }
    }, [isOpen]);

    const handleHueChange = (event) => {
        const newHue = parseInt(event.target.value, 10);
        setHue(newHue);
        setUserHue(newHue);
        if (onHueChange) {
            onHueChange(newHue);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Settings</h2>
                    <button className="close-btn" onClick={onClose} aria-label="Close">
                        ×
                    </button>
                </div>
                <div className="modal-body">
                    <div className="setting-item">
                        <span>Theme</span>
                        <label className="theme-switch">
                            <input
                                type="checkbox"
                                checked={theme === 'dark'}
                                onChange={onToggleTheme}
                            />
                            <span className="slider">
                                <span className="slider-icon">{theme === 'dark' ? '🌙' : '☀️'}</span>
                            </span>

const SettingsModal = ({ isOpen, onClose, theme, onThemeChange }) => {
    if (!isOpen) return null;

    const handleThemeChange = () => {
        onThemeChange(theme === 'light' ? 'dark' : 'light');
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="settings-overlay" onClick={handleOverlayClick}>
            <div className="settings-modal">
                <div className="settings-header">
                    <h2>Настройки</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                
                <div className="settings-content">
                    <div className="setting-item">
                        <label className="setting-label">
                            <span>Тема</span>
                            <div className="theme-toggle">
                                <span className={theme === 'light' ? 'active' : ''}>🌞</span>
                                <button 
                                    className={`toggle-switch ${theme === 'dark' ? 'dark' : 'light'}`}
                                    onClick={handleThemeChange}
                                >
                                    <span className="toggle-slider"></span>
                                </button>
                                <span className={theme === 'dark' ? 'active' : ''}>🌙</span>
                            </div>
                        </label>
                    </div>
                    <div className="setting-item">
                        <span>Pixel Hue</span>
                        <div className="hue-control">
                            <div className="hue-slider-container">
                                <input
                                    type="range"
                                    min="0"
                                    max="360"
                                    value={hue}
                                    onChange={handleHueChange}
                                    className="hue-slider"
                                    style={{
                                        background: `linear-gradient(to right,
                                            hsl(0, 100%, 60%),
                                            hsl(60, 100%, 60%),
                                            hsl(120, 100%, 60%),
                                            hsl(180, 100%, 60%),
                                            hsl(240, 100%, 60%),
                                            hsl(300, 100%, 60%),
                                            hsl(0, 100%, 60%))`
                                    }}
                                />
                            </div>
                            <div className="hue-value">{hue}°</div>
                        </div>
                    </div>
                    <div className="setting-item centered-stats">
                        <button className="restart-btn stats-btn-centered" onClick={() => {
                            onClose();
                            onShowStats();
                        }}>
                            Statistics
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;

