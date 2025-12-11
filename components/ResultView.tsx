import React from 'react';
import { Share2, RotateCcw, Download } from 'lucide-react';

interface ResultViewProps {
  topImage: string;
  bottomImage: string;
  topic: string;
  onPlayAgain: () => void;
}

const ResultView: React.FC<ResultViewProps> = ({ topImage, bottomImage, topic, onPlayAgain }) => {
  
  const handleDownload = () => {
    // Create a temporary canvas to merge images
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img1 = new Image();
    const img2 = new Image();
    
    // Assume standard size 
    const WIDTH = 600; 
    const HEIGHT = 800;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    // Fill white background
    if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }

    img1.onload = () => {
        ctx?.drawImage(img1, 0, 0, WIDTH, HEIGHT/2);
        img2.src = bottomImage;
    };

    img2.onload = () => {
        ctx?.drawImage(img2, 0, HEIGHT/2, WIDTH, HEIGHT/2);
        // Trigger download
        const link = document.createElement('a');
        link.download = `duodraw-${topic.replace(/\s+/g, '-').toLowerCase()}.png`;
        link.href = canvas.toDataURL();
        link.click();
    };

    img1.src = topImage;
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto animate-fade-in">
      
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
           {/* We use a generic excitement or topic display here. 
               Since translation state is in App, we might just show the Topic clearly. 
               The 'Masterpiece' text was hardcoded. 
               Let's just keep it simple or allow App to pass children/title.
               For now, keeping it English/Simple or removing text dependencies?
               Actually, I'll just change "Masterpiece!" to a visual icon or remove it to rely on the image, 
               OR since I can't easily pass props without changing interface everywhere, 
               I will assume the user is okay with "Masterpiece" or I can try to detect language? 
               No, let's just make it visually appealing without strong language dependency or use a universal emoji. */}
           ✨ DuoDraw ✨
        </h2>
        <p className="text-slate-500 font-medium mt-1">{topic}</p>
      </div>

      <div className="relative w-full shadow-2xl rounded-lg overflow-hidden border-4 border-white bg-white">
        {/* Top Half */}
        <div className="w-full h-64 sm:h-80 bg-white relative overflow-hidden">
            <img 
                src={topImage} 
                alt="Top Half" 
                className="w-full h-full object-contain object-bottom" 
            />
            <div className="absolute bottom-0 left-0 w-full border-b-2 border-dashed border-gray-200 opacity-50"></div>
        </div>

        {/* Bottom Half */}
        <div className="w-full h-64 sm:h-80 bg-white relative overflow-hidden">
             <img 
                src={bottomImage} 
                alt="Bottom Half" 
                className="w-full h-full object-contain object-top" 
            />
        </div>
      </div>

      <div className="flex gap-4 mt-8 w-full px-4">
        <button 
          onClick={onPlayAgain}
          className="flex-1 py-3 bg-white text-indigo-600 font-bold rounded-xl border border-indigo-100 shadow-sm hover:bg-indigo-50 transition-colors flex justify-center items-center gap-2"
        >
          <RotateCcw size={18} />
        </button>
        <button 
          onClick={handleDownload}
          className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 flex justify-center items-center gap-2"
        >
          <Download size={18} />
        </button>
      </div>
    </div>
  );
};

export default ResultView;
