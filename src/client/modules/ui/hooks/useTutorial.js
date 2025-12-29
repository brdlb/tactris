import { useState, useCallback, useMemo } from 'react';

export const TUTORIAL_STEPS = [
    // Horizontal construction sequence
    {
        id: 'h_1',
        title: 'Start Building',
        instruction: 'Place the square (O-shape) in the middle-left area.',
        targetFigure: 'O',
        hintPixels: [{ x: 0, y: 4 }, { x: 1, y: 4 }, { x: 0, y: 5 }, { x: 1, y: 5 }],
        setupGrid: (grid) => grid.map(row => Array(10).fill(null)) // Reset only on first step
    },
    {
        id: 'h_2',
        title: 'Building a line',
        instruction: 'Place the J-shape next to it.',
        targetFigure: 'J',
        hintPixels: [{ x: 3, y: 3 }, { x: 3, y: 4 }, { x: 3, y: 5 }, { x: 2, y: 5 }]
    },
    {
        id: 'h_3',
        title: 'Almost there',
        instruction: 'Fit the L-shape to extend the row.',
        targetFigure: 'L',
        hintPixels: [{ x: 4, y: 3 }, { x: 4, y: 4 }, { x: 4, y: 5 }, { x: 5, y: 5 }]
    },
    {
        id: 'h_4',
        title: 'Horizontal Clear!',
        instruction: 'Draw the I-shape to complete the row and clear it!',
        targetFigure: 'I',
        hintPixels: [{ x: 6, y: 5 }, { x: 7, y: 5 }, { x: 8, y: 5 }, { x: 9, y: 5 }]
    },
    // Vertical construction sequence
    {
        id: 'v_1',
        title: 'Going Vertical',
        instruction: 'Now place a square in the top-middle.',
        targetFigure: 'O',
        hintPixels: [{ x: 4, y: 0 }, { x: 5, y: 0 }, { x: 4, y: 1 }, { x: 5, y: 1 }]
    },
    {
        id: 'v_2',
        title: 'Descending',
        instruction: 'Now use the stick (I-shape) to build further down.',
        targetFigure: 'I',
        customCells: [[0, 0], [0, 1], [0, 2], [0, 3]],
        hintPixels: [{ x: 5, y: 2 }, { x: 5, y: 3 }, { x: 5, y: 4 }, { x: 5, y: 5 }]
    },
    {
        id: 'v_3',
        title: 'Filling the Gap',
        instruction: 'Add the L-shape to continue the column.',
        targetFigure: 'L',
        hintPixels: [{ x: 5, y: 6 }, { x: 5, y: 7 }, { x: 5, y: 8 }, { x: 6, y: 8 }]
    },
    {
        id: 'v_4',
        title: 'Vertical Clear!',
        instruction: 'Draw the I-shape horizontally to complete the column and clear it!',
        targetFigure: 'I',
        hintPixels: [{ x: 4, y: 9 }, { x: 5, y: 9 }, { x: 6, y: 9 }, { x: 7, y: 9 }]
    },
    {
        id: 'tutorial_end',
        title: 'Congratulations!',
        instruction: 'You have completed the tutorial. You are now ready to play Tactris!',
        isFinal: true
    }
];

const useTutorial = (onComplete) => {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isTutorialActive, setIsTutorialActive] = useState(() => {
        return !localStorage.getItem('tutorialCompleted');
    });

    const currentStep = useMemo(() => TUTORIAL_STEPS[currentStepIndex], [currentStepIndex]);

    const nextStep = useCallback(() => {
        if (currentStepIndex < TUTORIAL_STEPS.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
            return true;
        } else {
            completeTutorial();
            return false;
        }
    }, [currentStepIndex, onComplete]);

    const completeTutorial = useCallback(() => {
        localStorage.setItem('tutorialCompleted', 'true');
        setIsTutorialActive(false);
        if (onComplete) onComplete();
    }, [onComplete]);

    const handleTutorialComplete = useCallback(() => {
        completeTutorial();
    }, [completeTutorial]);

    const skipTutorial = useCallback(() => {
        completeTutorial();
    }, [completeTutorial]);

    return {
        isTutorialActive,
        currentStep,
        currentStepIndex,
        totalSteps: TUTORIAL_STEPS.length,
        nextStep,
        skipTutorial,
        handleTutorialComplete
    };
};

export default useTutorial;
