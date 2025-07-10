import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, GazePoint } from './types';
import { LoadingSpinner, ErrorIcon, RocketIcon } from './components/icons';
import CalibrationScreen from './components/CalibrationScreen';
import TrackingView from './components/TrackingView';
import HeatmapOverlay from './components/HeatmapOverlay';

// Make webgazer and heatmap available from window
declare global {
    interface Window {
        webgazer: any;
        h337: any;
    }
}

const App: React.FC = () => {
    const [appState, setAppState] = useState<AppState>(AppState.IDLE);
    const [url, setUrl] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [gazePoints, setGazePoints] = useState<GazePoint[]>([]);
    const [currentGaze, setCurrentGaze] = useState<GazePoint | null>(null);
    const [isWebgazerReady, setIsWebgazerReady] = useState(false);
    const [calibrationProgress, setCalibrationProgress] = useState(0);
    const [groqApiKey, setGroqApiKey] = useState<string>('');
    const [uxAnalysis, setUxAnalysis] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);


    const appStateRef = useRef(appState);
    useEffect(() => {
        appStateRef.current = appState;
    }, [appState]);

    const startWebgazer = useCallback(async () => {
        if (window.webgazer) {
            try {
                setAppState(AppState.INITIALIZING);
                
                window.webgazer.setGazeListener((data: GazePoint | null) => {
                    setCurrentGaze(data); 
                    
                    if (data && appStateRef.current === AppState.TRACKING) {
                        setGazePoints(prevPoints => [...prevPoints, data]);
                    }
                }).begin();

                window.webgazer.showVideoPreview(true).showPredictionPoints(false);
                setIsWebgazerReady(true);
                setAppState(AppState.CALIBRATING);
            } catch (e) {
                console.error(e);
                setError("No se pudo iniciar la cámara. Por favor, concede los permisos y recarga la página.");
                setAppState(AppState.ERROR);
            }
        } else {
            setTimeout(startWebgazer, 500);
        }
    }, []);

    const handleUrlSubmit = (submittedUrl: string) => {
        if (!submittedUrl) {
            setError("Por favor, introduce una URL válida.");
            return;
        }
        try {
            let formattedUrl = submittedUrl;
            if (!/^https?:\/\//i.test(formattedUrl)) {
                formattedUrl = 'https://' + formattedUrl;
            }
            new URL(formattedUrl);
            setUrl(formattedUrl);
            setError(null);
            startWebgazer();
        } catch (_) {
            setError("La URL introducida no es válida. Asegúrate de que tenga el formato correcto.");
        }
    };

    const handleCalibrationComplete = () => {
        window.webgazer.showPredictionPoints(false);
        setGazePoints([]);
        setAppState(AppState.TRACKING);
    };

    const handleFinishTracking = async () => {
        if (window.webgazer) {
            window.webgazer.pause();
            window.webgazer.showVideoPreview(false);
        }
        setAppState(AppState.VIEWING_RESULTS);

        if (!groqApiKey) {
            setUxAnalysis("Análisis de UX omitido: no se proporcionó una clave de API de Groq.");
            return;
        }

        if (gazePoints.length < 20) {
            setUxAnalysis("No se recopilaron suficientes datos de la mirada para un análisis de UX significativo.");
            return;
        }

        setIsAnalyzing(true);
        setUxAnalysis(null);

        const summarizedGazePoints = gazePoints.slice(0, 250).map(p => ({ x: Math.round(p.x), y: Math.round(p.y) }));

        const prompt = `
            Eres un experto analista de UI/UX de clase mundial. Tu tarea es analizar una sesión de seguimiento ocular de un usuario en una página web.
            A continuación, recibirás la URL de la página, las dimensiones de la pantalla y una serie de coordenadas (x, y) que representan dónde miró el usuario.

            DATOS DE LA SESIÓN:
            - URL de la página: ${url}
            - Dimensiones de la pantalla (Ancho x Alto): ${window.innerWidth} x ${window.innerHeight}px
            - Primeros ${summarizedGazePoints.length} puntos de la mirada: ${JSON.stringify(summarizedGazePoints)}

            TAREA DE ANÁLISIS:
            Basándote en los datos proporcionados, realiza un análisis de UX completo y profesional. Estructura tu respuesta en español utilizando markdown y las siguientes secciones:

            ### 1. Resumen General de la Interacción
            (Describe brevemente el comportamiento del usuario. ¿Parecía enfocado, perdido, explorando rápidamente?)

            ### 2. Zonas de Mayor Atención (Hotspots)
            (Identifica las áreas (ej. 'esquina superior izquierda', 'centro', 'barra de navegación') que recibieron más atención según las coordenadas. Infiere qué elementos de la UI podrían estar en esas zonas.)

            ### 3. Zonas Ignoradas o Puntos Ciegos
            (Identifica las áreas con poca o ninguna mirada. Especula por qué podrían haber sido ignoradas. ¿Son áreas de anuncios, el pie de página, o elementos poco importantes?)

            ### 4. Patrón de Escaneo Visual
            (Describe la ruta visual del usuario. ¿Sigue un patrón en F, en Z, o es errático? ¿Qué podría indicar esto sobre el diseño de la página y la facilidad para encontrar información?)

            ### 5. Posibles Puntos de Fricción o Confusión
            (¿Hay evidencia de que la mirada salta repetidamente entre dos puntos? Esto podría indicar que el usuario estaba comparando opciones, o que estaba confundido por la navegación o el texto.)

            ### 6. Recomendaciones Concretas de UI/UX
            (Ofrece al menos 3 sugerencias prácticas y accionables para mejorar el diseño y la experiencia del usuario basándote en tu análisis. Por ejemplo: "Aumentar el contraste del botón 'Comprar ahora' en la zona [coordenadas] ya que fue ignorado", o "Simplificar el menú de navegación superior, ya que el usuario mostró un patrón de mirada errático en esa área".)
        `;
        
        try {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${groqApiKey}`
                },
                body: JSON.stringify({
                    model: "llama3-70b-8192",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.7,
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `Error de la API de Groq: ${response.statusText}`);
            }

            const result = await response.json();
            const analysisText = result.choices[0]?.message?.content;
            setUxAnalysis(analysisText || "La respuesta de la API estaba vacía.");
        } catch (err: any) {
            console.error("Error calling Groq API:", err);
            setUxAnalysis(`Error al generar el análisis de UX: ${err.message}. Por favor, verifica tu clave de API y la conexión.`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleRestart = () => {
        if (window.webgazer) {
            window.webgazer.end();
        }
        setUrl('');
        setGazePoints([]);
        setCurrentGaze(null);
        setError(null);
        setIsWebgazerReady(false);
        setCalibrationProgress(0);
        setGroqApiKey('');
        setUxAnalysis(null);
        setIsAnalyzing(false);
        setAppState(AppState.IDLE);
    };

    const renderContent = () => {
        switch (appState) {
            case AppState.IDLE:
                return <UrlInputForm onSubmit={handleUrlSubmit} error={error} groqApiKey={groqApiKey} setGroqApiKey={setGroqApiKey} />;
            case AppState.INITIALIZING:
                return (
                    <div className="text-center">
                        <LoadingSpinner />
                        <p className="mt-4 text-lg">Iniciando cámara...</p>
                        <p className="text-sm text-gray-400">Por favor, permite el acceso a tu cámara.</p>
                    </div>
                );
            case AppState.CALIBRATING:
                return <CalibrationScreen onComplete={handleCalibrationComplete} progress={calibrationProgress} setProgress={setCalibrationProgress} />;
            case AppState.TRACKING:
                return <TrackingView url={url} onFinish={handleFinishTracking} currentGaze={currentGaze} />;
            case AppState.VIEWING_RESULTS:
                return <HeatmapOverlay url={url} gazePoints={gazePoints} onRestart={handleRestart} uxAnalysis={uxAnalysis} isAnalyzing={isAnalyzing} />;
            case AppState.ERROR:
                return (
                    <div className="text-center p-8 bg-gray-800 rounded-lg shadow-xl">
                        <ErrorIcon />
                        <h2 className="mt-4 text-2xl font-bold text-red-400">Error</h2>
                        <p className="mt-2 text-gray-300">{error}</p>
                        <button onClick={handleRestart} className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                            Intentar de Nuevo
                        </button>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center p-4 font-sans">
            <div className="w-full max-w-7xl mx-auto">
                {appState !== AppState.IDLE && appState !== AppState.ERROR && (
                     <div className="absolute top-4 right-4 z-50">
                        <button onClick={handleRestart} className="bg-gray-700 hover:bg-red-600 text-white text-sm font-bold py-2 px-3 rounded-lg transition-all duration-200">
                            Reiniciar Sesión
                        </button>
                    </div>
                )}
                {renderContent()}
            </div>
        </div>
    );
};

interface UrlInputFormProps {
    onSubmit: (url: string) => void;
    error: string | null;
    groqApiKey: string;
    setGroqApiKey: (key: string) => void;
}

const UrlInputForm: React.FC<UrlInputFormProps> = ({ onSubmit, error, groqApiKey, setGroqApiKey }) => {
    const [inputValue, setInputValue] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(inputValue);
    };

    return (
        <div className="w-full max-w-2xl mx-auto text-center p-8 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                Analizador UX de mirada con AI
            </h1>
            <p className="text-gray-400 mb-8 text-lg">
                Descubre dónde se centra tu mirada y obtén un análisis de UX con IA.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                 <div className="flex flex-col sm:flex-row gap-4">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Ej: google.com"
                        className="flex-grow bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                        aria-label="URL del sitio web"
                        required
                    />
                    <button type="submit" className="flex items-center justify-center bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300">
                        <RocketIcon />
                        <span className="ml-2">Analizar</span>
                    </button>
                </div>
                 <div className="text-left">
                     <input
                        type="password"
                        value={groqApiKey}
                        onChange={(e) => setGroqApiKey(e.target.value)}
                        placeholder="Clave API de Groq (Opcional, para análisis de UX)"
                        className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all"
                        aria-label="Clave API de Groq"
                    />
                    <p className="mt-2 text-xs text-gray-500">
                        Introduce tu clave de <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Groq</a> para recibir el análisis por IA.
                    </p>
                </div>
            </form>
            {error && <p className="mt-4 text-red-400 animate-pulse">{error}</p>}
             <div className="mt-8 text-sm text-gray-500">
                <p>9/12/2018</p>
            </div>
        </div>
    );
};

export default App;