'use client';

import { motion } from 'framer-motion';
import IdeaCard from './IdeaCard';

// Convex idea shape (mirrors what IdeaCard consumes).
type Idea = {
  _id: string;
  title: string;
  contentJson?: any;
  _creationTime: number;
  category?: { name: string; color?: string; gradient?: string } | null;
};

interface Props {
  ideas: Idea[];
}

/**
 * Swipe Feed Component
 * Vertical snap scrolling for mobile-like experience
 */
export default function SwipeFeed({ ideas }: Props) {
  if (ideas.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-4xl mb-4">💡</p>
          <p className="text-gray-500">No ideas yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Create your first idea to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto snap-y snap-mandatory scroll-smooth">
      {ideas.map((idea, index) => (
        <motion.div
          key={idea._id}
          className="min-h-[calc(100vh-300px)] snap-start flex items-center justify-center py-6"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.3 }}
        >
          <IdeaCard idea={idea as any} />
        </motion.div>
      ))}
    </div>
  );
}
