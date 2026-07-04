'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Dna, Rocket, Brain, Cpu, Lightbulb, Zap, Star, Heart, Plus } from 'lucide-react';

// Convex-shaped inspiration card (api.inspirations.listActive).
type CarouselCard = {
  _id: string;
  title: string;
  description: string;
  icon?: string;
  gradient?: string;
  bannerImageUrl?: string;
  article?: { slug?: string; title?: string; bannerImageUrl?: string } | null;
};

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

interface InspirationCarouselProps {
  inspirations?: CarouselCard[];
}

export default function InspirationCarousel({ inspirations }: InspirationCarouselProps) {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Only feature real inspirations — when there are none, show an empty CTA
  // prompting the user to add their first article (no more fallback cards).
  const hasInspirations = !!(inspirations && inspirations.length > 0);
  const cards = hasInspirations ? inspirations! : [];

  // Auto-advance every 5 seconds, but only while the tab is visible — no point
  // animating slides (or re-rendering) for a backgrounded page.
  useEffect(() => {
    if (cards.length <= 1) return;

    let timer: ReturnType<typeof setInterval> | undefined;

    const start = () => {
      timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % cards.length);
      }, 5000);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };
    const onVisibility = () => {
      stop();
      if (document.visibilityState === 'visible') start();
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
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

  // Empty state — no featured articles yet
  if (!hasInspirations) {
    return (
      <div className="relative h-64 md:h-80 rounded-2xl bg-white border border-border flex flex-col items-center justify-center text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
          <Plus className="w-7 h-7 text-neutral-500" />
        </div>
        <h3 className="text-lg font-semibold text-text mb-1">No featured articles yet</h3>
        <p className="text-gray-500 mb-5 max-w-sm">
          Publish an article to feature it here on your home screen.
        </p>
        <Link
          href="/articles/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Add your first article
        </Link>
      </div>
    );
  }

  const currentCard = cards[currentSlide];
  const Icon = iconMap[currentCard.icon || 'Brain'] || Brain;
  const hasArticle = currentCard.article?.slug;
  const bannerUrl = currentCard.bannerImageUrl || currentCard.article?.bannerImageUrl;

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
