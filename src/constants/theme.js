// Theme constants for consistent styling across the application

export const COLORS = {
  // Difference highlighting colors
  LEFT_ONLY: 'text-red-600 font-semibold',
  RIGHT_ONLY: 'text-blue-600 font-semibold',
  MATCHING: 'text-green-600',
  NEUTRAL: 'text-gray-700 dark:text-gray-300',
  
  // Background colors
  HIGHLIGHT: 'bg-yellow-200 dark:bg-yellow-700 rounded p-1',
  HOVER: 'hover:bg-gray-100 dark:hover:bg-gray-600',
  
  // Border colors
  BORDER: 'border-gray-200 dark:border-gray-500',
  TREE_BORDER: 'border-l-2 border-gray-200',
  
  // Focus states
  FOCUS_RING: 'focus:outline-none focus:ring-2 focus:ring-blue-500',
};

export const SPACING = {
  TREE_INDENT: 'ml-4',
  TREE_PADDING: 'pl-2',
  NODE_MARGIN: 'my-1',
  CONTENT_PADDING: 'p-2',
  BUTTON_PADDING: 'px-1',
};

export const TYPOGRAPHY = {
  HEADING_LARGE: 'text-2xl font-bold',
  HEADING_MEDIUM: 'text-xl font-semibold',
  HEADING_SMALL: 'text-lg font-semibold',
  BODY_SMALL: 'text-sm',
  FONT_SEMIBOLD: 'font-semibold',
};

export const LAYOUT = {
  FULL_WIDTH: 'w-full',
  HALF_WIDTH: 'w-full md:w-1/2',
  MAX_WIDTH: 'max-w-7xl',
  FLEX_ROW: 'flex flex-col md:flex-row',
  FLEX_GAP: 'gap-4',
  FLEX_CENTER: 'flex items-center justify-center',
  GRID_RESPONSIVE: 'grid grid-cols-1 md:grid-cols-2',
};

export const COMPONENT_STYLES = {
  CARD: 'mb-6 dark:bg-gray-700',
  BUTTON_OUTLINE: 'dark:text-white dark:border-white',
  INPUT_FIELD: 'w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-600 dark:text-white dark:border-gray-500',
  TEXTAREA: 'w-full h-40 p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-600 dark:text-white dark:border-gray-500',
};

export const ANIMATIONS = {
  TRANSITION: 'transition-colors duration-200',
};