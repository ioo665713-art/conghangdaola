import React from 'react';
import { RankItem, TierLevel } from '../types';
import { TIERS_CONFIG } from '../constants';

interface DraggableItemProps {
  item: RankItem;
  variant?: 'pool' | 'ranked';
  showStats?: boolean;
}

export const DraggableItem: React.FC<DraggableItemProps> = ({ item, variant = 'pool', showStats = false }) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", item.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const isRanked = variant === 'ranked';

  // Helper to get color for a specific tier level
  const getTierColor = (tierId: string) => {
    const config = TIERS_CONFIG.find(t => t.id === tierId);
    // Extracting the bg color class part roughly or mapping it. 
    // Simplified mapping for the bar chart colors:
    switch (tierId) {
      case '夯爆了': return '#ef4444'; // red-500
      case '顶尖': return '#f97316'; // orange-500
      case '人上人': return '#eab308'; // yellow-500
      case '一般': return '#22c55e'; // green-500
      case '拉完了': return '#64748b'; // slate-500
      default: return '#ccc';
    }
  };

  // Find dominant tier for tooltip
  let dominantTier = { tier: '', percent: 0 };
  if (item.stats) {
    Object.entries(item.stats).forEach(([tier, value]) => {
      if (tier === 'totalVotes') return;
      // Cast value to number as Object.entries value inference can be unknown/any
      const count = value as number;
      const percent = Math.round((count / item.stats!.totalVotes) * 100);
      if (percent > dominantTier.percent) {
        dominantTier = { tier, percent };
      }
    });
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`
        relative group
        cursor-grab active:cursor-grabbing 
        rounded-xl select-none transition-all duration-200
        flex flex-col items-center justify-center text-center
        ${isRanked 
          ? 'bg-white text-gray-900 shadow-xl border-2 border-white px-6 py-4 text-xl md:text-2xl min-w-[120px] font-bold transform hover:scale-110 hover:z-50 hover:rotate-2' 
          : 'bg-gray-100 text-gray-800 shadow-md hover:shadow-xl border-2 border-gray-200 px-5 py-3 text-lg font-bold hover:scale-105 hover:bg-white hover:border-indigo-300'
        }
      `}
    >
      <span className="z-10 relative">{item.content}</span>

      {/* Stats Bar */}
      {showStats && item.stats && (
        <div className="w-full mt-2 h-1.5 flex rounded-full overflow-hidden opacity-90">
          {Object.values(TierLevel).map((tier) => {
            const count = item.stats![tier];
            const percent = (count / item.stats!.totalVotes) * 100;
            return (
              <div 
                key={tier}
                style={{ width: `${percent}%`, backgroundColor: getTierColor(tier) }}
                className="h-full"
              />
            );
          })}
        </div>
      )}

      {/* Tooltip on Hover when Stats enabled */}
      {showStats && item.stats && (
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
          大众票选: {dominantTier.tier} ({dominantTier.percent}%)
        </div>
      )}
    </div>
  );
};