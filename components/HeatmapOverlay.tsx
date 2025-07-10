import React, { useEffect, useRef } from 'react';
import { GazePoint } from '../types';
import { LoadingSpinner } from './icons';

interface HeatmapOverlayProps {
    url: string;
    gazePoints: GazePoint[];
    onRestart: () => void;
    uxAnalysis: string | null;
    isAnalyzing: boolean;
}

const AnalysisDisplay: React.FC<{ analysis: string | null; isLoading: boolean }> = ({ analysis, isLoading }) => {
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center text-white">
                <LoadingSpinner />
                <h3 className="mt-4 text-xl font-semibold">Analizando la experiencia de usuario...</h3>
                <p className="mt-2 text-gray-400">La IA está procesando los datos de tu mirada. Esto puede tardar unos segundos.</p>
            </div>
        );
    }

    if (!analysis) {
        return (
             <div className="flex flex-col items-center justify-center h-full p-6 text-center text-white">
                <h3 className="mt-4 text-xl font-semibold">Análisis de UX no disponible</h3>
                <p className="mt-2 text-gray-400">No se ha generado ningún análisis. Esto puede deberse a la falta de una clave de API de Groq o a datos de mirada insuficientes.</p>
            </div>
        );
    }

    return (
        <div className="h-full p-4 sm:p-6 bg-gray-900 rounded-lg overflow-y-auto">
            <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-4">
                Análisis de UX por IA
            </h3>
            <pre className="text-gray-300 whitespace-pre-wrap font-sans text-sm sm:text-base leading-relaxed">
                {analysis}
            </pre>
        </div>
    );
};


const HeatmapOverlay: React.FC<HeatmapOverlayProps> = ({ url, gazePoints, onRestart, uxAnalysis, isAnalyzing }) => {
    const heatmapContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (heatmapContainerRef.current && window.h337 && gazePoints.length > 0) {
            const heatmapInstance = window.h337.create({
                container: heatmapContainerRef.current,
                radius: 40,
                maxOpacity: .6,
                minOpacity: .1,
                blur: .75,
                gradient: {
                    '.1': 'blue',
                    '.5': 'lime',
                    '.8': 'yellow',
                    '.95': 'red'
                }
            });

            const dataPoints = gazePoints.map(p => ({
                x: Math.round(p.x),
                y: Math.round(p.y),
                value: 1
            }));

            heatmapInstance.setData({
                max: 5,
                data: dataPoints
            });
        }
    }, [gazePoints]);

    return (
        <div className="w-full h-screen flex flex-col bg-gray-800">
            <div className="p-3 bg-gray-900 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
                 <div className="text-gray-300">
                    <h2 className="text-xl font-bold text-white">Resultados del Análisis</h2>
                    <p className="text-sm truncate max-w-sm">{url}</p>
                </div>
                <button onClick={onRestart} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                    Analizar otra Página
                </button>
            </div>
             <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 overflow-hidden">
                <div className="relative w-full h-full min-h-[50vh] lg:min-h-0 border border-gray-700 rounded-lg overflow-hidden">
                    <div ref={heatmapContainerRef} className="absolute inset-0 z-20"></div>
                    <iframe
                        src={url}
                        className="w-full h-full border-none opacity-40"
                        title="Website background"
                        sandbox="allow-scripts allow-same-origin"
                    ></iframe>
                    <div className="absolute inset-0 bg-gray-900 bg-opacity-30 z-10 pointer-events-none"></div>
                </div>

                <div className="relative w-full h-full bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                   <AnalysisDisplay analysis={uxAnalysis} isLoading={isAnalyzing} />
                </div>
            </div>
        </div>
    );
};

export default HeatmapOverlay;
