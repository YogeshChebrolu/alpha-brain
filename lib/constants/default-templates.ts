import { FormElementConfig } from '@/types/form-element.types';

/**
 * Default Idea Template
 * Core template with 5 essential fields:
 * - Title, Explanation, Resources, Actions, Due Date
 */
export const DEFAULT_IDEA_TEMPLATE: FormElementConfig[] = [
  {
    id: 'title',
    type: 'text',
    label: 'Idea Title',
    placeholder: 'What is your idea?',
    required: true,
  },
  {
    id: 'explanation',
    type: 'markdown',
    label: 'Explanation',
    placeholder: 'Describe your idea in detail...',
  },
  {
    id: 'resources',
    type: 'file_upload',
    label: 'Resources',
  },
  {
    id: 'actions',
    type: 'actions',
    label: 'Actions',
    placeholder: 'What steps will you take?',
  },
  {
    id: 'due',
    type: 'due_date',
    label: 'Due Date',
  },
];

/**
 * Stock Thesis Template
 * Template for investment thesis ideas
 */
export const STOCK_THESIS_TEMPLATE: FormElementConfig[] = [
  {
    id: 'title',
    type: 'text',
    label: 'Thesis Title',
    placeholder: 'e.g., NVDA Long - AI Revolution',
    required: true,
  },
  {
    id: 'ticker',
    type: 'stock_ticker',
    label: 'Stock Ticker',
    placeholder: 'e.g., AAPL',
    required: true,
  },
  {
    id: 'thesis_type',
    type: 'select',
    label: 'Thesis Type',
    options: ['Long Term', 'Swing Trade', 'Event Driven', 'Value Play', 'Growth'],
  },
  {
    id: 'thesis',
    type: 'markdown',
    label: 'Investment Thesis',
    placeholder: 'Why do you believe in this investment?',
  },
  {
    id: 'entry_price',
    type: 'text',
    label: 'Target Entry Price',
    placeholder: 'e.g., $150',
  },
  {
    id: 'resources',
    type: 'file_upload',
    label: 'Research & Charts',
  },
];

/**
 * Book Notes Template
 */
export const BOOK_NOTES_TEMPLATE: FormElementConfig[] = [
  {
    id: 'title',
    type: 'text',
    label: 'Book Title',
    required: true,
  },
  {
    id: 'author',
    type: 'text',
    label: 'Author',
  },
  {
    id: 'key_insights',
    type: 'markdown',
    label: 'Key Insights',
    placeholder: 'What did you learn from this book?',
  },
  {
    id: 'quotes',
    type: 'textarea',
    label: 'Favorite Quotes',
  },
  {
    id: 'rating',
    type: 'select',
    label: 'Rating',
    options: ['5 - Must Read', '4 - Great', '3 - Good', '2 - Okay', '1 - Skip'],
  },
];
