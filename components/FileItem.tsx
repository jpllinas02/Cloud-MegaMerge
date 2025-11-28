import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, RotateCw, Trash2, ArrowUp, ArrowDown, FileText, Image as ImageIcon, FileSpreadsheet } from 'lucide-react';
import { DocFile } from '../types';
import { formatBytes } from '../utils';

interface FileItemProps {
  file: DocFile;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onRotate: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  isFirst: boolean;
  isLast: boolean;
  isAnyDragging: boolean;
}

export const FileItem: React.FC<FileItemProps> = ({
  file,
  isSelected,
  onToggleSelect,
  onRotate,
  onDelete,
  onMove,
  isFirst,
  isLast,
  isAnyDragging
}) => {
  const [isHoveringThumbnail, setIsHoveringThumbnail] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: file.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    scale: isDragging ? 1.05 : 1,
    zIndex: isDragging ? 50 : (isHoveringThumbnail ? 40 : 1),
    viewTransitionName: `item-${file.id}`
  };

  const getIcon = () => {
    if (file.type === 'office') return <FileSpreadsheet className="w-6 h-6 text-orange-500" />;
    if (file.type === 'image') return <ImageIcon className="w-6 h-6 text-purple-500" />;
    return <FileText className="w-6 h-6 text-red-500" />;
  };

  const renderThumbnail = () => {
    if (file.type === 'image' && file.previewUrl) {
      return (
        <div 
          className="relative group cursor-pointer flex-shrink-0"
          onMouseEnter={() => setIsHoveringThumbnail(true)}
          onMouseLeave={() => setIsHoveringThumbnail(false)}
        >
          <img 
            src={file.previewUrl} 
            alt="thumb" 
            className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded border border-slate-200 bg-white transition-transform duration-300 ease-out"
            style={{ transform: `rotate(${file.rotation}deg)` }}
          />
          {isHoveringThumbnail && !isDragging && !isAnyDragging && (
            <div className="absolute left-12 sm:left-14 top-1/2 -translate-y-1/2 z-50 w-48 sm:w-64 p-2 bg-white rounded-lg shadow-xl border border-slate-200 pointer-events-none animate-in fade-in zoom-in duration-200 hidden sm:block">
              <img 
                src={file.previewUrl} 
                className="w-full h-auto rounded transition-transform duration-300 ease-out"
                style={{ transform: `rotate(${file.rotation}deg)` }}
                alt="preview"
              />
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div className="w-10 h-10 sm:w-12 sm:h-12 flex flex-shrink-0 items-center justify-center bg-slate-100 rounded border border-slate-200">
        {getIcon()}
      </div>
    );
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative flex items-center gap-2 sm:gap-4 p-2 sm:p-3 bg-white border rounded-xl transition-colors duration-200
        ${isSelected ? 'border-brand-500 ring-1 ring-brand-500 bg-brand-50/10' : 'border-slate-200 hover:border-brand-300'}
        ${isDragging ? 'shadow-2xl ring-1 ring-brand-200' : 'hover:shadow-sm'}
      `}
    >
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <div 
          onClick={() => onToggleSelect(file.id)}
          className={`
            w-5 h-5 rounded border cursor-pointer flex items-center justify-center transition-colors flex-shrink-0
            ${isSelected ? 'bg-brand-700 border-brand-700' : 'border-slate-400 hover:border-brand-500'}
          `}
        >
          {isSelected && <div className="w-2.5 h-1.5 border-l-2 border-b-2 border-white rotate-[-45deg] mb-0.5" />}
        </div>
        
        <button {...attributes} {...listeners} className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing flex-shrink-0">
          <GripVertical className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex items-center gap-3 sm:gap-4 min-w-0 overflow-hidden">
        {renderThumbnail()}
        
        <div className="flex flex-col min-w-0">
          <span className="font-medium text-slate-700 truncate block text-sm sm:text-base" title={file.name}>
            {file.name}
          </span>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-medium bg-slate-100 text-slate-500 uppercase flex-shrink-0">
              {file.type}
            </span>
            <span className="text-[10px] sm:text-xs text-slate-400 flex-shrink-0">
              {formatBytes(file.size)}
            </span>
            {file.rotation > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-brand-600 font-medium bg-brand-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                <RotateCw className="w-3 h-3" />
                {file.rotation}°
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 border-l border-slate-100 pl-2 sm:pl-3 flex-shrink-0">
        <div className="flex flex-col gap-1 mr-1 sm:mr-2">
           <button 
             onClick={() => onMove(file.id, 'up')}
             disabled={isFirst}
             className="text-slate-400 hover:text-brand-600 disabled:opacity-30 disabled:hover:text-slate-400"
           >
             <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4" />
           </button>
           <button 
             onClick={() => onMove(file.id, 'down')}
             disabled={isLast}
             className="text-slate-400 hover:text-brand-600 disabled:opacity-30 disabled:hover:text-slate-400"
           >
             <ArrowDown className="w-3 h-3 sm:w-4 sm:h-4" />
           </button>
        </div>

        <button 
          onClick={() => onRotate(file.id)}
          className="p-1.5 sm:p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
          title="Rotar"
        >
          <RotateCw className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        <button 
          onClick={() => onDelete(file.id)}
          className="p-1.5 sm:p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Eliminar"
        >
          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </div>
  );
};