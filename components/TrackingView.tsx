
import React, { useState } from 'react';
import { GazePoint } from '../types';

interface TrackingViewProps {
    url: string;
    onFinish: () => void;
    currentGaze: GazePoint | null;
}

const GazeDot: React.FC<{ position: GazePoint | null }> = ({ position }) => {
    // We only render the dot if we have a position, to avoid it appearing at (0,0) initially.
    if (!position) {
        return null;
    }
    return (
        <div 
            className="gaze-dot" 
            style={{ 
                left: `${position.x}px`, 
                top: `${position.y}px`,
                // Move the dot's origin to its center for better accuracy
                transform: 'translate(-50%, -50%)' 
            }}
        />
    );
};


const TrackingView: React.FC<TrackingViewProps> = ({ url, onFinish, currentGaze }) => {
    const [iframeError, setIframeError] = useState(false);

    return (
        <div className="w-full h-screen flex flex-col bg-gray-800">
            <div className="p-3 bg-gray-900 border-b border-gray-700 flex justify-between items-center z-30">
                <div className="text-gray-400 text-sm">
                    <span className="font-bold text-white">Analizando:</span> {url}
                </div>
                <button onClick={onFinish} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                    Finalizar y Ver Resultados
                </button>
            </div>
            <div className="relative flex-grow w-full h-full">
                <GazeDot position={currentGaze} />
                {iframeError ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800 text-center p-4">
                        <h3 className="text-2xl font-bold text-red-400">No se pudo cargar la página</h3>
                        <p className="mt-2 text-gray-300 max-w-md">
                            El sitio web <span className="font-mono bg-gray-700 px-1 rounded">{url}</span> no permite ser incrustado en otras páginas (debido a la cabecera `X-Frame-Options` o `Content-Security-Policy`).
                        </p>
                        <p className="mt-4 text-gray-400">Por favor, prueba con otra URL.</p>
                    </div>
                ) : (
                    <iframe
                        src={url}
                        className="w-full h-full border-none"
                        title="Website to analyze"
                        sandbox="allow-scripts allow-same-origin"
                        onError={() => setIframeError(true)}
                        onLoad={(e) => {
                            try {
                                // Attempt to access contentWindow to check for cross-origin restrictions.
                                // If the line below throws an error, the iframe content is not accessible.
                                const iframeWindow = e.currentTarget.contentWindow;
                                if(iframeWindow && iframeWindow.length === 0) {
                                  // This case can happen for 'about:blank' or empty pages.
                                }
                            } catch (error) {
                                console.error("Cross-origin security error with iframe:", error);
                                setIframeError(true);
                            }
                        }}
                    ></iframe>
                )}
            </div>
        </div>
    );
};

export default TrackingView;
