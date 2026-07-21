import React, { useState } from 'react';
import { ViewType } from '../types';

interface OnboardingScreenProps {
  onComplete: (view: ViewType) => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [slide, setSlide] = useState<number>(1);
  const totalSlides = 3;
  const [inviteCode, setInviteCode] = useState<string>('');
  const [firstGoal, setFirstGoal] = useState<string>('');
  const [category, setCategory] = useState<string>('Diversión');

  const handleNext = () => {
    if (slide < totalSlides) {
      setSlide(slide + 1);
    } else {
      onComplete('login');
    }
  };

  const handlePrev = () => {
    if (slide > 1) {
      setSlide(slide - 1);
    }
  };

  return (
    <div className="bg-[#F7F9FC] h-full text-[#191c1e] antialiased overflow-hidden flex flex-col justify-between p-margin-mobile relative max-w-md mx-auto min-h-[700px] border border-indigo-50 rounded-3xl shadow-xl shadow-indigo-100/50 my-4">
      {/* Step 1: Welcome */}
      {slide === 1 && (
        <div className="flex flex-col h-full items-center justify-center pt-8 pb-20 text-center animate-fade-in">
          <div className="mb-8">
            <h1 className="font-sans text-4xl font-extrabold text-brand-dark tracking-tight">Núcleo Familiar</h1>
            <p className="font-sans text-sm text-gray-500 mt-2">Une más a tu familia.</p>
          </div>
          <div className="relative w-56 h-56 mx-auto mb-8 rounded-full shadow-lg p-4 bg-white flex items-center justify-center">
            <img
              className="w-full h-full object-cover rounded-full"
              referrerPolicy="no-referrer"
              alt="Ilustración 3D alegre de una familia moderna"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAFjEv3FS3-J0WlUCs1gTzIKfXs4cateKOY7WJ4pycw3NxSRbOUva9fh3ry9rR6ztjg3_eA8Ba9pCmlxHSAR_P2qTXX853GevVPSrI8UoDDlYDgu3TRuKcC4bbyaeNUTmJk5s5trTWpxQsGdTi_ZSHhOOY5ul74dYmBFRpiQTSWi2-jUvdRj4SyAVzsyPhPK55rlzikDcRU95AGVF9k_5F3KCfVufxUeHoG9OIY2GQGLc2vSHR4s8yCx15ZGCKZaCoqEaeD1hT0XQI"
            />
          </div>
          <div className="space-y-4 max-w-xs mx-auto">
            <h2 className="font-sans text-2xl font-bold text-[#191c1e]">Bienvenidos a su espacio compartido</h2>
            <p className="font-sans text-sm text-gray-500">Organicen tareas, compartan metas y celebren logros juntos.</p>
          </div>
        </div>
      )}

      {/* Step 2: Join */}
      {slide === 2 && (
        <div className="flex flex-col h-full items-center justify-center pt-8 pb-20 text-center animate-fade-in w-full">
          <div className="relative w-40 h-40 mx-auto mb-6 rounded-3xl shadow-sm p-4 bg-white flex items-center justify-center border border-indigo-50">
            <span className="material-symbols-outlined text-6xl text-brand-primary">diversity_1</span>
          </div>
          <div className="space-y-2 max-w-xs mx-auto w-full mb-6">
            <h2 className="font-sans text-2xl font-bold text-[#191c1e]">Únete a la Familia</h2>
            <p className="font-sans text-sm text-gray-500">Conéctate con tus seres queridos para comenzar.</p>
          </div>
          <div className="w-full max-w-xs mx-auto space-y-4">
            <div className="relative">
              <input
                className="w-full px-5 py-3 rounded-full border border-slate-150 shadow-inner bg-[#F7F9FC] text-sm text-center focus:ring-2 focus:ring-brand-primary focus:outline-none"
                placeholder="Introduce el código de invitación"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
              />
              <button
                onClick={handleNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-md hover:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
            <div className="flex items-center justify-center space-x-3">
              <div className="h-px bg-slate-200 flex-1"></div>
              <span className="font-sans text-xs text-gray-400 font-bold">O BIEN</span>
              <div className="h-px bg-slate-200 flex-1"></div>
            </div>
            <button
              className="w-full py-3 rounded-full bg-white shadow-md font-sans text-sm font-semibold text-brand-primary flex items-center justify-center space-x-2 border border-indigo-50 hover:bg-slate-50 active:scale-95 transition-all"
              onClick={handleNext}
            >
              <span className="material-symbols-outlined text-lg">add_circle</span>
              <span>Crear nueva familia</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 3: First Goal */}
      {slide === 3 && (
        <div className="flex flex-col h-full items-center justify-center pt-8 pb-20 text-center animate-fade-in w-full">
          <div className="relative w-40 h-40 mx-auto mb-6 rounded-3xl shadow-sm p-4 bg-[#f3f4f6] flex items-center justify-center border border-indigo-50">
            <div className="absolute inset-0 bg-[#a93349]/5 rounded-3xl"></div>
            <span className="material-symbols-outlined text-6xl text-brand-accent relative z-10">flag</span>
          </div>
          <div className="space-y-2 max-w-xs mx-auto w-full mb-6">
            <h2 className="font-sans text-2xl font-bold text-[#191c1e]">Establece tu primera meta</h2>
            <p className="font-sans text-sm text-gray-500">¿Qué les gustaría lograr juntos?</p>
          </div>
          <div className="w-full max-w-xs mx-auto space-y-4">
            <input
              className="w-full px-5 py-3 rounded-2xl border border-slate-150 shadow-inner bg-white text-sm focus:ring-2 focus:ring-brand-primary focus:outline-none"
              placeholder="ej. Noche de películas semanal"
              type="text"
              value={firstGoal}
              onChange={(e) => setFirstGoal(e.target.value)}
            />
            <div className="flex gap-2 justify-center mb-6">
              {['Tareas', 'Diversión', 'Ahorros'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-4 py-1.5 rounded-full font-sans text-xs font-semibold shadow-sm border transition-all ${
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
        </div>
      )}

      {/* Navigation Controls */}
      <div className="flex justify-between items-center w-full px-2 mt-auto">
        <button
          onClick={handlePrev}
          className={`w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-gray-600 hover:text-brand-primary active:scale-95 transition-all ${
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
