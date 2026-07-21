import React, { useState } from 'react';
import { FLUTTER_FIREBASE_FILES, MANUAL_STEPS } from '../developer_data';

export default function CodeExporterScreen() {
  const [activeIdx, setActiveTabIdx] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-sans text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
          <span className="material-symbols-outlined text-brand-primary text-3xl font-bold">folder_zip</span>
          Exportador de Código
        </h2>
        <p className="font-sans text-sm text-gray-500">
          Explora la arquitectura limpia del proyecto Flutter, las reglas de Firestore y las Cloud Functions solicitadas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left selector */}
        <div className="lg:col-span-4 flex flex-col gap-2.5">
          {FLUTTER_FIREBASE_FILES.map((file, idx) => (
            <button
              key={idx}
              onClick={() => {
                setActiveTabIdx(idx);
                setCopied(false);
              }}
              className={`text-left p-4 rounded-2xl border transition-all ${
                activeIdx === idx
                  ? 'bg-brand-light/30 border-brand-primary shadow-sm ring-2 ring-indigo-500/5'
                  : 'bg-white border-slate-150 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-gray-400 font-bold">
                  {file.path.endsWith('.dart') ? 'code' : file.path.endsWith('.rules') ? 'security' : 'settings'}
                </span>
                <span className="font-mono text-xs font-bold text-gray-800 truncate">{file.path.split('/').pop()}</span>
              </div>
              <p className="font-sans text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">{file.path}</p>
              <p className="font-sans text-[11px] text-gray-500 line-clamp-2 leading-relaxed mt-1.5">{file.description}</p>
            </button>
          ))}
        </div>

        {/* Right Code Display */}
        <div className="lg:col-span-8 flex flex-col bg-slate-900 rounded-3xl overflow-hidden shadow-lg border border-slate-800">
          <div className="bg-slate-950/60 px-5 py-3 flex justify-between items-center border-b border-slate-800/80">
            <span className="font-mono text-xs text-slate-400 font-semibold">{FLUTTER_FIREBASE_FILES[activeIdx].path}</span>
            <button
              onClick={() => handleCopy(FLUTTER_FIREBASE_FILES[activeIdx].content)}
              className="text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <span className="material-symbols-outlined text-sm">
                {copied ? 'check' : 'content_copy'}
              </span>
              <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
            </button>
          </div>
          <div className="p-5 overflow-auto max-h-[450px]">
            <pre className="font-mono text-xs text-slate-100 leading-relaxed text-left whitespace-pre">
              <code>{FLUTTER_FIREBASE_FILES[activeIdx].content}</code>
            </pre>
          </div>
        </div>
      </div>

      {/* Manual steps console list */}
      <div className="bg-slate-50/50 border border-indigo-50/60 rounded-3xl p-6 shadow-inner space-y-4">
        <h3 className="font-sans text-base font-extrabold text-gray-900 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-brand-primary">settings_suggest</span>
          Pasos de Configuración Manual en la Consola de Firebase
        </h3>
        <ol className="list-decimal list-inside space-y-3.5 pl-1">
          {MANUAL_STEPS.map((step, idx) => (
            <li key={idx} className="font-sans text-xs text-gray-600 font-medium leading-relaxed">
              <span className="text-gray-900 font-bold ml-1">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
