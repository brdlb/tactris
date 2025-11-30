import React from 'react';
import './GameBoard.css'; // Reusing existing styles for now
import { secondsToDhms } from '../../../utils/timeUtils';

// Utility function to safely format a number with toFixed, handling null, undefined, and non-numeric values
const safeFormatNumber = (value, defaultValue = 0, decimalPlaces = 0) => {
  if (value === undefined || value === null || isNaN(value) || value === '') {
    return defaultValue;
  }
  return Number(value).toFixed(decimalPlaces);
};


const StatsModal = ({ isOpen, onClose, statsData }) => {
     if (!isOpen) return null;

     // Default stats if no data is provided
     const stats = statsData || {
         user_id: null,
         total_games: 0,
         total_score: 0,
         average_score: 0,
         best_score: 0,
         total_lines_cleared: 0,
         average_lines_cleared: 0,
         best_lines_cleared: 0,
         total_figures_placed: 0,
         total_play_time_seconds: 0,
         average_lines_per_game: 0,
         rating: 1000
     };
     
     console.log(`⏰ [StatsModal] Rendering with total play time: ${stats.total_play_time_seconds} seconds`);
    
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Statistics</h2>
                    <button className="close-btn" onClick={onClose} aria-label="Close">
                        ×
                    </button>
                </div>
                <div className="modal-body">
                    <div className="stats-grid">
                        {stats.user_id && (
                            <div className="stat-item">
                                <span className="stat-label">User ID</span>
                                <span className="stat-value">{stats.user_id}</span>
                            </div>
                        )}
                        <div className="stat-item">
                            <span className="stat-label">Total Games</span>
                            <span className="stat-value">{safeFormatNumber(stats.total_games, 0)}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Total Score</span>
                            <span className="stat-value">{safeFormatNumber(stats.total_score, 0)}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Average Score</span>
                            <span className="stat-value">{safeFormatNumber(stats.average_score, 0)}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Best Score</span>
                            <span className="stat-value">{safeFormatNumber(stats.best_score, 0)}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Lines Cleared</span>
                            <span className="stat-value">{safeFormatNumber(stats.total_lines_cleared, 0)}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Best Lines</span>
                            <span className="stat-value">{safeFormatNumber(stats.best_lines_cleared, 0)}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Figures Placed</span>
                            <span className="stat-value">{safeFormatNumber(stats.total_figures_placed, 0)}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Play Time</span>
                            <span className="stat-value">{secondsToDhms(stats.total_play_time_seconds)}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Avg Lines/Game</span>
                            <span className="stat-value">{safeFormatNumber(stats.average_lines_per_game, 0, 2)}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Rating</span>
                            <span className="stat-value">{safeFormatNumber(stats.rating, 1000)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatsModal;