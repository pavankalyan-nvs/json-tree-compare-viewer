import React from 'react';
import { X } from 'lucide-react';

const HelpModal = ({ isOpen, onClose }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="relative w-full max-w-2xl p-6 mx-4 bg-white rounded-lg shadow-xl dark:bg-gray-800 transition-all duration-300 transform scale-95 opacity-0 animate-modalShow"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            How to Use This Tool
          </h3>
          <button
            type="button"
            className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-4 text-sm text-gray-700 dark:text-gray-300 max-h-[70vh] overflow-y-auto pr-2">
          <section className="mb-4">
            <h4 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">I. Welcome & Introduction</h4>
            <p>Welcome to the JSON Tree Compare Viewer! This tool helps you compare two JSON structures side-by-side, highlighting their differences and similarities in an intuitive tree format.</p>
          </section>

          <section className="mb-4">
            <h4 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">II. Getting Started: Basic Comparison</h4>
            <ol className="list-decimal list-inside space-y-1">
              <li><strong>Paste JSON:</strong> Copy your first JSON data and paste it into the <strong>Left JSON</strong> textarea. Do the same for your second JSON data in the <strong>Right JSON</strong> textarea.</li>
              <li><strong>Copy/Clear:</strong> Use the <code>Copy</code> button above each textarea to copy its content. Use the <code>Clear</code> button to empty the textarea.</li>
              <li><strong>Compare:</strong> Click the <code>Compare</code> button located below the textareas.</li>
              <li><strong>Invalid JSON:</strong> If either input contains invalid JSON, an error message will appear, and the comparison will not proceed until the JSON is corrected.</li>
            </ol>
          </section>

          <section className="mb-4">
            <h4 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">III. Understanding the Comparison View</h4>
            <p className="mb-2">Once you compare valid JSON, the results will appear in two panels, mirroring the left and right inputs.</p>
            <h5 className="text-md font-semibold my-1 text-gray-800 dark:text-white">Layout:</h5>
            <p>Each panel displays a tree structure. Differences are highlighted using colors.</p>
            <h5 className="text-md font-semibold my-1 text-gray-800 dark:text-white">Color Legend:</h5>
            <ul className="list-disc list-inside space-y-1">
              <li><span className="font-semibold text-red-600">Red Text/Highlight:</span> Indicates data (keys or values) present only in the Left JSON.</li>
              <li><span className="font-semibold text-blue-600">Blue Text/Highlight:</span> Indicates data (keys or values) present only in the Right JSON.</li>
              <li><span className="font-semibold text-green-600">Green Text:</span> Indicates primitive values (strings, numbers, booleans) that are identical in both JSON structures at the same path.</li>
              <li><span className="font-semibold text-gray-700 dark:text-gray-300">Gray/Default Text for Keys:</span> Indicates keys that are present in both JSON structures and have the same value (if the value is an object/array) or whose primitive values match (then green).</li>
            </ul>
             <p className="mt-1 text-xs"><em>(The legend at the bottom of the page also provides a quick color reference.)</em></p>
            
            <h5 className="text-md font-semibold my-2 text-gray-800 dark:text-white">Comparison Statistics:</h5>
            <p className="mb-1">After a successful comparison, a 'Comparison Statistics' card will appear above the detailed tree view. This provides a quantitative summary, including:</p>
            <ul className="list-disc list-inside space-y-1 pl-4">
                <li>Total properties/elements in each JSON.</li>
                <li>Number of common paths (keys/indices).</li>
                <li>Number of matching or different values at common paths.</li>
                <li>Number of paths exclusive to the left or right JSON.</li>
            </ul>
            <p className="mt-1">These stats offer a high-level overview of the differences and similarities before diving into the tree details.</p>
          </section>

          <section className="mb-4">
            <h4 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">IV. Navigating the JSON Tree</h4>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Expand/Collapse:</strong> Click the <code>▶</code> (ChevronRight) icon next to an object <code>{'{...}'}</code> or array <code>{'[...]'}</code> to expand its contents. Click the <code>▼</code> (ChevronDown) icon to collapse it.</li>
              <li><strong>Initial View:</strong> By default, only the root level of the JSON is expanded. All nested objects and arrays are initially collapsed.</li>
              <li><strong>Lazy Loading:</strong> For very large JSON structures, the tool loads deeper parts of the tree on demand as you expand nodes. This improves performance for complex data.</li>
            </ul>
          </section>

          <section className="mb-4">
            <h4 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">V. Searching Within JSON</h4>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Search Bar:</strong> After a comparison, a search bar appears above the results. Type your query here.</li>
              <li><strong>What it Searches:</strong> The search is case-insensitive and looks for matches in both <strong>keys</strong> and <strong>primitive values</strong> (strings, numbers, booleans) within both JSON trees.</li>
              <li><strong>Highlighting:</strong> Matched keys or values will be highlighted with a <span className="bg-yellow-200 dark:bg-yellow-700 px-1 rounded">yellow background</span>.</li>
              <li><strong>Clearing Search:</strong> Click the <code>X</code> icon in the search bar to clear the query and remove highlights.</li>
              <li><strong>Behavior with Collapsed Nodes:</strong> If a match is found within a collapsed node, the ancestor nodes leading to the match will be highlighted. Expanding these nodes will reveal the highlighted match.</li>
            </ul>
          </section>

          <section className="mb-4">
            <h4 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">VI. Managing Comparison Sessions</h4>
            <p className="mb-1">You can save and load your comparison sessions (the content of Left and Right JSON inputs).</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Saving:</strong> Click the <code>Save Session</code> button. You'll be prompted to enter a name. Sessions are stored in your browser's Local Storage.</li>
              <li><strong>Loading:</strong> If you have saved sessions, a dropdown menu will appear. Select a session by its name and timestamp (newest first) to load it. The JSON inputs will be populated, and a comparison will run automatically.</li>
              <li><strong>Deleting:</strong> Select a session from the dropdown. The <code>Trash</code> icon button next to the dropdown will become active. Click it and confirm to delete the selected session.</li>
              <li><strong>Local Storage Note:</strong> Sessions are stored locally in your browser. Clearing your browser's cache or site data may remove saved sessions. This feature is for convenience, not permanent storage.</li>
            </ul>
          </section>

          <section className="mb-4">
            <h4 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">VII. Other Features</h4>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Dark Mode:</strong> Click the moon/sun icon in the header to toggle between light and dark themes for the application.</li>
            </ul>
          </section>

          <section className="mb-4">
            <h4 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">VIII. Keyboard Shortcuts</h4>
            <p className="mb-1">Use these shortcuts for faster navigation and actions:</p>
            <ul className="list-disc list-inside space-y-1 pl-4">
              <li>
                <strong>Toggle Dark Mode:</strong> <kbd>Ctrl</kbd> + <kbd>D</kbd> (or <kbd>Cmd</kbd> + <kbd>D</kbd> on Mac)
              </li>
              <li>
                <strong>Copy Left JSON:</strong> <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd> (or <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd> on Mac)
              </li>
              <li>
                <strong>Clear Left JSON:</strong> <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>L</kbd> (or <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>L</kbd> on Mac)
              </li>
              <li>
                <strong>Clear Right JSON:</strong> <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd> (or <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd> on Mac)
              </li>
            </ul>
          </section>

          <section>
            <h4 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">IX. Tips for Effective Use</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>For large JSON, use the search and expand/collapse features to navigate efficiently.</li>
              <li>Ensure your JSON is valid before pasting. Online JSON validators can help if you encounter issues.</li>
              <li>Remember that session storage is local to your current browser.</li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-4 border-t border-gray-200 dark:border-gray-700 rounded-b">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-800"
          >
            Close
          </button>
        </div>
      </div>
      {/* Basic CSS for modal animation - can be moved to index.css or App.css if preferred */}
      <style jsx global>{`
        @keyframes modalShow {
          0% {
            transform: scale(0.95);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-modalShow {
          animation: modalShow 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default HelpModal;
