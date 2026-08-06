import React, { useState } from 'react';
import { ViewType } from '../types';
import { joinFamilySchema, getZodErrors } from '../lib/validation';

export interface OnboardingData {
  onboardingAction: 'join' | 'create';
  inviteCode?: string;
  familyName?: string;
  firstGoal?: string;
  category?: 'Salud' | 'Estudio' | 'Finanzas' | 'Hogar' | 'Personal';
}

interface OnboardingScreenProps {
  onComplete: (data: OnboardingData) => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [slide, setSlide] = useState<number>(1);
  const totalSlides = 3;
  const [onboardingAction, setOnboardingAction] = useState<'join' | 'create'>('create');
  const [inviteCode, setInviteCode] = useState<string>('');
  const [joinError, setJoinError] = useState<string>('');
  const [familyName, setFamilyName] = useState<string>('');
  const [firstGoal, setFirstGoal] = useState<string>('');
  const [category, setCategory] = useState<'Salud' | 'Estudio' | 'Finanzas' | 'Hogar' | 'Personal'>('Personal');

  const handleNext = () => {
    if (slide < totalSlides) {
      if (slide === 2) {
        if (onboardingAction === 'join') {
          const parseResult = joinFamilySchema.safeParse({ inviteCode });
          if (!parseResult.success) {
            const errs = getZodErrors(parseResult);
            setJoinError(errs.inviteCode || 'Código de invitación inválido.');
            return;
          }
          setJoinError('');
        }
        if (onboardingAction === 'create' && !familyName.trim()) {
          alert("Por favor introduce el nombre de tu familia.");
          return;
        }
      }
      setSlide(slide + 1);
    } else {
      onComplete({
        onboardingAction,
        inviteCode: onboardingAction === 'join' ? inviteCode.trim().toUpperCase() : undefined,
        familyName: onboardingAction === 'create' ? familyName.trim() : undefined,
        firstGoal: firstGoal.trim() || undefined,
        category: firstGoal.trim() ? category : undefined
      });
    }
  };

  const handlePrev = () => {
    if (slide > 1) {
      setSlide(slide - 1);
    }
  };

  return (
    <div className="bg-[#F7F9FC] h-full text-[#191c1e] antialiased overflow-hidden flex flex-col justify-between p-margin-mobile relative max-w-md mx-auto min-h-[700px] border border-indigo-50 rounded-3xl shadow-xl shadow-indigo-100/50 my-4 p-6">
      {/* Step 1: Welcome */}
      {slide === 1 && (
        <div className="flex flex-col h-full items-center justify-center pt-8 pb-20 text-center animate-fade-in">
          <div className="mb-8">
            <h1 className="font-sans text-4xl font-extrabold text-brand-dark tracking-tight">Ideario Familiar</h1>
            <p className="font-sans text-sm text-gray-500 mt-2">Une más a tu familia.</p>
          </div>
          <div className="relative w-56 h-56 mx-auto mb-8 rounded-full shadow-lg p-4 bg-white flex items-center justify-center">
            <img
              className="w-full h-full object-cover rounded-full"
              referrerPolicy="no-referrer"
              alt="Ilustración 3D alegre de una familia moderna"
              src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=300&fit=crop"
            />
          </div>
          <div className="space-y-4 max-w-xs mx-auto">
            <h2 className="font-sans text-2xl font-bold text-[#191c1e]">Bienvenidos a su espacio compartido</h2>
            <p className="font-sans text-sm text-gray-500">Organicen tareas, compartan metas y celebren logros juntos de manera real.</p>
          </div>
        </div>
      )}

      {/* Step 2: Create or Join Option with toggled layout */}
      {slide === 2 && (
        <div className="flex flex-col h-full items-center justify-center pt-8 pb-20 text-center animate-fade-in w-full">
          <div className="relative w-24 h-24 mx-auto mb-6 rounded-3xl shadow-sm p-4 bg-white flex items-center justify-center border border-indigo-50">
            <span className="material-symbols-outlined text-4xl text-brand-primary">diversity_1</span>
          </div>
          <div className="space-y-2 max-w-xs mx-auto w-full mb-6">
            <h2 className="font-sans text-2xl font-bold text-[#191c1e]">Configura tu Núcleo</h2>
            <p className="font-sans text-sm text-gray-500">¿Qué te gustaría hacer hoy para empezar?</p>
          </div>

          <div className="w-full max-w-xs mx-auto space-y-4">
            {/* Tab selection */}
            <div className="bg-slate-100 p-1.5 rounded-full flex">
              <button
                type="button"
                onClick={() => setOnboardingAction('create')}
                className={`flex-1 py-2 rounded-full font-sans text-xs font-bold transition-all ${
                  onboardingAction === 'create' ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-500'
                }`}
              >
                Crear Familia
              </button>
              <button
                type="button"
                onClick={() => setOnboardingAction('join')}
                className={`flex-1 py-2 rounded-full font-sans text-xs font-bold transition-all ${
                  onboardingAction === 'join' ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-500'
                }`}
              >
                Tengo Código
              </button>
            </div>

            {/* Dynamic Inputs depending on Selection */}
            {onboardingAction === 'create' ? (
              <div className="space-y-2 animate-fade-in">
                <input
                  className="w-full px-5 py-3 rounded-full border border-slate-150 shadow-inner bg-white text-sm text-center focus:ring-2 focus:ring-brand-primary focus:outline-none font-bold"
                  placeholder="Nombre de tu familia (ej. Los Pérez)"
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                />
                <p className="font-sans text-[10px] text-gray-400">Crearemos un grupo familiar nuevo para ti y generaremos un código único.</p>
              </div>
            ) : (
              <div className="space-y-2 animate-fade-in text-left">
                <input
                  className={`w-full px-5 py-3 rounded-full border shadow-inner bg-white text-sm text-center focus:ring-2 focus:ring-brand-primary focus:outline-none uppercase font-mono font-bold transition-all ${
                    joinError ? 'border-rose-400 bg-rose-50/20 ring-2 ring-rose-200' : 'border-slate-150'
                  }`}
                  placeholder="Ej: CODE-A1B2C3"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => {
                    const val = e.target.value;
                    setInviteCode(val);
                    if (joinError) {
                      const parseResult = joinFamilySchema.safeParse({ inviteCode: val });
                      if (parseResult.success) {
                        setJoinError('');
                      } else {
                        const errs = getZodErrors(parseResult);
                        setJoinError(errs.inviteCode || '');
                      }
                    }
                  }}
                />
                {joinError ? (
                  <p className="font-sans text-[11px] text-rose-600 font-bold bg-rose-50 px-3 py-1.5 rounded-full border border-rose-200 flex items-center justify-center gap-1 animate-fade-in text-center">
                    <span>⚠️ {joinError}</span>
                  </p>
                ) : (
                  <p className="font-sans text-[10px] text-gray-400 text-center">Introduce el código que te compartió tu familiar para unirte.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: First Goal */}
      {slide === 3 && (
        <div className="flex flex-col h-full items-center justify-center pt-8 pb-20 text-center animate-fade-in w-full">
          <div className="relative w-24 h-24 mx-auto mb-6 rounded-3xl shadow-sm p-4 bg-[#f3f4f6] flex items-center justify-center border border-indigo-50">
            <span className="material-symbols-outlined text-4xl text-brand-accent relative z-10">flag</span>
          </div>
          <div className="space-y-2 max-w-xs mx-auto w-full mb-6">
            <h2 className="font-sans text-2xl font-bold text-[#191c1e]">Establece tu primera meta</h2>
            <p className="font-sans text-sm text-gray-500">¿Qué les gustaría lograr juntos? (Opcional)</p>
          </div>
          <div className="w-full max-w-xs mx-auto space-y-4">
            <input
              className="w-full px-5 py-3 rounded-2xl border border-slate-150 shadow-inner bg-white text-sm text-center focus:ring-2 focus:ring-brand-primary focus:outline-none font-medium"
              placeholder="ej. Cenar en familia sin teléfonos"
              type="text"
              value={firstGoal}
              onChange={(e) => setFirstGoal(e.target.value)}
            />
            {firstGoal.trim() && (
              <div className="space-y-2 animate-fade-in">
                <p className="font-sans text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Categoría de la Meta</p>
                <div className="flex gap-1.5 justify-center flex-wrap">
                  {(['Hogar', 'Personal', 'Finanzas', 'Estudio', 'Salud'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-full font-sans text-[10px] font-semibold shadow-sm border transition-all ${
                        category === cat
                          ? 'bg-brand-primary text-white border-brand-primary'
                          : 'bg-white text-gray-600 border-slate-100 hover:text-brand-primary'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation Controls */}
      <div className="flex justify-between items-center w-full px-2 mt-auto">
        <button
          onClick={handlePrev}
          className={`w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-gray-600 hover:text-brand-primary active:scale-95 transition-all border border-slate-100 ${
            slide === 1 ? 'opacity-0 pointer-events-none' : ''
          }`}
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
        </button>

        <div className="flex space-x-1.5">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all duration-300 ${
                slide === idx ? 'w-6 bg-brand-primary' : 'w-2 bg-slate-200'
              }`}
            ></div>
          ))}
        </div>

        <button
          onClick={handleNext}
          className="w-10 h-10 rounded-full bg-brand-primary shadow-md flex items-center justify-center text-white hover:opacity-90 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-lg">
            {slide === totalSlides ? 'check' : 'arrow_forward'}
          </span>
        </button>
      </div>
    </div>
  );
}
