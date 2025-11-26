import React from 'react';
import './GameBoard.css'; // Reusing existing styles for now

const SettingsModal = ({ isOpen, onClose, theme, onToggleTheme }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Настройки</h2>
                    <button className="close-btn" onClick={onClose} aria-label="Close">
                        ×
                    </button>
                </div>
                <div className="modal-body">
                    <div className="setting-item">
                        <span>Тема</span>
                        <label className="theme-switch">
                            <input
                                type="checkbox"
                                checked={theme === 'dark'}
                                onChange={onToggleTheme}
                            />
                            <span className="slider">
                                <span className="slider-icon">{theme === 'dark' ? '🌙' : '☀️'}</span>
                            </span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
