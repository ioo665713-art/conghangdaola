import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Dices, 
  RotateCcw, 
  Camera, 
  Menu,
  Globe
} from 'lucide-react';
import { 
  RankItem, 
  TierLevel, 
  CategoryData, 
  GameState,
  TierStats
} from './types';
import { STATIC_CATEGORIES, TIERS_CONFIG, CATEGORY_NAMES } from './constants';
import { DroppableZone } from './components/DroppableZone';
import { generateCategoryItems } from './services/geminiService';

// Helper to create initial empty state
const createInitialState = (): GameState => ({
  [TierLevel.S]: [],
  [TierLevel.A]: [],
  [TierLevel.B]: [],
  [TierLevel.C]: [],
  [TierLevel.D]: [],
});

// Helper to generate mock community stats
const generateMockStats = (): TierStats => {
  const totalVotes = Math.floor(Math.random() * 500) + 100; // 100-600 votes
  
  // Randomly bias towards one tier to make it look realistic
  const tiers = Object.values(TierLevel);
  const biasTier = tiers[Math.floor(Math.random() * tiers.length)];
  
  let remaining = totalVotes;
  const stats: any = { totalVotes };

  tiers.forEach((tier, index) => {
    if (index === tiers.length - 1) {
      stats[tier] = remaining;
    } else {
      // If it's the bias tier, give it a larger chunk
      let max = remaining;
      if (tier === biasTier) {
        const chunk = Math.floor(remaining * 0.6); // 60% of remaining
        stats[tier] = chunk;
      } else {
        const chunk = Math.floor(Math.random() * (remaining * 0.4));
        stats[tier] = chunk;
      }
      remaining -= stats[tier];
    }
  });

  return stats as TierStats;
};

// Declare html2canvas on window
declare global {
  interface Window {
    html2canvas: any;
  }
}

export default function App() {
  // State
  const [currentCategory, setCurrentCategory] = useState<CategoryData>(STATIC_CATEGORIES[0]);
  const [rankedItems, setRankedItems] = useState<GameState>(createInitialState());
  const [poolItems, setPoolItems] = useState<RankItem[]>([]);
  const [playedCategories, setPlayedCategories] = useState<Set<string>>(new Set([STATIC_CATEGORIES[0].id]));
  const [isGenerating, setIsGenerating] = useState(false);
  const [showMobilePool, setShowMobilePool] = useState(false);
  const [showStats, setShowStats] = useState(false);
  
  // New States for Save
  const [isSaving, setIsSaving] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  // Initialize Items when category changes
  useEffect(() => {
    const newItems: RankItem[] = currentCategory.items.map((text, idx) => ({
      id: `${currentCategory.id}-${idx}-${text}`,
      content: text,
      category: currentCategory.id,
      stats: generateMockStats()
    }));
    setPoolItems(newItems);
    setRankedItems(createInitialState());
    setPlayedCategories(prev => new Set(prev).add(currentCategory.id));
    setShowStats(false);
  }, [currentCategory]);

  // Handle Drag & Drop Logic
  const handleDrop = useCallback((itemId: string, targetContainer: string) => {
    // Helper to find item and remove it from its source
    let item: RankItem | undefined;
    let source: string | undefined;

    // Check Pool
    const poolIndex = poolItems.findIndex(i => i.id === itemId);
    if (poolIndex !== -1) {
      item = poolItems[poolIndex];
      source = 'POOL';
      // Optimistic update for pool removal
      setPoolItems(prev => prev.filter(i => i.id !== itemId));
    } else {
      // Check Ranks
      for (const tier of Object.values(TierLevel)) {
        const rankIndex = rankedItems[tier].findIndex(i => i.id === itemId);
        if (rankIndex !== -1) {
          item = rankedItems[tier][rankIndex];
          source = tier;
          // Optimistic update for rank removal
          setRankedItems(prev => ({
            ...prev,
            [tier]: prev[tier].filter(i => i.id !== itemId)
          }));
          break;
        }
      }
    }

    if (!item) return;

    // Add to Target
    if (targetContainer === 'POOL') {
      setPoolItems(prev => [...prev, item!]);
    } else {
      const tier = targetContainer as TierLevel;
      setRankedItems(prev => ({
        ...prev,
        [tier]: [...prev[tier], item!]
      }));
    }
  }, [poolItems, rankedItems]);

  // Feature: Random Next Category
  const handleRandomNext = async () => {
    // 1. Try to find a static category not played yet
    const availableStatic = STATIC_CATEGORIES.filter(c => !playedCategories.has(c.id));
    
    if (availableStatic.length > 0) {
      const randomCat = availableStatic[Math.floor(Math.random() * availableStatic.length)];
      setCurrentCategory(randomCat);
    } else {
      // 2. If all static played, pick a random name from the massive list
      const availableNames = CATEGORY_NAMES.filter(name => 
        !STATIC_CATEGORIES.some(sc => sc.name === name)
      );
      
      // If truly empty (unlikely with 60+), reset played
      const finalNames = availableNames.length > 0 ? availableNames : CATEGORY_NAMES;
      const randomName = finalNames[Math.floor(Math.random() * finalNames.length)] || "Random Stuff";
      
      // Try local fallback immediately if we want to avoid API wait
      setIsGenerating(true);
      
      const generatedItems = await generateCategoryItems(randomName);
      setIsGenerating(false);

      if (generatedItems.length > 0) {
         const newCat: CategoryData = {
           id: `gen-${Date.now()}`,
           name: randomName,
           items: generatedItems
         };
         setCurrentCategory(newCat);
      } else {
         const mockItems = Array.from({ length: 16 }, (_, i) => `${randomName} ${i + 1}`);
         setCurrentCategory({
           id: `mock-${Date.now()}`,
           name: randomName,
           items: mockItems
         });
      }
    }
  };

  // Feature: Reset Current
  const handleReset = () => {
    const allItems: RankItem[] = [
      ...poolItems,
      ...Object.values(rankedItems).flat()
    ];
    setPoolItems(allItems);
    setRankedItems(createInitialState());
  };

  // Feature: Save as Image (Screenshot)
  const handleSave = async () => {
    if (!captureRef.current || isSaving) return;
    setIsSaving(true);
    
    try {
      if (typeof window.html2canvas === 'undefined') {
        alert("组件正在加载中，请稍后再试...");
        setIsSaving(false);
        return;
      }

      // Add a temporary title element to the capture area if needed, 
      // or just capture the whole container. 
      // Current captureRef points to the scrollable area.
      const canvas = await window.html2canvas(captureRef.current, {
        useCORS: true,
        backgroundColor: '#111827', // Dark background
        scale: 2, // Retina quality
        logging: false,
        onclone: (clonedDoc: Document) => {
            // Make sure the cloned element is fully visible (not scrolled)
            // html2canvas usually handles this if height is set to scrollHeight
            const element = clonedDoc.getElementById('capture-target');
            if(element) {
                element.style.height = 'auto';
                element.style.overflow = 'visible';
            }
        }
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = image;
      link.download = `从夯到拉-${currentCategory.name}.png`;
      link.click();
      
    } catch (error) {
      console.error("Save failed:", error);
      alert("保存图片失败，请重试");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-gray-100 flex justify-center font-sans overflow-hidden">
      
      {/* Centered Main Container */}
      <div className="w-full max-w-[1600px] flex flex-col md:flex-row h-screen bg-[#0a0a0a] shadow-2xl relative">
        
        {/* Mobile Header */}
        <div className="md:hidden h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 z-50 absolute top-0 left-0 right-0">
          <h1 className="font-bold text-lg text-yellow-500">从夯到拉</h1>
          <button 
            onClick={() => setShowMobilePool(!showMobilePool)}
            className="p-2 bg-gray-800 rounded-md text-white border border-gray-700"
          >
            {showMobilePool ? '看排名' : '待选池'} <Menu className="inline w-4 h-4 ml-1"/>
          </button>
        </div>

        {/* Main Ranking Area (Left/Top) */}
        <div className={`flex-1 flex flex-col h-full pt-16 md:pt-0 overflow-y-auto no-scrollbar transition-all ${showMobilePool ? 'hidden md:flex' : 'flex'}`}>
          
          {/* Header / Controls */}
          <div className="p-4 md:px-8 md:py-6 flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-900/80 backdrop-blur-md border-b border-gray-800 gap-4 sticky top-0 z-30">
            <div>
              <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 italic tracking-tighter transform -skew-x-6 pb-2">
                从夯到拉
              </h1>
              <h2 className="text-xl md:text-2xl font-bold mt-2 text-white flex items-center">
                <span className="text-gray-500 text-sm font-normal mr-3 uppercase tracking-widest">Category</span>
                {currentCategory.name}
              </h2>
            </div>

            <div className="flex flex-wrap gap-3">
              <button 
                  onClick={() => setShowStats(!showStats)} 
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all border ${
                    showStats 
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' 
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Globe className="w-5 h-5" />
                  {showStats ? '隐藏大众' : '大众排行'}
              </button>
              
              <button 
                onClick={handleRandomNext} 
                disabled={isGenerating}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-xl font-bold shadow-lg transition-transform active:scale-95 disabled:opacity-50 text-white"
              >
                <Dices className="w-5 h-5" />
                {isGenerating ? 'Loading...' : '随机下一个'}
              </button>
              <button 
                onClick={handleReset}
                className="p-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl transition-colors text-gray-300 hover:text-white"
                title="重置"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="p-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl transition-colors text-gray-300 hover:text-white disabled:opacity-50"
                title="保存图片"
              >
                <Camera className={`w-5 h-5 ${isSaving ? 'animate-pulse text-yellow-500' : ''}`} />
              </button>
            </div>
          </div>

          {/* The Tier Board - Capture Target */}
          {/* We add an ID for html2canvas to find and a ref */}
          <div 
            ref={captureRef} 
            id="capture-target"
            className="flex-1 p-2 md:p-8 space-y-3 min-h-0 overflow-y-auto pb-20 bg-[#0a0a0a]"
          >
             {/* Hidden Title for Screenshot Context */}
             <div className="hidden md:hidden mb-6 text-center" style={{ display: isSaving ? 'block' : 'none' }}>
                <h1 className="text-4xl font-black text-white italic">从夯到拉: {currentCategory.name}</h1>
             </div>

            {TIERS_CONFIG.map((tier) => (
              <DroppableZone
                key={tier.id}
                id={tier.id}
                title={tier.id}
                emoji={tier.emoji}
                color={tier.color}
                textColor={tier.textColor}
                items={rankedItems[tier.id]}
                onDrop={handleDrop}
                showStats={showStats}
                className="shadow-2xl rounded-lg overflow-hidden border-2 border-transparent hover:border-gray-800 transition-colors"
              />
            ))}
            
            <div className="mt-8 text-center text-gray-700 text-sm font-mono uppercase tracking-widest opacity-50">
               RankMaster • 仅供娱乐
            </div>
          </div>
        </div>

        {/* Item Pool (Right/Bottom) */}
        <div className={`
          md:w-[400px] lg:w-[450px] bg-[#1a1a1a] border-l border-gray-800 flex flex-col shadow-2xl z-40
          ${showMobilePool ? 'fixed inset-0 top-16 z-50' : 'hidden md:flex'}
        `}>
          <div className="p-5 bg-gray-800/90 backdrop-blur border-b border-gray-700 shadow-lg z-10">
            <h3 className="font-bold text-xl text-gray-100 flex items-center gap-3">
              待选池 
              <span className="bg-gray-900 text-gray-300 text-sm px-3 py-1 rounded-full font-mono">{poolItems.length}</span>
            </h3>
            <p className="text-sm text-gray-500 mt-2">将下方的卡片拖拽到左侧进行排名</p>
          </div>
          
          <div className="flex-1 bg-pattern-grid overflow-hidden relative">
            <DroppableZone
              id="POOL"
              isPool={true}
              items={poolItems}
              onDrop={handleDrop}
              showStats={showStats}
              className="h-full"
            />
            {/* Fade effect at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#1a1a1a] to-transparent pointer-events-none"></div>
          </div>

          {/* Mobile close button for pool */}
          <div className="md:hidden p-4 bg-gray-800 border-t border-gray-700">
             <button 
               onClick={() => setShowMobilePool(false)}
               className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg active:scale-95 transition-transform"
             >
               返回排名
             </button>
          </div>
        </div>
      </div>

      {/* Global Styles for Print/Save */}
      <style>{`
        /* Subtle Grid Pattern */
        .bg-pattern-grid {
          background-image: radial-gradient(#333 1px, transparent 1px);
          background-size: 24px 24px;
        }
      `}</style>
    </div>
  );
}
