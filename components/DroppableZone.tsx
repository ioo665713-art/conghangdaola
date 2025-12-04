import React from 'react';
import { RankItem } from '../types';
import { DraggableItem } from './DraggableItem';

interface DroppableZoneProps {
  id: string; // Could be a TierLevel or 'POOL'
  items: RankItem[];
  color?: string;
  textColor?: string;
  title?: string;
  emoji?: string;
  className?: string;
  isPool?: boolean;
  onDrop: (itemId: string, targetContainer: string) => void;
  showStats?: boolean;
}

export const DroppableZone: React.FC<DroppableZoneProps> = ({
  id,
  items,
  color = 'bg-gray-800',
  textColor = 'text-white',
  title,
  emoji,
  className = '',
  isPool = false,
  onDrop,
  showStats = false,
}) => {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("text/plain");
    if (itemId) {
      onDrop(itemId, id);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative transition-all duration-200 ${className} ${
        isPool 
          ? 'h-full flex flex-wrap content-start gap-3 p-5 overflow-y-auto no-scrollbar' 
          : 'flex flex-row items-stretch min-h-[140px] bg-gray-800/30'
      }`}
    >
      {/* Label for Tiers */}
      {!isPool && (
        <div className={`w-28 md:w-40 flex-shrink-0 flex flex-col items-center justify-center self-stretch ${color} ${textColor} p-4 font-black text-center z-10 border-r-4 border-black/20`}>
          <span className="text-4xl md:text-5xl mb-2 drop-shadow-md transform hover:scale-110 transition-transform cursor-default">{emoji}</span>
          <span className="text-lg md:text-xl uppercase tracking-wider drop-shadow-sm">{title}</span>
        </div>
      )}

      {/* Items Container */}
      <div className={`flex-1 flex flex-wrap content-center gap-3 p-4 ${!isPool ? '' : ''}`}>
        {items.map((item) => (
          <DraggableItem 
            key={item.id} 
            item={item} 
            variant={isPool ? 'pool' : 'ranked'}
            showStats={showStats}
          />
        ))}
        {items.length === 0 && !isPool && (
          <div className="w-full h-full absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <span className="text-4xl md:text-6xl font-black uppercase tracking-widest text-white transform -rotate-3">
              {title}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};