import React, { useState } from 'react';
import { X, Settings, ChevronRight } from 'lucide-react';
import { BackendConfig } from '../types';
import { DeveloperGuideModal } from './DeveloperGuideModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BackendConfig;
  onSave: (config: BackendConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, config, onSave }) => {
  const [url, setUrl] = useState(config.url);
  const [showGuide, setShowGuide] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({ url });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-all">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Settings className="w-6 h-6 text-slate-700" />
              <h2 className="text-xl font-bold text-slate-800">Configuración Avanzada</h2>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Si tienes un servidor de procesamiento desplegado (Cloud Run), 
                ingresa la URL aquí para habilitar la conversión real de documentos Office.
              </p>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  URL del Backend (Opcional)
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-slate-700"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Sin esta URL, los archivos Excel/Word se incluirán como carátulas indicativas.
                </p>
              </div>

              <button 
                onClick={() => setShowGuide(true)}
                className="flex items-center gap-1 text-brand-600 text-sm font-medium hover:text-brand-700 transition-colors"
              >
                <span>&lt; &gt;</span>
                <span>¿Eres desarrollador? Ver guía de despliegue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              className="px-4 py-2 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 shadow-sm shadow-brand-500/30 transition-all active:scale-95"
            >
              Guardar Configuración
            </button>
          </div>
        </div>
      </div>
      
      <DeveloperGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </>
  );
};