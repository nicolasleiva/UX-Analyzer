
import React, { useState, useEffect } from 'react';

interface CalibrationScreenProps {
    onComplete: () => void;
    progress: number;
    setProgress: (progress: number) => void;
}

const CalibrationScreen: React.FC<CalibrationScreenProps> = ({ onComplete, progress, setProgress }) => {
    const totalClicks = 20;
    const [clickCount, setClickCount] = useState(0);
    const [calibrationPoints, setCalibrationPoints] = useState<[number, number][]>([]);
    const [currentPointIndex, setCurrentPointIndex] = useState(0);

    useEffect(() => {
        const points: [number, number][] = [];
        const screenMargin = 50;
        const width = window.innerWidth;
        const height = window.innerHeight;

        points.push([screenMargin, screenMargin]);
        points.push([width / 2, screenMargin]);
        points.push([width - screenMargin, screenMargin]);
        points.push([width - screenMargin, height / 2]);
        points.push([width - screenMargin, height - screenMargin]);
        points.push([width / 2, height - screenMargin]);
        points.push([screenMargin, height - screenMargin]);
        points.push([screenMargin, height / 2]);
        points.push([width / 2, height / 2]);
        
        setCalibrationPoints(points);
    }, []);

    const handleCalibrationClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        if (!window.webgazer || !window.webgazer.isReady()) return;
        
        // Explicitly record the click position for more reliable calibration.
        window.webgazer.recordScreenPosition(event.clientX, event.clientY, 'click');
        
        const newClickCount = clickCount + 1;
        setClickCount(newClickCount);

        const newProgress = Math.round((newClickCount / totalClicks) * 100);
        setProgress(newProgress);

        if (newClickCount >= totalClicks) {
            // BUG FIX: Removed line that cleared calibration data immediately after collecting it.
            onComplete();
        } else {
            // Move to the next point
            setCurrentPointIndex((prevIndex) => (prevIndex + 1) % calibrationPoints.length);
        }
    };
    
    const currentPoint = calibrationPoints[currentPointIndex];

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-95 z-50 flex flex-col items-center justify-center">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white">Mejorando Precisión</h2>
                <p className="text-gray-300 mt-2">
                    Por favor, haz clic <span className="font-bold text-blue-400">{totalClicks - clickCount}</span> veces más en el punto.
                </p>
                <p className="text-gray-400 text-sm">Mantén la cabeza quieta y sigue el punto azul con los ojos.</p>
            </div>

            <div className="w-full h-2 bg-gray-700 rounded-full max-w-md my-4">
                <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${progress}%` }}
                ></div>
            </div>

            {calibrationPoints.length > 0 && currentPoint && (
                <button
                    className="calibration-button w-8 h-8 bg-blue-500 rounded-full shadow-lg border-2 border-white absolute"
                    style={{ top: `${currentPoint[1]}px`, left: `${currentPoint[0]}px`, transform: 'translate(-50%, -50%)' }}
                    onClick={handleCalibrationClick}
                    aria-label="Punto de calibración"
                />
            )}
        </div>
    );
};

export default CalibrationScreen;
