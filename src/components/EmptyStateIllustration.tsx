import React, { useState, useEffect } from 'react';
import { Target, CheckCircle2, BookOpen, Users, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface EmptyStateIllustrationProps {
  topic: 'tareas' | 'metas' | 'diario' | 'familia' | string;
  title: string;
  description: string;
  actionButton?: React.ReactNode;
}

export default function EmptyStateIllustration({
  topic,
  title,
  description,
  actionButton,
}: EmptyStateIllustrationProps) {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const cacheKey = `empty_illustration_${topic}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached && cached.startsWith('<svg')) {
        setSvgContent(cached);
        return;
      }
    } catch (e) {
      // Ignore localStorage errors
    }

    // Otherwise fetch from Gemini endpoint once
    let isMounted = true;
    const fetchIllustration = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/gemini/empty-illustration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.svg && isMounted) {
            setSvgContent(data.svg);
            try {
              localStorage.setItem(cacheKey, data.svg);
            } catch (e) {}
          }
        }
      } catch (err) {
        console.warn('Could not fetch Gemini empty state illustration:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchIllustration();

    return () => {
      isMounted = false;
    };
  }, [topic]);

  const renderLucideFallback = () => {
    switch (topic) {
      case 'metas':
        return <Target className="w-12 h-12 text-indigo-500" />;
      case 'tareas':
        return <CheckCircle2 className="w-12 h-12 text-emerald-500" />;
      case 'diario':
        return <BookOpen className="w-12 h-12 text-amber-500" />;
      case 'familia':
        return <Users className="w-12 h-12 text-purple-500" />;
      default:
        return <Sparkles className="w-12 h-12 text-indigo-500" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="p-8 md:p-12 text-center bg-white/80 backdrop-blur-xs rounded-3xl border border-indigo-100/80 shadow-xs flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto"
    >
      <div className="relative w-32 h-32 flex items-center justify-center">
        {svgContent ? (
          <div
            className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain drop-shadow-xs"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <div className="w-24 h-24 rounded-3xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-center shadow-xs">
            {renderLucideFallback()}
          </div>
        )}
      </div>

      <div className="space-y-1.5 max-w-sm">
        <h3 className="font-sans text-base font-extrabold text-gray-900 tracking-tight">
          {title}
        </h3>
        <p className="font-sans text-xs text-gray-500 leading-relaxed font-medium">
          {description}
        </p>
      </div>

      {actionButton && <div className="pt-2">{actionButton}</div>}
    </motion.div>
  );
}
