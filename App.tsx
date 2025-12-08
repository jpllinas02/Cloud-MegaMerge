import React, { useState } from 'react';
import { flushSync } from 'react-dom';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { RotateCw, Trash2, Layers, Download, HelpCircle, CheckSquare, FileText, Loader2, Settings } from 'lucide-react';
import { PDFDocument, degrees, StandardFonts, rgb } from 'pdf-lib';
import { UploadZone } from './components/UploadZone';
import { FileItem } from './components/FileItem';
import { SettingsModal } from './components/SettingsModal';
import { DocFile, BackendConfig } from './types';
import { generateId, getFileType } from './utils';

// Extend the Document interface to include the View Transitions API
declare global {
  interface Document {
    startViewTransition?: (callback: () => Promise<void> | void) => {
      finished: Promise<void>;
      ready: Promise<void>;
      updateCallbackDone: Promise<void>;
    };
  }
}

export default function App() {
  const [files, setFiles] = useState<DocFile[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [fileName, setFileName] = useState('');
  const [backendConfig, setBackendConfig] = useState<BackendConfig>({ url: '' });
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const hasOfficeFiles = files.some(f => f.type === 'office');

  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList) return;

    const newFiles: DocFile[] = Array.from(fileList).map(file => ({
      id: generateId(),
      file,
      name: file.name,
      size: file.size,
      type: getFileType(file.name),
      rotation: 0,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }));

    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setIsDragging(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false);
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    // Check if we are dragging a selected item within a multi-selection group
    if (selectedIds.has(activeId) && selectedIds.size > 1) {
      // If dropping ON another selected item, we generally don't need to do complex reordering 
      // unless we want to shuffle inside the group. For "group move", we usually target outside.
      // But let's handle the main case: Moving the GROUP relative to an UNSELECTED item.
      if (selectedIds.has(overId)) {
        // Simple reorder within list, though dnd-kit might feel weird if we don't move the whole group.
        // Let's fallback to standard behavior if dropping on itself/selection, 
        // OR better: treat the drop target as the insertion point for the whole group.
      }

      setFiles((items) => {
        const selectedItems = items.filter(i => selectedIds.has(i.id));
        const unselectedItems = items.filter(i => !selectedIds.has(i.id));

        // If target is unselected, we insert relative to it
        if (!selectedIds.has(overId)) {
          const overIndexInUnselected = unselectedItems.findIndex(i => i.id === overId);
          const originalActiveIndex = items.findIndex(i => i.id === activeId);
          const originalOverIndex = items.findIndex(i => i.id === overId);
          
          const newFiles = [...unselectedItems];
          
          // Heuristic: If we dragged from "above" to "below", insert after.
          if (originalActiveIndex < originalOverIndex) {
            newFiles.splice(overIndexInUnselected + 1, 0, ...selectedItems);
          } else {
            newFiles.splice(overIndexInUnselected, 0, ...selectedItems);
          }
          return newFiles;
        } else {
            // Fallback for dragging onto another selected item: just standard swap
            // This prevents the group logic from breaking if you just wiggle the mouse 1px
            const oldIndex = items.findIndex(i => i.id === activeId);
            const newIndex = items.findIndex(i => i.id === overId);
            return arrayMove(items, oldIndex, newIndex);
        }
      });
    } else {
      // Single item drag (standard)
      setFiles((items) => {
        const oldIndex = items.findIndex(i => i.id === activeId);
        const newIndex = items.findIndex(i => i.id === overId);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleRotate = (id: string) => {
    setFiles(files.map(f => {
      if (f.id === id) {
        const nextRotation = (f.rotation + 90) % 360 as 0 | 90 | 180 | 270;
        return { ...f, rotation: nextRotation };
      }
      return f;
    }));
  };

  const handleBulkRotate = () => {
    setFiles(files.map(f => {
      if (selectedIds.has(f.id)) {
        const nextRotation = (f.rotation + 90) % 360 as 0 | 90 | 180 | 270;
        return { ...f, rotation: nextRotation };
      }
      return f;
    }));
  };

  const handleDelete = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    setFiles(prev => prev.filter(f => !selectedIds.has(f.id)));
    setSelectedIds(new Set());
  };

  const handleMove = (id: string, direction: 'up' | 'down') => {
    const performMove = () => {
      // Group Move Logic
      if (selectedIds.has(id) && selectedIds.size > 1) {
        setFiles(prev => {
          const selectedItems = prev.filter(f => selectedIds.has(f.id));
          const unselectedItems = prev.filter(f => !selectedIds.has(f.id));
          
          // Get all indices of selected items in the current list
          const indices = prev.map((f, i) => selectedIds.has(f.id) ? i : -1).filter(i => i !== -1);
          
          if (direction === 'up') {
            const firstSelectedIndex = Math.min(...indices);
            if (firstSelectedIndex === 0) return prev; // Group already at top

            // Identify the item immediately *above* the top-most selected item
            const itemAboveId = prev[firstSelectedIndex - 1].id;
            
            // Find where that item is in the unselected list
            const indexInUnselected = unselectedItems.findIndex(f => f.id === itemAboveId);
            
            // Insert the whole group BEFORE that item
            const newFiles = [...unselectedItems];
            newFiles.splice(indexInUnselected, 0, ...selectedItems);
            return newFiles;

          } else { // Down
            const lastSelectedIndex = Math.max(...indices);
            if (lastSelectedIndex === prev.length - 1) return prev; // Group already at bottom

            // Identify the item immediately *below* the bottom-most selected item
            const itemBelowId = prev[lastSelectedIndex + 1].id;
            
            // Find where that item is in the unselected list
            const indexInUnselected = unselectedItems.findIndex(f => f.id === itemBelowId);
            
            // Insert the whole group AFTER that item
            const newFiles = [...unselectedItems];
            newFiles.splice(indexInUnselected + 1, 0, ...selectedItems);
            return newFiles;
          }
        });
        return;
      }

      // Single Item Logic
      const index = files.findIndex(f => f.id === id);
      if (index === -1) return;
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= files.length) return;
      
      setFiles(prev => arrayMove(prev, index, newIndex));
    };

    // Use View Transitions API if available
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        flushSync(performMove);
      });
    } else {
      performMove();
    }
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === files.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(files.map(f => f.id)));
    }
  };

  const handleMerge = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);

    try {
      // Create a new PDF Document
      const mergedPdf = await PDFDocument.create();
      
      // Iterate through files
      for (const docFile of files) {
        const fileBytes = await docFile.file.arrayBuffer();

        if (docFile.type === 'pdf') {
          // Load the source PDF
          const srcPdf = await PDFDocument.load(fileBytes);
          // Copy all pages
          const copiedPages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
          
          copiedPages.forEach((page) => {
            // Apply rotation: Add existing rotation + user selected rotation
            const existingRotation = page.getRotation().angle;
            page.setRotation(degrees(existingRotation + docFile.rotation));
            mergedPdf.addPage(page);
          });
        } 
        else if (docFile.type === 'image') {
          // Embed image
          let image;
          if (docFile.file.type === 'image/jpeg' || docFile.file.name.toLowerCase().endsWith('.jpg') || docFile.file.name.toLowerCase().endsWith('.jpeg')) {
            image = await mergedPdf.embedJpg(fileBytes);
          } else {
            // Default to PNG for other supported types or try PNG embedding
            image = await mergedPdf.embedPng(fileBytes);
          }

          // Scale image to fit a standard page (A4-ish) or keep original size?
          // Let's create a page matching the image dimensions
          const page = mergedPdf.addPage([image.width, image.height]);
          page.drawImage(image, {
            x: 0,
            y: 0,
            width: image.width,
            height: image.height,
          });
          page.setRotation(degrees(docFile.rotation));
        }
        else {
          // Fallback for Office/Text if backend not configured
          // Add a placeholder page so the user knows where their file would be
          const page = mergedPdf.addPage([595, 842]); // A4 size
          const { width, height } = page.getSize();

          const fontBold = await mergedPdf.embedFont(StandardFonts.HelveticaBold);
          const fontRegular = await mergedPdf.embedFont(StandardFonts.Helvetica);
          
          const title = "Documento Pendiente de Procesar";
          const fileName = docFile.name;
          const subtext = "Para ver el contenido real, configure el servidor backend.";
          
          const titleSize = 20;
          const nameSize = 14;
          const subtextSize = 10;

          const titleWidth = fontBold.widthOfTextAtSize(title, titleSize);
          const nameWidth = fontRegular.widthOfTextAtSize(fileName, nameSize);
          const subtextWidth = fontRegular.widthOfTextAtSize(subtext, subtextSize);

          // Center content
          page.drawText(title, {
            x: (width - titleWidth) / 2,
            y: height / 2 + 30,
            size: titleSize,
            font: fontBold,
            color: rgb(0.2, 0.2, 0.2),
          });
          
          page.drawText(fileName, {
            x: (width - nameWidth) / 2,
            y: height / 2,
            size: nameSize,
            font: fontRegular,
            color: rgb(0.14, 0.39, 0.92), // Brand color
          });

          page.drawText(subtext, {
            x: (width - subtextWidth) / 2,
            y: height / 2 - 25,
            size: subtextSize,
            font: fontRegular,
            color: rgb(0.6, 0.6, 0.6),
          });

          // Draw a border or box to make it look like a placeholder card
          page.drawRectangle({
            x: 50,
            y: height / 2 - 60,
            width: width - 100,
            height: 140,
            borderColor: rgb(0.8, 0.8, 0.8),
            borderWidth: 1,
          });
        }
      }

      // Serialize the PDFDocument to bytes (a Uint8Array)
      const pdfBytes = await mergedPdf.save();

      // Trigger download
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = (fileName || 'documento_fusionado') + '.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Error al fusionar:", error);
      alert("Ocurrió un error al procesar los archivos. Asegúrate de que los PDFs no estén encriptados y las imágenes sean válidas.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-brand-600 p-2 rounded-lg shadow-sm shadow-brand-200">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-800 tracking-tight">Cloud MegaMerge</span>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-800 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Configuración
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-800 mb-3">Fusiona tus documentos</h1>
          <p className="text-slate-500 max-w-2xl mx-auto">
            La herramienta definitiva para unificar PDFs e Imágenes en un solo archivo PDF profesional.
          </p>
        </div>

        {/* Upload Area */}
        <div className="mb-8">
          <UploadZone onFilesSelected={handleFilesSelected} isCompact={files.length > 0} />
        </div>

        {files.length > 0 && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {/* Office Warning */}
            {hasOfficeFiles && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex gap-4 text-blue-900 shadow-sm">
                <HelpCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-base">
                  <p className="opacity-90 leading-relaxed">
                    Los archivos PDF e Imágenes se fusionarán automáticamente. Los archivos de Office requieren un servidor backend configurado (Ver <strong className="font-bold cursor-pointer hover:underline" onClick={() => setIsSettingsOpen(true)}>'Configuración'</strong>), por lo que serán añadidos como <strong className="font-bold">marcadores de posición</strong> en el PDF final si no se cuenta con el servidor.
                  </p>
                </div>
              </div>
            )}

            {/* List Header / Bulk Actions */}
            <div className="sticky top-20 z-30 bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3 pl-2">
                <button 
                  onClick={toggleSelectAll}
                  className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedIds.size === files.length && files.length > 0 ? 'bg-brand-700 border-brand-700' : 'border-slate-400 bg-white'}`}
                >
                  {selectedIds.size === files.length && <div className="w-2.5 h-1.5 border-l-2 border-b-2 border-white rotate-[-45deg] mb-0.5" />}
                </button>
                <span className="text-sm font-medium text-slate-600">
                  {selectedIds.size > 0 ? `${selectedIds.size} seleccionados` : `${files.length} documentos`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {selectedIds.size > 0 ? (
                  <>
                     <button 
                      onClick={handleBulkRotate}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                    >
                      <RotateCw className="w-4 h-4" />
                      Rotar
                    </button>
                    <button 
                      onClick={handleBulkDelete}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      {selectedIds.size === files.length ? 'Eliminar todo' : 'Eliminar'}
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => { setFiles([]); setSelectedIds(new Set()); }}
                    className="px-3 py-1.5 text-sm font-medium text-red-500 hover:text-red-700 transition-colors"
                  >
                    Borrar todo
                  </button>
                )}
              </div>
            </div>

            {/* Draggable List */}
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={files.map(f => f.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {files.map((file, index) => (
                    <FileItem
                      key={file.id}
                      file={file}
                      isSelected={selectedIds.has(file.id)}
                      onToggleSelect={toggleSelection}
                      onRotate={handleRotate}
                      onDelete={handleDelete}
                      onMove={handleMove}
                      isFirst={index === 0}
                      isLast={index === files.length - 1}
                      isAnyDragging={isDragging}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </main>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-30">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-1/2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FileText className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Nombre del archivo (opcional)"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-slate-700"
            />
          </div>
          <button 
            onClick={handleMerge}
            disabled={files.length === 0 || isProcessing}
            className={`
              w-full md:w-auto px-10 py-4 text-lg font-bold rounded-xl shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3
              ${files.length === 0 || isProcessing 
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' 
                : 'bg-gradient-to-r from-brand-600 to-brand-700 text-white hover:from-brand-500 hover:to-brand-600 shadow-brand-500/30'
              }
            `}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Download className="w-6 h-6" />
                Fusionar Documentos
              </>
            )}
          </button>
        </div>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        config={backendConfig}
        onSave={setBackendConfig}
      />
    </div>
  );
}