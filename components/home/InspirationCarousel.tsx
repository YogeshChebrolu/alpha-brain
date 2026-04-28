'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Dna, Rocket, Brain, Cpu, Lightbulb, Zap, Star, Heart } from 'lucide-react';
import type { Inspiration } from '@/types/article.types';

// Icon mapping for dynamic rendering
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Dna,
  Rocket,
  Brain,
  Cpu,
  Lightbulb,
  Zap,
  Star,
  Heart,
};

// Fallback cards if database fetch fails or returns empty
const FALLBACK_CARDS: Partial<Inspiration>[] = [
  {
    id: 'fallback-1',
    title: 'AlphaFold Revolution',
    description: 'AI solving protein folding - unlocking the secrets of biology',
    icon: 'Dna',
    gradient: 'from-neutral-100 to-neutral-200',
    article_id: null,
    banner_image_url: null,
  },
  {
    id: 'fallback-2',
    title: 'SpaceX Starship',
    description: 'Making life multiplanetary - the next frontier of humanity',
    icon: 'Rocket',
    gradient: 'from-neutral-100 to-neutral-200',
    article_id: null,
    banner_image_url: null,
  },
  {
    id: 'fallback-3',
    title: 'Neural Networks',
    description: 'Deep learning transforming every industry',
    icon: 'Brain',
    gradient: 'from-neutral-100 to-neutral-200',
    article_id: null,
    banner_image_url: null,
  },
  {
    id: 'fallback-4',
    title: 'Quantum Computing',
    description: 'Computing at the edge of physics - solving the unsolvable',
    icon: 'Cpu',
    gradient: 'from-neutral-100 to-neutral-200',
    article_id: null,
    banner_image_url: null,
  },
];

interface InspirationCarouselProps {
  inspirations?: Inspiration[];
}

export default function InspirationCarousel({ inspirations }: InspirationCarouselProps) {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Use provided inspirations or fallback
  const cards = inspirations && inspirations.length > 0 ? inspirations : FALLBACK_CARDS;

  // Auto-advance every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % cards.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [cards.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % cards.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const handleClick = (card: (typeof cards)[0]) => {
    // If linked to an article, navigate to it
    if (card.article?.slug) {
      router.push(`/articles/${card.article.slug}`);
    }
  };

  const currentCard = cards[currentSlide];
  const Icon = iconMap[currentCard.icon || 'Brain'] || Brain;
  const hasArticle = currentCard.article?.slug;
  const bannerUrl = currentCard.banner_image_url || currentCard.article?.banner_image_url;

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
            onClick={() => hasArticle && handleClick(currentCard)}
            className={`h-full bg-gradient-to-br ${currentCard.gradient} p-8 flex items-center relative ${
              hasArticle ? 'cursor-pointer' : ''
            }`}
          >
            {/* Banner image as background */}
            {bannerUrl && (
              <div className="absolute inset-0">
                <img
                  src={bannerUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/70 to-transparent" />
              </div>
            )}

            <div className="flex-1 relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <Icon className="w-10 h-10 text-neutral-900" />
                <h2 className="text-2xl md:text-3xl font-bold text-text">
                  {currentCard.title}
                </h2>
              </div>
              <p className="text-lg text-gray-600 max-w-md">
                {currentCard.description}
              </p>

              {hasArticle && (
                <div className="mt-4">
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-neutral-700 hover:text-neutral-900">
                    Read Article
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white shadow-md transition-colors z-10"
      >
        <ChevronLeft className="w-5 h-5 text-text" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white shadow-md transition-colors z-10"
      >
        <ChevronRight className="w-5 h-5 text-text" />
      </button>

      {/* Pagination dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {cards.map((_, i) => (
          <button
            key={i}
            onClick={() => goToSlide(i)}
            className={`w-2 h-2 rounded-full transition-all ${
              i === currentSlide
                ? 'bg-neutral-900 w-6'
                : 'bg-gray-300 hover:bg-gray-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
