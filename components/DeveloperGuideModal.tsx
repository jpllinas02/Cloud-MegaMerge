import React from 'react';
import { X, Code2, Terminal, Copy, Check } from 'lucide-react';

interface DeveloperGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeveloperGuideModal: React.FC<DeveloperGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const CopyButton = ({ text }: { text: string }) => {
    const [copied, setCopied] = React.useState(false);
    const handleCopy = () => {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    return (
      <button 
        onClick={handleCopy}
        className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors"
        title="Copiar código"
      >
        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
      </button>
    );
  };

  const CodeBlock = ({ title, code, language = 'python' }: { title: string, code: string, language?: string }) => (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-slate-700 mb-2">{title}</h4>
      <div className="relative group">
        <div className="bg-[#0f172a] rounded-lg overflow-hidden border border-slate-700 shadow-md">
          <div className="overflow-x-auto p-4">
            <pre className="text-xs font-mono leading-relaxed text-blue-100">
              <code>{code}</code>
            </pre>
          </div>
        </div>
        <CopyButton text={code} />
      </div>
    </div>
  );

  const mainPyCode = `import os
import shutil
import subprocess
import tempfile
import json
from typing import List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader, PdfWriter
import img2pdf

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def convert_to_pdf(input_path, output_dir):
    cmd = ['libreoffice', '--headless', '--convert-to', 'pdf', '--outdir', output_dir, input_path]
    subprocess.run(cmd, check=True)
    filename = os.path.splitext(os.path.basename(input_path))[0] + ".pdf"
    return os.path.join(output_dir, filename)

def convert_image_to_pdf(input_path, output_path):
    with open(output_path, "wb") as f:
        f.write(img2pdf.convert(input_path))

@app.post("/merge")
async def merge_documents(files: List[UploadFile] = File(...), rotations: str = Form(...)):
    rotation_map = json.loads(rotations)
    tmp_dir = tempfile.mkdtemp()
    merged_pdf_path = os.path.join(tmp_dir, "merged_document.pdf")

    try:
        writer = PdfWriter()
        for upload in files:
            file_path = os.path.join(tmp_dir, upload.filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(upload.file, buffer)

            pdf_path = None
            ext = os.path.splitext(upload.filename)[1].lower()

            if ext in ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt']:
                pdf_path = convert_to_pdf(file_path, tmp_dir)
            elif ext in ['.png', '.jpg', '.jpeg']:
                pdf_path = os.path.join(tmp_dir, f"{upload.filename}.pdf")
                convert_image_to_pdf(file_path, pdf_path)
            elif ext == '.pdf':
                pdf_path = file_path

            if pdf_path and os.path.exists(pdf_path):
                reader = PdfReader(pdf_path)
                angle = rotation_map.get(upload.filename, 0)
                for page in reader.pages:
                    if angle != 0: page.rotate(angle)
                    writer.add_page(page)

        with open(merged_pdf_path, "wb") as f:
            writer.write(f)

        return FileResponse(merged_pdf_path, filename="merged.pdf", media_type="application/pdf")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))`;

  const dockerfileCode = `FROM python:3.10-slim
RUN apt-get update && apt-get install -y libreoffice libreoffice-java-common default-jre && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD exec uvicorn main:app --host 0.0.0.0 --port $PORT`;

  const requirementsCode = `fastapi
uvicorn
python-multipart
pypdf
img2pdf`;

  const deployCommand = `gcloud run deploy megamerge --source . --platform managed --allow-unauthenticated --memory 2Gi`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
              <Code2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Guía Técnica para Desarrolladores</h2>
              <p className="text-sm text-slate-500">Cómo desplegar el motor de conversión en Google Cloud Run.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-sm">1</span>
              Archivos necesarios
            </h3>
            <p className="text-slate-600 mb-4 ml-8">Guarda estos 3 archivos en una carpeta local.</p>
            
            <div className="ml-8">
              <CodeBlock title="main.py" code={mainPyCode} />
              <CodeBlock title="Dockerfile" code={dockerfileCode} language="dockerfile" />
              <CodeBlock title="requirements.txt" code={requirementsCode} language="text" />
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-sm">2</span>
              Comandos de despliegue
            </h3>
            <div className="ml-8">
              <div className="bg-[#0f172a] rounded-lg overflow-hidden border border-slate-700 shadow-md relative group">
                <div className="p-4 flex items-center gap-3">
                  <Terminal className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <code className="text-sm font-mono text-green-100 break-all">
                    {deployCommand}
                  </code>
                </div>
                <CopyButton text={deployCommand} />
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
          >
            Cerrar Guía
          </button>
        </div>

      </div>
    </div>
  );
};