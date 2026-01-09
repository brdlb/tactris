import React from 'react';
import './GameBoard.css';

const HelpModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>How to Play</h2>
                    <button className="close-btn" onClick={onClose} aria-label="Close">
                        ×
                    </button>
                </div>
                <div className="modal-body">
                    <div className="help-content">
                        <p><strong>Goal:</strong> Score as many points as possible by placing blocks on the grid.</p>
                        
                        <h3>Gameplay</h3>
                        <ul>
                            <li>You are given two figures to choose from, located in the top left corner.</li>
                            <li>You can draw either of the two available figures on the game board.</li>
                            <li>Fill a row or column completely to clear it and earn points.</li>
                            <li>The game ends when there is no space left on the grid for any of the available figures.</li>
                        </ul>

                        <h3>Tips</h3>
                        <ul>
                            <li>Try to clear multiple lines at once for higher scores!</li>
                            <li>Plan ahead and leave space for larger figures.</li>
                        </ul>

                        <div className="help-footer" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                If you have questions or something doesn't work - <a href="https://t.me/birdlab" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--player-color, #4CAF50)', textDecoration: 'none' }}>t.me/birdlab</a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HelpModal;