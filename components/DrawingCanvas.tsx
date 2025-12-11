import React, { useRef, useEffect, useState, useCallback } from 'react';
import { RefreshCw, Check, Undo, Trash2 } from 'lucide-react';
import { Stroke } from '../types';

interface DrawingCanvasProps {
  partName: string; // e.g., "Upper Part" or "Lower Part"
  topic: string;
  onConfirm: (dataUrl: string, strokes: Stroke[]) => void;
  height: number;
  width: number;
  isLowerHalf?: boolean; // If true, we might want to show a guide or adjust styling
  labels: {
    clear: string;
    done: string;
    instruction: string;
  };
}

export const renderStrokesToDataUrl = (strokes: Stroke[], width: number, height: number): string => {
  const canvas = document.createElement('canvas');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#000000';
    
    strokes.forEach(stroke => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0], stroke[1]);
      for (let i = 2; i < stroke.length; i += 2) {
        ctx.lineTo(stroke[i], stroke[i+1]);
      }
      ctx.stroke();
    });
  }
  return canvas.toDataURL();
};

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ 
  partName, 
  topic, 
  onConfirm,
  height,
  width,
  isLowerHalf = false,
  labels
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke>([]);
  const lastPointRef = useRef<{x: number, y: number} | null>(null);
  
  // Setup canvas context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#000000';
    }
  }, [height, width]);

  const getCoordinates = (event: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in event) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = (event as React.MouseEvent).clientX;
      clientY = (event as React.MouseEvent).clientY;
    }

    // Return integer coords for better compression
    return {
      x: Math.round(clientX - rect.left),
      y: Math.round(clientY - rect.top)
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); // Prevent scrolling
    setIsDrawing(true);
    
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      setCurrentStroke([x, y]);
      lastPointRef.current = { x, y };
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); // Prevent scrolling
    if (!isDrawing) return;

    const { x, y } = getCoordinates(e);

    // Optimization: Drop points that are too close (saves ~50-70% data size)
    if (lastPointRef.current) {
        const distSq = (x - lastPointRef.current.x) ** 2 + (y - lastPointRef.current.y) ** 2;
        if (distSq < 16) return; // Skip if moved less than 4 pixels
    }

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
      
      setCurrentStroke(prev => [...prev, x, y]);
      lastPointRef.current = { x, y };
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPointRef.current = null;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.closePath();
    }
    
    if (currentStroke.length > 0) {
      setStrokes(prev => [...prev, currentStroke]);
      setCurrentStroke([]);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setStrokes([]);
      setCurrentStroke([]);
    }
  };

  const handleConfirm = () => {
    if (canvasRef.current) {
      onConfirm(canvasRef.current.toDataURL(), strokes);
    }
  };

  const hasDrawn = strokes.length > 0 || isDrawing;

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      {/* Header Info */}
      <div className="w-full bg-white rounded-t-xl p-4 shadow-sm border-b border-indigo-100 flex flex-col items-center animate-fade-in">
         <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
           {partName}
         </div>
         <div className="text-xl font-bold text-slate-800">
           {topic}
         </div>
         <div className="text-sm text-slate-500 mt-1">
           {labels.instruction}
         </div>
      </div>

      {/* Canvas Container */}
      <div className="relative bg-white shadow-xl w-full overflow-hidden" style={{ height: height }}>
        
        {/* Helper dashed line to indicate connection point */}
        <div className={`absolute left-0 w-full border-b-2 border-dashed border-gray-200 pointer-events-none 
          ${isLowerHalf ? 'top-0' : 'bottom-0'}`} 
        />
        
        <canvas
          ref={canvasRef}
          className="touch-none cursor-crosshair w-full h-full block"
          style={{ width: width, height: height }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      {/* Controls */}
      <div className="w-full bg-indigo-50 p-4 rounded-b-xl flex justify-between items-center gap-4">
        <button 
          onClick={clearCanvas}
          className="p-3 text-red-500 hover:bg-red-100 rounded-full transition-colors"
          aria-label={labels.clear}
        >
          <Trash2 size={24} />
        </button>
        
        <button
          onClick={handleConfirm}
          disabled={!hasDrawn}
          className={`flex-1 py-3 px-6 rounded-full font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95
            ${hasDrawn 
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:shadow-indigo-500/30' 
              : 'bg-gray-300 cursor-not-allowed'}`}
        >
          <Check size={20} />
          {labels.done}
        </button>
      </div>
    </div>
  );
};

export default DrawingCanvas;
