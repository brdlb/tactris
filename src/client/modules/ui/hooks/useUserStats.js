import { useState, useCallback } from 'react';

const DEFAULT_STATS = {
    total_games: 0,
    total_wins: 0,
    win_rate: 0,
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

const useUserStats = () => {
    const [statsData, setStatsData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchPublicStats = useCallback(async (userId) => {
        if (!userId) {
            setStatsData(DEFAULT_STATS);
            return DEFAULT_STATS;
        }

        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/user/stats/public?user_id=${userId}`);
            if (response.ok) {
                const data = await response.json();
                setStatsData(data);
                return data;
            } else {
                setStatsData(DEFAULT_STATS);
                return DEFAULT_STATS;
            }
        } catch (err) {
            console.error('Error fetching stats:', err);
            setError(err);
            setStatsData(DEFAULT_STATS);
            return DEFAULT_STATS;
        } finally {
            setLoading(false);
        }
    }, []);

    return { statsData, loading, error, fetchPublicStats, DEFAULT_STATS };
};

export default useUserStats;
