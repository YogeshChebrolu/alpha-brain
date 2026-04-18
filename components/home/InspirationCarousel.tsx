'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Dna, Rocket, Brain, Cpu } from 'lucide-react';

const INSPIRATION_CARDS = [
  {
    title: 'AlphaFold Revolution',
    description: 'AI solving protein folding - unlocking the secrets of biology',
    icon: Dna,
    gradient: 'from-purple-500/20 to-blue-500/20',
  },
  {
    title: 'SpaceX Starship',
    description: 'Making life multiplanetary - the next frontier of humanity',
    icon: Rocket,
    gradient: 'from-orange-500/20 to-red-500/20',
  },
  {
    title: 'Neural Networks',
    description: 'Deep learning transforming every industry',
    icon: Brain,
    gradient: 'from-green-500/20 to-teal-500/20',
  },
  {
    title: 'Quantum Computing',
    description: 'Computing at the edge of physics - solving the unsolvable',
    icon: Cpu,
    gradient: 'from-cyan-500/20 to-indigo-500/20',
  },
];

export default function InspirationCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-advance every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % INSPIRATION_CARDS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % INSPIRATION_CARDS.length);
  };

  const prevSlide = () => {
    setCurrentSlide(
      (prev) => (prev - 1 + INSPIRATION_CARDS.length) % INSPIRATION_CARDS.length
    );
  };

  return (
    <div className="relative h-64 md:h-80 overflow-hidden rounded-2xl bg-white border border-border">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          <div
            className={`h-full bg-gradient-to-br ${INSPIRATION_CARDS[currentSlide].gradient} p-8 flex items-center`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                {(() => {
                  const Icon = INSPIRATION_CARDS[currentSlide].icon;
                  return <Icon className="w-10 h-10 text-accent" />;
                })()}
                <h2 className="text-2xl md:text-3xl font-bold text-text">
                  {INSPIRATION_CARDS[currentSlide].title}
                </h2>
              </div>
              <p className="text-lg text-gray-600 max-w-md">
                {INSPIRATION_CARDS[currentSlide].description}
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white shadow-md transition-colors"
      >
        <ChevronLeft className="w-5 h-5 text-text" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white shadow-md transition-colors"
      >
        <ChevronRight className="w-5 h-5 text-text" />
      </button>

      {/* Pagination dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {INSPIRATION_CARDS.map((_, i) => (
          <button
            key={i}
            onClick={() => goToSlide(i)}
            className={`w-2 h-2 rounded-full transition-all ${
              i === currentSlide
                ? 'bg-accent w-6'
                : 'bg-gray-300 hover:bg-gray-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
