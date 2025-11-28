import React, { useRef } from 'react';
import { Upload } from 'lucide-react';

interface UploadZoneProps {
  onFilesSelected: (files: FileList | null) => void;
  isCompact?: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onFilesSelected, isCompact }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onFilesSelected(e.dataTransfer.files);
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className={`
        relative border-2 border-dashed border-slate-300 rounded-2xl 
        flex flex-col items-center justify-center text-center 
        cursor-pointer hover:border-brand-500 hover:bg-brand-50/50 
        transition-all group bg-white
        ${isCompact ? 'py-8' : 'py-16'}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => onFilesSelected(e.target.files)}
      />
      
      <div className="bg-slate-50 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
        <Upload className="w-8 h-8 text-slate-400 group-hover:text-brand-500" />
      </div>
      
      <h3 className="text-lg font-medium text-slate-700 mb-1">
        Haz clic para subir o arrastra y suelta
      </h3>
      <p className="text-sm text-slate-400">
        PDF, Imágenes, Office (Word, Excel, PPT), Texto
      </p>
    </div>
  );
};
