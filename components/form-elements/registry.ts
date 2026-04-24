import {
  FormElementType,
  FormElementProps,
  FormElementConfig,
  ElementMetadata,
} from '@/types/form-element.types';
import TextElement from './TextElement';
import MarkdownElement from './MarkdownElement';
import StockTickerElement from './StockTickerElement';
import StockGraphElement from './StockGraphElement';
import SelectElement from './SelectElement';
import FileUploadElement from './FileUploadElement';
import DueDateElement from './DueDateElement';
import ActionsElement from './ActionsElement';
import LinkElement from './LinkElement';
import {
  Type,
  AlignLeft,
  Tag,
  TrendingUp,
  TrendingDown,
  Upload,
  CheckSquare,
  Calendar,
  Clock,
  ListChecks,
  Link,
} from 'lucide-react';

/**
 * META REGISTRY (Library-First Model)
 *
 * This registry provides both component mapping AND rich metadata for the Template Builder UI.
 * Each element has:
 * - name & description: For the UI library sidebar
 * - icon: Visual representation in the builder
 * - defaultConfig: Sensible defaults when user adds element to template
 * - component: The React component to render
 *
 * ARCHITECTURE: Adding a new element type automatically appears in the Template Builder.
 */
export const LIBRARY_METADATA: Record<FormElementType, ElementMetadata> = {
  text: {
    type: 'text',
    name: 'Text Input',
    description: 'Single-line text field',
    icon: Type,
    defaultConfig: {
      label: 'Text Field',
      placeholder: 'Enter text...',
    },
    component: TextElement,
  },
  textarea: {
    type: 'textarea',
    name: 'Long Text',
    description: 'Multi-line text area',
    icon: AlignLeft,
    defaultConfig: {
      label: 'Description',
      placeholder: 'Enter details...',
    },
    component: TextElement,
  },
  markdown: {
    type: 'markdown',
    name: 'Rich Text',
    description: 'Markdown editor with preview',
    icon: AlignLeft,
    defaultConfig: {
      label: 'Content',
      placeholder: 'Write your thoughts...',
    },
    component: MarkdownElement,
  },
  select: {
    type: 'select',
    name: 'Dropdown',
    description: 'Select from options',
    icon: Tag,
    defaultConfig: {
      label: 'Select Option',
      options: ['Option 1', 'Option 2', 'Option 3'],
    },
    component: SelectElement,
  },
  stock_ticker: {
    type: 'stock_ticker',
    name: 'Stock Ticker',
    description: 'Stock symbol with live price & returns',
    icon: TrendingUp,
    defaultConfig: {
      label: 'Stock Symbol',
      placeholder: 'e.g., AAPL',
      required: true,
    },
    component: StockTickerElement,
  },
  file_upload: {
    type: 'file_upload',
    name: 'File Upload',
    description: 'Upload images, PDFs, or documents',
    icon: Upload,
    defaultConfig: {
      label: 'Attachments',
    },
    component: FileUploadElement,
  },
  link: {
    type: 'link',
    name: 'Links',
    description: 'Add article URLs, tweets, repos, etc.',
    icon: Link,
    defaultConfig: {
      label: 'References',
      placeholder: 'Add links to articles, blogs, tweets, repos...',
    },
    component: LinkElement,
  },
  checkbox: {
    type: 'checkbox',
    name: 'Checkbox',
    description: 'Yes/No toggle',
    icon: CheckSquare,
    defaultConfig: {
      label: 'Option',
    },
    component: TextElement, // TODO: implement CheckboxElement
  },
  date: {
    type: 'date',
    name: 'Date Picker',
    description: 'Select a date',
    icon: Calendar,
    defaultConfig: {
      label: 'Date',
    },
    component: TextElement, // TODO: implement DateElement
  },
  due_date: {
    type: 'due_date',
    name: 'Due Date',
    description: 'Deadline with optional reminder',
    icon: Clock,
    defaultConfig: {
      label: 'Due Date',
    },
    component: DueDateElement,
  },
  actions: {
    type: 'actions',
    name: 'Actions List',
    description: 'Track action items and their status',
    icon: ListChecks,
    defaultConfig: {
      label: 'Actions',
      placeholder: 'Add actions to track progress...',
    },
    component: ActionsElement,
  },
  stock_graph: {
    type: 'stock_graph',
    name: 'Stock Graph',
    description: 'Visual chart showing stock returns',
    icon: TrendingDown,
    defaultConfig: {
      label: 'Stock Symbol',
      placeholder: 'e.g., AAPL',
    },
    component: StockGraphElement,
  },
};

/**
 * Get component for rendering a specific form element type
 */
export function getFormElement(type: FormElementType): React.ComponentType<FormElementProps> {
  const metadata = LIBRARY_METADATA[type];
  if (!metadata) {
    throw new Error(`Unknown form element type: ${type}`);
  }
  return metadata.component;
}

/**
 * Get all elements for Template Builder UI
 * Used to populate the Element Library sidebar
 */
export function getAllElements(): ElementMetadata[] {
  return Object.values(LIBRARY_METADATA);
}

/**
 * Create default config when user adds element to template
 * Provides sensible defaults for each element type
 */
export function createDefaultConfig(
  type: FormElementType,
  customId: string
): FormElementConfig {
  const metadata = LIBRARY_METADATA[type];
  return {
    id: customId,
    type,
    ...metadata.defaultConfig,
  } as FormElementConfig;
}
