import React, { useState, useEffect } from 'react';
import { GameMode, GameStage, DrawingPart, Stroke, Language } from './types';
import { generateTopic, generateAiDrawing } from './services/geminiService';
import DrawingCanvas, { renderStrokesToDataUrl } from './components/DrawingCanvas';
import ResultView from './components/ResultView';
import { translations } from './locales';
import { Pencil, Users, Bot, Loader2, Sparkles, AlertCircle, Link as LinkIcon, Copy, Globe, ArrowRight, Languages } from 'lucide-react';
import { encodeGameState, decodeGameState } from './utils/urlState';

const CANVAS_WIDTH = 350; // Base width for canvas logic
const HALF_HEIGHT = 280;  // Height for each drawing half

const App: React.FC = () => {
  const [stage, setStage] = useState<GameStage>(GameStage.MENU);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.LOCAL);
  const [topic, setTopic] = useState<string>('');
  const [lang, setLang] = useState<Language>('zh'); // Default to Chinese
  
  // Images for display
  const [p1Image, setP1Image] = useState<string>('');
  const [p2Image, setP2Image] = useState<string>('');
  
  // Stroke data for online persistence
  const [p1Strokes, setP1Strokes] = useState<Stroke[]>([]);
  const [p2Strokes, setP2Strokes] = useState<Stroke[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = translations[lang];

  // Check URL for online game data on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gameData = params.get('g');
    
    if (gameData) {
      const decoded = decodeGameState(gameData);
      if (decoded) {
        setGameMode(GameMode.ONLINE);
        setTopic(decoded.t);
        
        if (decoded.p1 && decoded.p2) {
          // Both parts done - Show Result
          setP1Strokes(decoded.p1);
          setP2Strokes(decoded.p2);
          
          // Reconstruct images
          setP1Image(renderStrokesToDataUrl(decoded.p1, CANVAS_WIDTH, HALF_HEIGHT));
          setP2Image(renderStrokesToDataUrl(decoded.p2, CANVAS_WIDTH, HALF_HEIGHT));
          
          setStage(GameStage.RESULT);
        } else if (decoded.p1) {
          // P1 done - Player 2 turn
          setP1Strokes(decoded.p1);
          // Don't generate image for P1 yet to prevent cheating via console/network inspection ease (though data is there)
          // Actually we just don't display it.
          setStage(GameStage.P2_DRAW);
        }
      }
    }
  }, []);

  // Helper to wait
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  const toggleLanguage = () => {
    setLang(prev => prev === 'en' ? 'zh' : 'en');
  };

  const startGame = async (mode: GameMode) => {
    setGameMode(mode);
    setIsLoading(true);
    setStage(GameStage.TOPIC_SELECTION);
    setError(null);
    
    try {
      const newTopic = await generateTopic(lang);
      setTopic(newTopic);
      setIsLoading(false);
      
      // Short delay to show topic before starting
      await delay(1500); 
      setStage(GameStage.P1_DRAW);
    } catch (e) {
      setError(t.errorTopic);
      setIsLoading(false);
    }
  };

  const handleP1Confirm = async (dataUrl: string, strokes: Stroke[]) => {
    setP1Image(dataUrl);
    setP1Strokes(strokes);
    
    if (gameMode === GameMode.LOCAL) {
      setStage(GameStage.TRANSITION);
    } else if (gameMode === GameMode.ONLINE) {
      setStage(GameStage.TRANSITION);
    } else {
      // AI Mode
      setStage(GameStage.TRANSITION);
      await generateAiResponse();
    }
  };

  const handleTransitionComplete = () => {
    setStage(GameStage.P2_DRAW);
  };

  const handleP2Confirm = (dataUrl: string, strokes: Stroke[]) => {
    setP2Image(dataUrl);
    setP2Strokes(strokes);
    
    // For online mode, we need to reconstruct P1 image if it wasn't already (since we hid it)
    if (gameMode === GameMode.ONLINE && !p1Image && p1Strokes.length > 0) {
      setP1Image(renderStrokesToDataUrl(p1Strokes, CANVAS_WIDTH, HALF_HEIGHT));
    }
    
    setStage(GameStage.RESULT);
  };

  const generateAiResponse = async () => {
    setIsLoading(true);
    try {
      const aiImage = await generateAiDrawing(topic, DrawingPart.BOTTOM);
      setP2Image(aiImage);
      setIsLoading(false);
      setStage(GameStage.RESULT);
    } catch (e) {
      console.error(e);
      setError(t.errorAi);
      setIsLoading(false);
    }
  };

  const resetGame = () => {
    // Clear URL params
    window.history.pushState({}, '', window.location.pathname);
    
    setStage(GameStage.MENU);
    setTopic('');
    setP1Image('');
    setP2Image('');
    setP1Strokes([]);
    setP2Strokes([]);
    setError(null);
  };

  const getShareUrl = (complete = false) => {
    const state = {
      t: topic,
      p1: p1Strokes,
      p2: complete ? p2Strokes : undefined
    };
    const hash = encodeGameState(state);
    return `${window.location.origin}${window.location.pathname}?g=${hash}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert(t.linkCopied);
    });
  };

  // --- RENDER HELPERS ---

  const renderMenu = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center space-y-8 animate-fade-in">
      <div className="space-y-2">
        <div className="inline-block p-4 bg-indigo-100 rounded-full mb-2">
            <Pencil size={48} className="text-indigo-600" />
        </div>
        <h1 className="text-4xl font-black text-slate-800 tracking-tight">{t.appTitle}</h1>
        <p className="text-slate-500 text-lg">{t.appSubtitle}</p>
      </div>

      <div className="grid gap-4 w-full max-w-sm">
        <button 
          onClick={() => startGame(GameMode.LOCAL)}
          className="group relative p-6 bg-white rounded-2xl shadow-md border-2 border-indigo-50 hover:border-indigo-500 hover:shadow-xl transition-all duration-300 flex items-center gap-4 text-left"
        >
          <div className="bg-indigo-100 p-3 rounded-xl group-hover:bg-indigo-600 transition-colors">
            <Users className="text-indigo-600 group-hover:text-white" size={24} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-800">{t.passAndPlay}</h3>
            <p className="text-sm text-slate-400">{t.passAndPlayDesc}</p>
          </div>
        </button>

        <button 
          onClick={() => startGame(GameMode.ONLINE)}
          className="group relative p-6 bg-white rounded-2xl shadow-md border-2 border-indigo-50 hover:border-indigo-500 hover:shadow-xl transition-all duration-300 flex items-center gap-4 text-left"
        >
          <div className="bg-indigo-100 p-3 rounded-xl group-hover:bg-indigo-600 transition-colors">
            <Globe className="text-indigo-600 group-hover:text-white" size={24} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-800">{t.onlineCoop}</h3>
            <p className="text-sm text-slate-400">{t.onlineCoopDesc}</p>
          </div>
        </button>

        <button 
          onClick={() => startGame(GameMode.AI)}
          className="group relative p-6 bg-white rounded-2xl shadow-md border-2 border-purple-50 hover:border-purple-500 hover:shadow-xl transition-all duration-300 flex items-center gap-4 text-left"
        >
          <div className="bg-purple-100 p-3 rounded-xl group-hover:bg-purple-600 transition-colors">
            <Bot className="text-purple-600 group-hover:text-white" size={24} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-800">{t.sketchWithAi}</h3>
            <p className="text-sm text-slate-400">{t.sketchWithAiDesc}</p>
          </div>
        </button>
      </div>
    </div>
  );

  const renderTopic = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in text-center px-4">
      {isLoading ? (
        <div className="flex flex-col items-center gap-4">
           <Loader2 className="animate-spin text-indigo-500" size={48} />
           <p className="text-indigo-800 font-medium">{t.topicLoading}</p>
        </div>
      ) : (
        <>
          <Sparkles className="text-yellow-400 mb-4 animate-bounce" size={40} />
          <h2 className="text-2xl font-bold text-slate-400 mb-2 uppercase tracking-widest">{t.topicLabel}</h2>
          <div className="text-5xl font-black text-indigo-600 mb-8 break-words max-w-full">
            {topic}
          </div>
          <p className="text-slate-500">{t.drawTop}</p>
        </>
      )}
    </div>
  );

  const renderTransition = () => {
    if (gameMode === GameMode.AI) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in text-center px-6">
          <div className="relative mb-6">
            <Bot size={64} className="text-purple-600 animate-pulse" />
            <Sparkles size={24} className="text-yellow-400 absolute -top-2 -right-2 animate-spin-slow" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">{t.aiDrawing}</h3>
          <p className="text-slate-500">{t.aiDrawingDesc}</p>
        </div>
      );
    }

    if (gameMode === GameMode.ONLINE) {
        const shareUrl = getShareUrl(false);
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in text-center px-6">
               <div className="bg-indigo-100 p-6 rounded-full mb-6">
                  <LinkIcon size={48} className="text-indigo-600" />
               </div>
               <h3 className="text-2xl font-bold text-slate-800 mb-2">{t.p2Turn}</h3>
               <p className="text-slate-500 mb-6 max-w-xs">
                 {t.sendLink}
               </p>
               
               <div className="w-full max-w-sm bg-white p-2 rounded-xl border border-indigo-100 flex items-center gap-2 shadow-sm mb-6">
                   <div className="flex-1 overflow-hidden">
                       <input 
                         type="text" 
                         value={shareUrl} 
                         readOnly 
                         className="w-full text-sm text-slate-500 bg-transparent outline-none px-2"
                       />
                   </div>
                   <button 
                     onClick={() => copyToClipboard(shareUrl)}
                     className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 font-bold"
                   >
                       <Copy size={18} />
                   </button>
               </div>

               <p className="text-xs text-slate-400 mb-4">
                   {t.finishLink}
               </p>
            </div>
        );
    }

    // Local
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in text-center px-6">
         <div className="bg-indigo-100 p-6 rounded-full mb-6 animate-bounce">
            <Users size={48} className="text-indigo-600" />
         </div>
         <h3 className="text-2xl font-bold text-slate-800 mb-4">{t.passDevice}</h3>
         <p className="text-slate-500 mb-8 max-w-xs">
           {t.passDeviceDesc}
         </p>
         <button 
           onClick={handleTransitionComplete}
           className="w-full max-w-xs py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-colors"
         >
           {t.iamP2}
         </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Top Navbar */}
      <nav className="w-full bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2 cursor-pointer" onClick={resetGame}>
          <div className="bg-gradient-to-tr from-indigo-500 to-purple-600 p-1.5 rounded-lg">
            <Pencil size={16} className="text-white" />
          </div>
          <span className="font-bold text-slate-800">{t.appTitle}</span>
        </div>
        
        <div className="flex items-center gap-4">
           {stage === GameStage.MENU && (
             <button 
                onClick={toggleLanguage} 
                className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 transition-colors text-sm font-semibold"
             >
                <Languages size={18} />
                <span>{lang === 'zh' ? 'EN' : '中文'}</span>
             </button>
           )}
           
           {stage !== GameStage.MENU && (
              <button onClick={resetGame} className="text-xs font-semibold text-slate-500 hover:text-red-500 transition-colors">
                {t.exit}
              </button>
            )}
        </div>
      </nav>

      <main className="container mx-auto max-w-2xl px-4 py-6">
        {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
                <AlertCircle size={20} />
                {error}
                <button onClick={resetGame} className="ml-auto text-sm font-bold underline">{t.home}</button>
            </div>
        )}

        {stage === GameStage.MENU && renderMenu()}
        {stage === GameStage.TOPIC_SELECTION && renderTopic()}
        
        {stage === GameStage.P1_DRAW && (
          <DrawingCanvas 
            partName={t.topPart} 
            topic={topic}
            height={HALF_HEIGHT}
            width={CANVAS_WIDTH}
            onConfirm={handleP1Confirm}
            labels={{ clear: t.clear, done: t.done, instruction: t.drawHead }}
          />
        )}

        {stage === GameStage.TRANSITION && renderTransition()}

        {stage === GameStage.P2_DRAW && (
          <DrawingCanvas 
            partName={t.bottomPart} 
            topic={topic}
            height={HALF_HEIGHT}
            width={CANVAS_WIDTH}
            onConfirm={handleP2Confirm}
            isLowerHalf={true}
            labels={{ clear: t.clear, done: t.done, instruction: t.drawLegs }}
          />
        )}

        {stage === GameStage.RESULT && (
           <div className="flex flex-col gap-6">
              <ResultView 
                topic={topic}
                topImage={p1Image}
                bottomImage={p2Image}
                onPlayAgain={resetGame}
              />
              
              {gameMode === GameMode.ONLINE && (
                  <div className="mx-auto w-full max-w-md bg-white p-4 rounded-xl shadow-sm border border-indigo-100 text-center animate-fade-in">
                      <h4 className="font-bold text-slate-700 mb-2">{t.shareResult}</h4>
                      <p className="text-sm text-slate-500 mb-4">{t.shareResultDesc}</p>
                      
                      <div className="w-full bg-slate-50 p-2 rounded-lg border border-slate-200 flex items-center gap-2 mb-2">
                          <input 
                             type="text" 
                             value={getShareUrl(true)} 
                             readOnly 
                             className="w-full text-xs text-slate-500 bg-transparent outline-none"
                           />
                           <button 
                             onClick={() => copyToClipboard(getShareUrl(true))}
                             className="p-1.5 bg-white text-indigo-600 rounded shadow-sm hover:text-indigo-800"
                           >
                               <Copy size={16} />
                           </button>
                      </div>
                  </div>
              )}
           </div>
        )}
      </main>

      <footer className="w-full text-center py-6 text-slate-400 text-xs">
        <p>{t.poweredBy}</p>
      </footer>
    </div>
  );
};

export default App;
