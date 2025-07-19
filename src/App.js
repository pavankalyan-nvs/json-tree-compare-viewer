import React, { useState, useEffect } from 'react';
import JsonTreeCompareViewer from './JsonTreeCompareViewer';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <ErrorBoundary>
      <div className={`App min-h-screen ${darkMode ? 'dark' : ''}`}>
        <div className="dark:bg-gray-900 min-h-screen transition-colors duration-200">
          <JsonTreeCompareViewer darkMode={darkMode} setDarkMode={setDarkMode} />
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
