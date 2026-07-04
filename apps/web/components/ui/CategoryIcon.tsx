import * as Icons from 'lucide-react';
import { LucideIcon } from 'lucide-react';

/**
 * Category Icon Component
 * Handles both emoji (old) and Lucide icon (new) formats
 */
export default function CategoryIcon({
  icon,
  className = 'w-6 h-6',
}: {
  icon: string | null | undefined;
  className?: string;
}) {
  if (!icon) {
    // Default icon if none provided
    const DefaultIcon = Icons.Lightbulb;
    return <DefaultIcon className={className} />;
  }

  // Check if it's a Lucide icon name (letters only, no emoji)
  if (/^[A-Za-z]+$/.test(icon)) {
    // It's a Lucide icon name
    const IconComponent = (Icons as any)[icon] as LucideIcon;

    if (IconComponent) {
      return <IconComponent className={className} />;
    }

    // Fallback if icon name not found
    const FallbackIcon = Icons.Lightbulb;
    return <FallbackIcon className={className} />;
  }

  // It's an emoji - render as text
  return (
    <span className="text-2xl" role="img" aria-label="category icon">
      {icon}
    </span>
  );
}
