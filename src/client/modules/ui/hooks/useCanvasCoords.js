import { useRef, useCallback, useLayoutEffect } from 'react';

const useCanvasCoords = (boardRef, gridRef) => {
    const boardMetrics = useRef({ rect: null, cellWidth: 0, cellHeight: 0, lastUpdate: 0 });
    const isResizing = useRef(false);

    const updateBoardMetrics = useCallback((forceUpdate = false) => {
        if (!boardRef.current) return;

        const rect = boardRef.current.getBoundingClientRect();
        const columns = gridRef.current[0]?.length || 1;
        const rows = gridRef.current.length || 1;
        const now = Date.now();

        const shouldUpdate = forceUpdate ||
            !boardMetrics.current.rect ||
            isResizing.current ||
            now - boardMetrics.current.lastUpdate > 100;

        if (shouldUpdate) {
            boardMetrics.current = {
                rect,
                cellWidth: columns ? rect.width / columns : 0,
                cellHeight: rows ? rect.height / rows : 0,
                lastUpdate: now
            };
        }
    }, [boardRef, gridRef]);

    const getGridCoordinates = useCallback((event) => {
        if (!boardRef.current) return null;

        updateBoardMetrics(true);

        const { rect, cellWidth, cellHeight } = boardMetrics.current;

        if (!rect || !cellWidth || !cellHeight) return null;

        const x = Math.floor((event.clientX - rect.left) / cellWidth);
        const y = Math.floor((event.clientY - rect.top) / cellHeight);

        if (Number.isNaN(x) || Number.isNaN(y)) return null;

        const columns = gridRef.current[0]?.length || 1;
        const rows = gridRef.current.length || 1;

        return {
            x: Math.min(Math.max(x, 0), columns - 1),
            y: Math.min(Math.max(y, 0), rows - 1)
        };
    }, [boardRef, gridRef, updateBoardMetrics]);

    useLayoutEffect(() => {
        if (!boardRef.current) return;
        updateBoardMetrics(true);
        const handleResizeStart = () => { isResizing.current = true; };
        const handleResize = () => {
            isResizing.current = true;
            updateBoardMetrics(true);
            clearTimeout(handleResize.timeoutId);
            handleResize.timeoutId = setTimeout(() => {
                isResizing.current = false;
                updateBoardMetrics(true);
            }, 150);
        };
        window.addEventListener('resize', handleResizeStart, { passive: true });
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);

        let observer;
        if (typeof ResizeObserver !== 'undefined') {
            observer = new ResizeObserver(() => {
                isResizing.current = true;
                updateBoardMetrics(true);
            });
            observer.observe(boardRef.current);
        }

        return () => {
            window.removeEventListener('resize', handleResizeStart);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
            if (observer) observer.disconnect();
        };
    }, [boardRef, updateBoardMetrics]);

    return { getGridCoordinates, updateBoardMetrics };
};

export default useCanvasCoords;
