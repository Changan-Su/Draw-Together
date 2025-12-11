import React, { useState, useEffect, useRef } from 'react';
import { GameMode, GameStage, DrawingPart, Stroke, Language } from './types';
import { generateTopic, generateAiDrawing } from './services/geminiService';
import { createGame, getGame, submitDrawing, pollGame, GameData } from './services/gameApi';
import DrawingCanvas, { renderStrokesToDataUrl } from './components/DrawingCanvas';
import ResultView from './components/ResultView';
import { translations } from './locales';
import { Pencil, Users, Bot, Loader2, Sparkles, AlertCircle, Copy, Globe, Languages, Share2 } from 'lucide-react';

const CANVAS_WIDTH = 350;
const HALF_HEIGHT = 280;
const ROLE_STORAGE_KEY = 'duodraw_my_role';

// Helper to save/load player role from localStorage
const saveMyRole = (gameId: string, role: 1 | 2) => {
  localStorage.setItem(ROLE_STORAGE_KEY, JSON.stringify({ gameId, role, timestamp: Date.now() }));
};

const loadMyRole = (gameId: string): 1 | 2 | null => {
  try {
    const saved = localStorage.getItem(ROLE_STORAGE_KEY);
    if (!saved) return null;
    const data = JSON.parse(saved);
    // Check if same game and not too old (24 hours)
    if (data.gameId === gameId && Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
      return data.role;
    }
    return null;
  } catch {
    return null;
  }
};

const clearMyRole = () => {
  localStorage.removeItem(ROLE_STORAGE_KEY);
};

const App: React.FC = () => {
  const [stage, setStage] = useState<GameStage>(GameStage.MENU);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.LOCAL);
  const [topic, setTopic] = useState<string>('');
  const [gameId, setGameId] = useState<string>('');
  const [myRole, setMyRole] = useState<1 | 2 | null>(null);
  const [lang, setLang] = useState<Language>('zh');
  
  const [p1Image, setP1Image] = useState<string>('');
  const [p2Image, setP2Image] = useState<string>('');
  const [p1Strokes, setP1Strokes] = useState<Stroke[]>([]);
  const [p2Strokes, setP2Strokes] = useState<Stroke[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const pollingRef = useRef<boolean>(false);
  const lastUpdateRef = useRef<number>(0);
  // Use refs to track latest state for polling callback
  const myRoleRef = useRef<1 | 2 | null>(null);
  const hasP1StrokesRef = useRef<boolean>(false);
  const hasP2StrokesRef = useRef<boolean>(false);

  const t = translations[lang];

  // Check URL for game ID on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gid = params.get('game');
    
    if (gid) {
      loadGame(gid);
    }
  }, []);

  // Load existing game
  const loadGame = async (gid: string) => {
    try {
      setIsLoading(true);
      const game = await getGame(gid);
      setGameId(game.id);
      setTopic(game.topic);
      setGameMode(GameMode.ONLINE);
      lastUpdateRef.current = game.updatedAt;
      
      // Check if I was previously assigned a role for this game
      const savedRole = loadMyRole(gid);
      
      if (game.p1Strokes) {
        setP1Strokes(game.p1Strokes);
        setP1Image(renderStrokesToDataUrl(game.p1Strokes, CANVAS_WIDTH, HALF_HEIGHT));
        hasP1StrokesRef.current = true;
      }
      if (game.p2Strokes) {
        setP2Strokes(game.p2Strokes);
        setP2Image(renderStrokesToDataUrl(game.p2Strokes, CANVAS_WIDTH, HALF_HEIGHT));
        hasP2StrokesRef.current = true;
      }
      
      if (game.p1Strokes && game.p2Strokes) {
        // Both done - show result (anyone can view)
        setStage(GameStage.RESULT);
      } else if (savedRole === 1) {
        // I'm Player 1 (creator) - check what I need to do
        setMyRole(1);
        myRoleRef.current = 1;
        if (game.p1Strokes) {
          // I already drew, waiting for P2
          setStage(GameStage.WAITING_FOR_OTHER);
          startPolling(gid);
        } else {
          // I haven't drawn yet
          setStage(GameStage.P1_DRAW);
        }
      } else if (savedRole === 2) {
        // I'm Player 2 - check what I need to do
        setMyRole(2);
        myRoleRef.current = 2;
        if (game.p2Strokes) {
          // I already drew, waiting for P1
          setStage(GameStage.WAITING_FOR_OTHER);
          startPolling(gid);
        } else if (game.p1Strokes) {
          // P1 done, my turn
          setStage(GameStage.P2_DRAW);
        } else {
          // P1 not done yet, wait
          setStage(GameStage.WAITING_FOR_OTHER);
          startPolling(gid);
        }
      } else {
        // No saved role - I'm a new Player 2 joining
        setMyRole(2);
        myRoleRef.current = 2;
        saveMyRole(gid, 2);
        if (game.p1Strokes) {
          // P1 done, my turn to draw
          setStage(GameStage.P2_DRAW);
        } else {
          // P1 not done yet, wait
          setStage(GameStage.WAITING_FOR_OTHER);
          startPolling(gid);
        }
      }
      
      setIsLoading(false);
    } catch (e) {
      setError(lang === 'zh' ? '游戏不存在或已过期' : 'Game not found or expired');
      setIsLoading(false);
    }
  };

  // Start polling for updates
  const startPolling = (gid: string) => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    
    const poll = async () => {
      if (!pollingRef.current) return;
      
      try {
        const game = await pollGame(gid, lastUpdateRef.current);
        lastUpdateRef.current = game.updatedAt;
        
        // Use refs to check current state (not stale closure values)
        if (game.p1Strokes && !hasP1StrokesRef.current) {
          setP1Strokes(game.p1Strokes);
          setP1Image(renderStrokesToDataUrl(game.p1Strokes, CANVAS_WIDTH, HALF_HEIGHT));
          hasP1StrokesRef.current = true;
        }
        if (game.p2Strokes && !hasP2StrokesRef.current) {
          setP2Strokes(game.p2Strokes);
          setP2Image(renderStrokesToDataUrl(game.p2Strokes, CANVAS_WIDTH, HALF_HEIGHT));
          hasP2StrokesRef.current = true;
        }
        
        if (game.p1Strokes && game.p2Strokes) {
          // Both done - show result!
          pollingRef.current = false;
          setStage(GameStage.RESULT);
        } else if (game.p1Strokes && myRoleRef.current === 2 && !hasP2StrokesRef.current) {
          // P1 just finished, I'm P2 and haven't drawn yet - start drawing
          pollingRef.current = false;
          setStage(GameStage.P2_DRAW);
        } else if (pollingRef.current) {
          // Continue polling
          setTimeout(poll, 2000);
        }
      } catch (e) {
        if (pollingRef.current) {
          setTimeout(poll, 5000); // Retry slower on error
        }
      }
    };
    
    poll();
  };

  // Stop polling
  const stopPolling = () => {
    pollingRef.current = false;
  };

  useEffect(() => {
    return () => stopPolling();
  }, []);

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
      
      if (mode === GameMode.ONLINE) {
        // Create game on server
        const { gameId: newGameId } = await createGame(newTopic);
        setGameId(newGameId);
        setMyRole(1);
        myRoleRef.current = 1;
        
        // Save role to localStorage so we remember after refresh
        saveMyRole(newGameId, 1);
        
        // Update URL
        window.history.pushState({}, '', `?game=${newGameId}`);
      }
      
      setIsLoading(false);
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
    hasP1StrokesRef.current = true;
    
    if (gameMode === GameMode.ONLINE) {
      try {
        await submitDrawing(gameId, 1, strokes);
        setStage(GameStage.WAITING_FOR_OTHER);
        startPolling(gameId);
      } catch (e) {
        setError(lang === 'zh' ? '提交失败，请重试' : 'Submit failed, please retry');
      }
    } else if (gameMode === GameMode.LOCAL) {
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

  const handleP2Confirm = async (dataUrl: string, strokes: Stroke[]) => {
    setP2Image(dataUrl);
    setP2Strokes(strokes);
    hasP2StrokesRef.current = true;
    
    if (gameMode === GameMode.ONLINE) {
      try {
        stopPolling();
        const game = await submitDrawing(gameId, 2, strokes);
        
        // Make sure we have P1 image
        if (game.p1Strokes && !hasP1StrokesRef.current) {
          setP1Strokes(game.p1Strokes);
          setP1Image(renderStrokesToDataUrl(game.p1Strokes, CANVAS_WIDTH, HALF_HEIGHT));
          hasP1StrokesRef.current = true;
        }
        
        setStage(GameStage.RESULT);
      } catch (e) {
        setError(lang === 'zh' ? '提交失败，请重试' : 'Submit failed, please retry');
      }
    } else {
      // Local/AI mode
      if (!p1Image && p1Strokes.length > 0) {
        setP1Image(renderStrokesToDataUrl(p1Strokes, CANVAS_WIDTH, HALF_HEIGHT));
      }
      setStage(GameStage.RESULT);
    }
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
    stopPolling();
    clearMyRole();
    window.history.pushState({}, '', window.location.pathname);
    
    setStage(GameStage.MENU);
    setTopic('');
    setGameId('');
    setMyRole(null);
    setP1Image('');
    setP2Image('');
    setP1Strokes([]);
    setP2Strokes([]);
    setError(null);
    lastUpdateRef.current = 0;
    myRoleRef.current = null;
    hasP1StrokesRef.current = false;
    hasP2StrokesRef.current = false;
  };

  const getShareUrl = () => {
    return `${window.location.origin}${window.location.pathname}?game=${gameId}`;
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
          
          {/* Show game ID for online mode */}
          {gameMode === GameMode.ONLINE && gameId && (
            <div className="mt-6 bg-indigo-50 px-6 py-3 rounded-xl">
              <p className="text-sm text-indigo-600">
                {lang === 'zh' ? '房间号：' : 'Room: '}
                <span className="font-mono font-bold text-lg">{gameId}</span>
              </p>
            </div>
          )}
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

    // Local mode
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

  // Cute waiting animation
  const renderWaiting = () => {
    const shareUrl = getShareUrl();
    const isP1 = myRole === 1;
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in text-center px-6">
        {/* Cute animated illustration */}
        <div className="relative mb-8">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full flex items-center justify-center shadow-lg animate-bounce">
              <Pencil size={40} className="text-white transform -rotate-45" />
            </div>
            {/* Floating elements */}
            <div className="absolute -top-2 -right-2 animate-ping">
              <Sparkles size={20} className="text-yellow-400" />
            </div>
            <div className="absolute -bottom-1 -left-3 animate-pulse">
              <Sparkles size={16} className="text-pink-400" />
            </div>
            <div className="absolute top-0 -left-4 animate-bounce" style={{ animationDelay: '0.5s' }}>
              <div className="text-2xl">✨</div>
            </div>
            <div className="absolute -top-4 right-0 animate-bounce" style={{ animationDelay: '0.3s' }}>
              <div className="text-xl">🎨</div>
            </div>
          </div>
          
          {/* Animated dots */}
          <div className="flex justify-center gap-2 mt-4">
            <div className="w-3 h-3 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
        
        <h3 className="text-2xl font-bold text-slate-800 mb-2">
          {isP1 
            ? (lang === 'zh' ? '等待好友来画...' : 'Waiting for friend...')
            : (lang === 'zh' ? '等待玩家1画完...' : 'Waiting for Player 1...')}
        </h3>
        
        <p className="text-slate-500 mb-6 max-w-xs">
          {isP1
            ? (lang === 'zh' ? '把链接发给好友，TA画完后你们都能看到结果！' : 'Send the link to your friend. You will both see the result when done!')
            : (lang === 'zh' ? '玩家1还在画，画完后你就可以开始了~' : 'Player 1 is still drawing. You can start when they finish!')}
        </p>
        
        {/* Topic display */}
        <div className="bg-white rounded-xl p-4 border-2 border-indigo-100 mb-6 w-full max-w-sm shadow-sm">
          <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
            {t.topicLabel}
          </div>
          <div className="text-2xl font-bold text-indigo-600">
            {topic}
          </div>
          <div className="mt-2 text-sm text-slate-400">
            {lang === 'zh' ? '房间号：' : 'Room: '}
            <span className="font-mono font-bold text-indigo-500">{gameId}</span>
          </div>
        </div>
        
        {/* Share link - only show for P1 */}
        {isP1 && (
          <div className="w-full max-w-sm bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-2xl border border-indigo-100">
            <p className="text-sm text-indigo-700 font-semibold mb-3 flex items-center justify-center gap-2">
              <Share2 size={16} />
              {lang === 'zh' ? '发送给好友' : 'Send to friend'}
            </p>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                value={shareUrl} 
                readOnly 
                className="flex-1 text-xs text-slate-600 bg-white p-3 rounded-xl border border-indigo-200 outline-none"
              />
              <button 
                onClick={() => copyToClipboard(shareUrl)}
                className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-md"
              >
                <Copy size={18} />
              </button>
            </div>
          </div>
        )}
        
        {/* Auto-refresh notice */}
        <div className="mt-6 flex items-center gap-2 text-sm text-slate-400">
          <Loader2 size={14} className="animate-spin" />
          <span>{lang === 'zh' ? '自动刷新中...' : 'Auto-refreshing...'}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
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
        
        {stage === GameStage.WAITING_FOR_OTHER && renderWaiting()}

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
                             value={getShareUrl()} 
                             readOnly 
                             className="w-full text-xs text-slate-500 bg-transparent outline-none"
                           />
                           <button 
                             onClick={() => copyToClipboard(getShareUrl())}
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
