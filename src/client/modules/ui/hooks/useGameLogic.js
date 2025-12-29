import { useEffect, useRef } from 'react';
import SocketManager from '../../network/SocketManager';
import useGameState from './useGameState';
import useLobbyState from './useLobbyState';
import useBoardInteraction from './useBoardInteraction';
import usePlayerPreferences from './usePlayerPreferences';
import useTutorial from './useTutorial';
import { FIGURES } from '../../../constants/figures';

const useGameLogic = (boardRefOverride = null) => {
    // Shared refs
    const roomIdRef = useRef(null);
    const selectedPixelsRef = useRef([]);

    // 1. Initial Preferences (theme, color)
    const preferences = usePlayerPreferences(roomIdRef);
    const {
        theme,
        toggleTheme,
        personalColor,
        handleHueChange
    } = preferences;

    // 2. Tutorial state
    const tutorial = useTutorial();
    const {
        isTutorialActive,
        currentStep,
        currentStepIndex,
        totalSteps,
        nextStep,
        skipTutorial,
        handleTutorialComplete
    } = tutorial;

    // 3. Board Selection & Interaction
    const internalBoardRef = useRef(null);
    const boardRef = boardRefOverride ?? internalBoardRef;

    // 4. Game State
    const gameState = useGameState(personalColor, selectedPixelsRef, roomIdRef);
    const {
        grid, setGrid, gridRef,
        roomId, setRoomId,
        myFigures, setMyFigures,
        score,
        playersList,
        clearingDetails, setClearingDetails,
        gameOver,
        isRestored,
        roomRotateableRef
    } = gameState;

    // 5. Board Interaction
    const interaction = useBoardInteraction({
        boardRef,
        gridRef,
        roomIdRef,
        gameOver,
        isTutorialActive,
        currentStep,
        nextStep,
        myFigures,
        roomRotateableRef,
        setGrid,
        setClearingDetails,
        personalColor,
        selectedPixelsRef
    });

    const {
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handlePointerCancel
    } = interaction;

    // 6. Lobby state
    const { rooms, roomStates } = useLobbyState();

    // SocketManager connection and basic setup
    useEffect(() => {
        SocketManager.connect();

        document.body.style.margin = '0';
        document.body.style.overflow = 'hidden';
        document.body.style.backgroundColor = '#f0f0f0';

        return () => {
            document.body.style.margin = '';
            document.body.style.overflow = '';
            document.body.style.backgroundColor = '';
        };
    }, []);

    // Tutorial grid/figures sync
    useEffect(() => {
        if (!isTutorialActive) return;

        if (currentStepIndex === 0) {
            const initialGrid = currentStep?.setupGrid
                ? currentStep.setupGrid(Array(10).fill(null).map(() => Array(10).fill(null)))
                : Array(10).fill(null).map(() => Array(10).fill(null));
            setGrid(initialGrid);
            gridRef.current = initialGrid;
        }

        if (currentStep && currentStep.targetFigure) {
            const cells = currentStep.customCells || FIGURES[currentStep.targetFigure];
            const primaryFigure = { id: currentStep.targetFigure, cells };
            const secondaryId = currentStep.targetFigure === 'I' ? 'O' : 'I';
            const secondaryFigure = { id: secondaryId, cells: FIGURES[secondaryId] };
            setMyFigures([primaryFigure, secondaryFigure]);
        } else if (currentStep?.isFinal) {
            setMyFigures([]);
        }
    }, [isTutorialActive, currentStepIndex, currentStep, setGrid, gridRef, setMyFigures]);

    // History handlers
    useEffect(() => {
        const handlePopstate = () => {
            const params = new URLSearchParams(window.location.search);
            const urlRoomId = params.get('room');
            const currentRoomId = roomIdRef.current;

            if (urlRoomId !== currentRoomId) {
                if (currentRoomId) {
                    SocketManager.leaveRoom(currentRoomId);
                    setRoomId(null);
                    roomIdRef.current = null;
                    localStorage.removeItem('currentRoomId');
                }
                if (urlRoomId) {
                    SocketManager.joinRoom(urlRoomId, personalColor);
                }
            }
        };

        window.addEventListener('popstate', handlePopstate);
        return () => window.removeEventListener('popstate', handlePopstate);
    }, [roomIdRef, setRoomId, personalColor]);

    const handleCreateRoom = (rotateable = false) => SocketManager.createRoom(personalColor, rotateable);
    const handleJoinRoom = (id) => SocketManager.joinRoom(id, personalColor);
    const handleRestart = () => roomIdRef.current && SocketManager.restartGame(roomIdRef.current);
    const handleLeaveRoom = () => {
        if (roomIdRef.current) {
            SocketManager.leaveRoom(roomIdRef.current);
            setRoomId(null);
            roomIdRef.current = null;
            localStorage.removeItem('currentRoomId');
            window.history.pushState({}, '', window.location.pathname);
        }
    };

    return {
        grid,
        roomId,
        roomStates,
        rooms,
        playersList,
        myFigures,
        score,
        gameOver,
        isRestored,
        theme,
        toggleTheme,
        handleCreateRoom,
        handleJoinRoom,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handlePointerCancel,
        handleHueChange,
        handleRestart,
        handleLeaveRoom,
        clearingDetails,
        setClearingDetails,
        personalColor,
        boardRef,

        // Tutorial exports
        isTutorialActive,
        currentStep,
        currentStepIndex,
        totalSteps,
        skipTutorial,
        handleTutorialComplete
    };
};

export default useGameLogic;
