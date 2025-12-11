import React, { useRef, useEffect, useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { Stroke } from '../types';

interface DrawingCanvasProps {
  partName: string;
  topic: string;
  onConfirm: (dataUrl: string, strokes: Stroke[]) => void;
  height: number;
  width: number;
  isLowerHalf?: boolean;
  labels: {
    clear: string;
    done: string;
    instruction: string;
  };
}

// Color palette
const COLORS = [
  { name: 'black', hex: '#000000' },
  { name: 'red', hex: '#EF4444' },
  { name: 'orange', hex: '#F97316' },
  { name: 'yellow', hex: '#EAB308' },
  { name: 'green', hex: '#22C55E' },
  { name: 'blue', hex: '#3B82F6' },
  { name: 'purple', hex: '#A855F7' },
  { name: 'pink', hex: '#EC4899' },
  { name: 'brown', hex: '#92400E' },
];

// Get color from stroke (first element is negative color index, or default to black)
const getStrokeColor = (stroke: Stroke): string => {
  if (stroke.length > 0 && stroke[0] < 0) {
    const colorIndex = Math.abs(stroke[0]) - 1;
    return COLORS[colorIndex]?.hex || COLORS[0].hex;
  }
  return COLORS[0].hex; // Default black for old strokes
};

// Get points from stroke (skip color index if present)
const getStrokePoints = (stroke: Stroke): number[] => {
  if (stroke.length > 0 && stroke[0] < 0) {
    return stroke.slice(1);
  }
  return stroke;
};

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
    
    strokes.forEach(stroke => {
      const points = getStrokePoints(stroke);
      if (points.length < 2) return;
      
      ctx.strokeStyle = getStrokeColor(stroke);
      ctx.beginPath();
      ctx.moveTo(points[0], points[1]);
      for (let i = 2; i < points.length; i += 2) {
        ctx.lineTo(points[i], points[i+1]);
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
  const [selectedColor, setSelectedColor] = useState(0); // Index into COLORS
  const lastPointRef = useRef<{x: number, y: number} | null>(null);
  
  // Setup canvas context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 6;
      ctx.strokeStyle = COLORS[selectedColor].hex;
    }
  }, [height, width]);

  // Update stroke color when selection changes
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = COLORS[selectedColor].hex;
    }
  }, [selectedColor]);

  // Redraw all strokes (needed after clear or when canvas resets)
  const redrawStrokes = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    strokes.forEach(stroke => {
      const points = getStrokePoints(stroke);
      if (points.length < 2) return;
      
      ctx.strokeStyle = getStrokeColor(stroke);
      ctx.beginPath();
      ctx.moveTo(points[0], points[1]);
      for (let i = 2; i < points.length; i += 2) {
        ctx.lineTo(points[i], points[i+1]);
      }
      ctx.stroke();
    });
    
    // Reset to current selected color
    ctx.strokeStyle = COLORS[selectedColor].hex;
  };

  const getCoordinates = (event: React.MouseEvent | React.TouchEvent) => {
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

    return {
      x: Math.round(clientX - rect.left),
      y: Math.round(clientY - rect.top)
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      // Store color index as negative number at start of stroke
      setCurrentStroke([-(selectedColor + 1), x, y]);
      lastPointRef.current = { x, y };
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;

    const { x, y } = getCoordinates(e);

    if (lastPointRef.current) {
      const distSq = (x - lastPointRef.current.x) ** 2 + (y - lastPointRef.current.y) ** 2;
      if (distSq < 16) return;
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
    
    if (currentStroke.length > 1) {
      setStrokes(prev => [...prev, currentStroke]);
      setCurrentStroke([]);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
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

      {/* Color Palette */}
      <div className="w-full bg-white px-4 py-2 flex justify-center gap-2 border-b border-gray-100">
        {COLORS.map((color, index) => (
          <button
            key={color.name}
            onClick={() => setSelectedColor(index)}
            className={`w-8 h-8 rounded-full transition-all ${
              selectedColor === index 
                ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' 
                : 'hover:scale-105'
            }`}
            style={{ backgroundColor: color.hex }}
            aria-label={color.name}
          />
        ))}
      </div>

      {/* Canvas Container */}
      <div className="relative bg-white shadow-xl w-full overflow-hidden" style={{ height: height }}>
        
        {/* Helper dashed line */}
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
