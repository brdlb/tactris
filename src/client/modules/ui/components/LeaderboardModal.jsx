import React, { useState, useEffect } from 'react';
import StatsModal from './StatsModal';
import useUserStats from '../hooks/useUserStats';
import './GameBoard.css';

const LeaderboardModal = ({ isOpen, onClose }) => {
    const [period, setPeriod] = useState('global');
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [showPlayerStats, setShowPlayerStats] = useState(false);
    const [selectedDisplayName, setSelectedDisplayName] = useState('');

    const { statsData: selectedPlayerStats, fetchPublicStats } = useUserStats();

    useEffect(() => {
        const userId = localStorage.getItem('userId');
        setCurrentUserId(userId);
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchLeaderboard(period);
        }
    }, [isOpen, period]);

    const fetchLeaderboard = async (selectedPeriod) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/leaderboard?period=${selectedPeriod}`);
            if (response.ok) {
                const data = await response.json();
                setLeaderboardData(data.leaderboard || []);
            } else {
                setLeaderboardData([]);
            }
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            setLeaderboardData([]);
        }
        setLoading(false);
    };

    const handlePlayerClick = async (userId, displayName) => {
        setSelectedDisplayName(displayName);
        await fetchPublicStats(userId);
        setShowPlayerStats(true);
    };

    if (!isOpen) return null;

    const periods = [
        { key: 'daily', label: 'Day' },
        { key: 'weekly', label: 'Week' },
        { key: 'global', label: 'All Time' }
    ];

    return (
        <>
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content leaderboard-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2>🏆 Leaderboard</h2>
                        <button className="close-btn" onClick={onClose} aria-label="Close">
                            ×
                        </button>
                    </div>
                    <div className="leaderboard-tabs">
                        {periods.map(({ key, label }) => (
                            <button
                                key={key}
                                className={`leaderboard-tab ${period === key ? 'active' : ''}`}
                                onClick={() => setPeriod(key)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <div className="modal-body">
                        {loading ? (
                            <div className="leaderboard-loading">Loading...</div>
                        ) : leaderboardData.length === 0 ? (
                            <div className="leaderboard-empty">No records yet</div>
                        ) : (
                            <table className="leaderboard-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Player</th>
                                        <th>Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leaderboardData.map((entry) => (
                                        <tr
                                            key={entry.user_id}
                                            className={entry.user_id === currentUserId ? 'current-user' : ''}
                                        >
                                            <td className="rank-cell">
                                                {entry.rank === 1 && '🥇'}
                                                {entry.rank === 2 && '🥈'}
                                                {entry.rank === 3 && '🥉'}
                                                {entry.rank > 3 && entry.rank}
                                            </td>
                                            <td
                                                className="name-cell clickable"
                                                onClick={() => handlePlayerClick(entry.user_id, entry.display_name)}
                                            >
                                                {entry.display_name}
                                            </td>
                                            <td className="score-cell">{entry.best_score.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            <StatsModal
                isOpen={showPlayerStats}
                onClose={() => setShowPlayerStats(false)}
                statsData={selectedPlayerStats ? { ...selectedPlayerStats, display_name: selectedDisplayName } : null}
            />
        </>
    );
};

export default LeaderboardModal;
