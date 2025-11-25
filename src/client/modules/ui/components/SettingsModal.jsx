import React from 'react';

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
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;