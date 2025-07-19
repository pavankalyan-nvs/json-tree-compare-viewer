import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AlertCircle, ChevronDown, ChevronRight, Copy, RefreshCw, X, Save, FolderOpen, Trash2, HelpCircle, Download } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './components/ui/alert';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import DarkModeToggle from './components/DarkModeToggle';
import { searchJsonTree } from './lib/searchUtils';
import HelpModal from './components/HelpModal';
import ComparisonStatsDisplay from './components/ComparisonStatsDisplay';
import { calculateJsonComparisonStats } from './lib/comparisonUtils';
import { useDebounce } from './hooks/useDebounce';
import { COLORS, SPACING, COMPONENT_STYLES } from './constants/theme';

const JsonNode = React.memo(({ data, otherData, path = [], isLeft, highlightPaths = [] }) => {
  const [isExpanded, setIsExpanded] = useState(path.length < 1);

  const currentPathString = path.join('.');
  const isHighlighted = highlightPaths.some(hPath => hPath.join('.') === currentPathString);

  // Handle keyboard navigation
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsExpanded(!isExpanded);
    }
  };

  if (typeof data !== 'object' || data === null) {
    const isDifferent = data !== otherData;
    let className = isDifferent
      ? isLeft
        ? COLORS.LEFT_ONLY
        : COLORS.RIGHT_ONLY
      : COLORS.MATCHING;
    
    const ariaLabel = `${isLeft ? 'Left' : 'Right'} JSON value: ${JSON.stringify(data)}${
      isDifferent ? ' (different from other side)' : ' (matches other side)'
    }`;
    
    return (
      <span 
        className={className}
        aria-label={ariaLabel}
        role="text"
      >
        {JSON.stringify(data)}
      </span>
    );
  }

  const isArray = Array.isArray(data);
  const entries = Object.entries(data);
  const nodeHighlightClass = isHighlighted ? COLORS.HIGHLIGHT : '';
  
  const nodeType = isArray ? 'array' : 'object';
  const nodeAriaLabel = `${isLeft ? 'Left' : 'Right'} JSON ${nodeType} at path ${currentPathString || 'root'}, ${
    isExpanded ? 'expanded' : 'collapsed'
  }, contains ${entries.length} ${isArray ? 'items' : 'properties'}`;

  return (
    <div className={`${SPACING.TREE_INDENT} ${SPACING.TREE_PADDING} ${COLORS.TREE_BORDER} ${nodeHighlightClass}`}>
      <button
        className={`cursor-pointer inline-flex items-center ${COLORS.HOVER} rounded ${SPACING.BUTTON_PADDING} ${COLORS.FOCUS_RING}`}
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={handleKeyDown}
        aria-expanded={isExpanded}
        aria-label={nodeAriaLabel}
        role="button"
        tabIndex={0}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        )}
        <span className={`ml-1 ${COLORS.NEUTRAL}`} aria-hidden="true">
          {isArray ? '[]' : '{}'}
        </span>
      </button>
      {isExpanded && (
        <div role="group" aria-label={`Contents of ${nodeType}`}>
          {entries.map(([key, value]) => {
            const newPath = [...path, key];
            const newPathString = newPath.join('.');
            const isChildHighlighted = highlightPaths.some(hPath => hPath.join('.') === newPathString);

            const otherValue = otherData && typeof otherData === 'object' ? otherData[key] : undefined;
            const isDifferent = !otherData || !(key in otherData);
            
            let keyClassName = isDifferent
              ? isLeft
                ? COLORS.LEFT_ONLY
                : COLORS.RIGHT_ONLY
              : COLORS.NEUTRAL;
            
            const entryHighlightClass = isChildHighlighted ? COLORS.HIGHLIGHT : '';
            const keyAriaLabel = `${isArray ? 'Index' : 'Property'} ${key}${isDifferent ? ' (only in this side)' : ''}`;

            return (
              <div key={key} className={`${SPACING.NODE_MARGIN} ${entryHighlightClass}`}>
                <span 
                  className={keyClassName}
                  aria-label={keyAriaLabel}
                  role="text"
                >
                  {isArray ? key : `"${key}":`}
                </span>{' '}
                <JsonNode
                  data={value}
                  otherData={otherValue}
                  path={newPath}
                  isLeft={isLeft}
                  highlightPaths={highlightPaths}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

const JsonTreeCompareViewer = () => {
  const [leftJson, setLeftJson] = useState('');
  const [rightJson, setRightJson] = useState('');
  const [parsedLeft, setParsedLeft] = useState(null);
  const [parsedRight, setParsedRight] = useState(null);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // 300ms delay
  const [leftHighlightPaths, setLeftHighlightPaths] = useState([]);
  const [rightHighlightPaths, setRightHighlightPaths] = useState([]);
  const [savedSessions, setSavedSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(''); // For dropdown selection and delete target
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [comparisonStats, setComparisonStats] = useState(null);

  const toggleDarkMode = () => {
    setDarkMode((prevDarkMode) => !prevDarkMode);
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Load sessions from Local Storage on component mount
  useEffect(() => {
    try {
      const sessionsRaw = localStorage.getItem("jsonCompareSessions");
      if (sessionsRaw) {
        const sessions = JSON.parse(sessionsRaw);
        // Sort sessions by timestamp descending (newest first) for better UX
        sessions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setSavedSessions(sessions);
      }
    } catch (e) {
      console.error("Error loading sessions from Local Storage:", e);
      alert("Failed to load sessions. Local Storage might be corrupted or inaccessible.");
    }
  }, []);

  useEffect(() => {
    if (debouncedSearchQuery && parsedLeft && parsedRight) {
      setLeftHighlightPaths(searchJsonTree(parsedLeft, debouncedSearchQuery));
      setRightHighlightPaths(searchJsonTree(parsedRight, debouncedSearchQuery));
    } else {
      setLeftHighlightPaths([]);
      setRightHighlightPaths([]);
    }
  }, [debouncedSearchQuery, parsedLeft, parsedRight]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? event.metaKey : event.ctrlKey;

      if (modifierKey && event.shiftKey && event.key === 'C') {
        event.preventDefault();
        handleCopy('left'); // Or 'right', or implement a way to choose
        console.log("Left JSON copied to clipboard via shortcut.");
      } else if (modifierKey && event.shiftKey && event.key === 'L') {
        event.preventDefault();
        handleClear('left');
        console.log("Left JSON cleared via shortcut.");
      } else if (modifierKey && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        handleClear('right');
        console.log("Right JSON cleared via shortcut.");
      } else if (modifierKey && event.key.toLowerCase() === 'd') { // Cmd+D or Ctrl+D, ensure lowercase 'd'
        event.preventDefault();
        toggleDarkMode();
        console.log("Dark mode toggled via shortcut.");
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []); // Empty dependency array means this effect runs once on mount and cleans up on unmount

  const handleCompare = () => {
    try {
      const pLeft = JSON.parse(leftJson);
      const pRight = JSON.parse(rightJson);
      setParsedLeft(pLeft);
      setParsedRight(pRight);
      setError('');
      const stats = calculateJsonComparisonStats(pLeft, pRight);
      setComparisonStats(stats);
    } catch (e) {
      setError('Invalid JSON input. Please check your JSON and try again.');
      setParsedLeft(null); 
      setParsedRight(null);
      setComparisonStats(null); // Clear stats on error
    }
  };

  const handleSaveSession = () => {
    const sessionName = window.prompt("Enter a name for this session:");
    if (!sessionName || sessionName.trim() === "") {
      alert("Session name cannot be empty. Save aborted.");
      return;
    }

    if (!leftJson && !rightJson) {
      alert("Cannot save an empty session. Please input JSON content.");
      return;
    }

    const newSession = {
      id: Date.now().toString(),
      name: sessionName.trim(),
      leftJson: leftJson,
      rightJson: rightJson,
      timestamp: new Date().toISOString(),
    };

    try {
      const existingSessionsRaw = localStorage.getItem("jsonCompareSessions");
      const existingSessions = existingSessionsRaw ? JSON.parse(existingSessionsRaw) : [];
      
      // Optional: Check for duplicate names, though not strictly required by current task
      // if (existingSessions.some(session => session.name === newSession.name)) {
      //   if (!window.confirm(`A session named "${newSession.name}" already exists. Overwrite?`)) {
      //     return;
      //   }
      //   existingSessions = existingSessions.filter(session => session.name !== newSession.name);
      // }

      const updatedSessions = [...existingSessions, newSession];
      localStorage.setItem("jsonCompareSessions", JSON.stringify(updatedSessions));
      // Sort sessions by timestamp descending (newest first) for better UX
      updatedSessions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setSavedSessions(updatedSessions); // Update state to refresh dropdown
      alert("Session saved successfully!");
    } catch (e) {
      console.error("Error saving session to Local Storage:", e);
      alert("Failed to save session. Local Storage might be full or disabled.");
    }
  };

  const handleLoadSession = (sessionId) => {
    if (!sessionId) {
      setSelectedSessionId(''); // Clear selection if default option is chosen
      return;
    }
    setSelectedSessionId(sessionId); // Track selected session

    const sessionToLoad = savedSessions.find(session => session.id === sessionId);
    if (sessionToLoad) {
      setLeftJson(sessionToLoad.leftJson || '');
      setRightJson(sessionToLoad.rightJson || '');
      
      try {
        setParsedLeft(JSON.parse(sessionToLoad.leftJson || 'null'));
        setParsedRight(JSON.parse(sessionToLoad.rightJson || 'null'));
        setError(''); 
        alert(`Session "${sessionToLoad.name}" loaded!`);
      } catch (e) {
        console.error("Error parsing JSON from loaded session:", e);
        setError('Invalid JSON in loaded session. Please check the session data.');
        setParsedLeft(null); 
        setParsedRight(null);
        alert(`Error loading session "${sessionToLoad.name}". Invalid JSON data.`);
      }
      setSearchQuery('');
    } else {
      alert("Failed to load session. Session not found.");
      setSelectedSessionId(''); // Clear selection if session not found
    }
  };
  
  const handleDeleteSession = (sessionIdToDelete) => {
    if (!sessionIdToDelete) {
      alert("No session selected to delete.");
      return;
    }

    const sessionToDelete = savedSessions.find(s => s.id === sessionIdToDelete);
    if (!sessionToDelete) {
        alert("Selected session not found for deletion.");
        return;
    }

    if (window.confirm(`Are you sure you want to delete the session "${sessionToDelete.name}"?`)) {
      try {
        const updatedSessions = savedSessions.filter(session => session.id !== sessionIdToDelete);
        localStorage.setItem("jsonCompareSessions", JSON.stringify(updatedSessions));
        setSavedSessions(updatedSessions);
        alert("Session deleted successfully!");
        if (selectedSessionId === sessionIdToDelete) {
          setSelectedSessionId(''); // Clear selection if the deleted session was selected
          // Optionally, clear the JSON inputs if the deleted session was loaded
          // setLeftJson('');
          // setRightJson('');
          // setParsedLeft(null);
          // setParsedRight(null);
        }
      } catch (e) {
        console.error("Error deleting session from Local Storage:", e);
        alert("Failed to delete session. Local Storage might be full or disabled.");
      }
    }
  };

  const handleCopy = (side) => {
    navigator.clipboard.writeText(side === 'left' ? leftJson : rightJson);
  };

  const handleClear = (side) => {
    if (side === 'left') {
      setLeftJson('');
      setParsedLeft(null);
    } else {
      setRightJson('');
      setParsedRight(null);
    }
    // If either side is cleared, the comparison is no longer valid / complete
    if (!parsedLeft || !parsedRight) {
      setComparisonStats(null);
    }
     // If both are cleared, also clear stats
    if (!leftJson && !rightJson) {
        setParsedLeft(null);
        setParsedRight(null);
        setComparisonStats(null);
    }
  };

  const handleJsonDownload = () => {
    if (!parsedLeft || !parsedRight || !comparisonStats) {
      alert("Please perform a comparison first to generate a report.");
      return;
    }

    const reportData = {
      leftJson: parsedLeft,
      rightJson: parsedRight,
      statistics: comparisonStats,
      timestamp: new Date().toISOString(),
    };

    const jsonString = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `json_comparison_report_${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePdfDownload = () => {
    if (!parsedLeft || !parsedRight || !comparisonStats) {
      alert("Please perform a comparison first to generate a report.");
      return;
    }

    const doc = new jsPDF();
    const timestamp = new Date().toISOString();

    // Title
    doc.setFontSize(18);
    doc.text("JSON Comparison Report", 14, 22);

    // Timestamp
    doc.setFontSize(10);
    doc.text(`Report generated on: ${timestamp}`, 14, 30);

    // Statistics Table
    const statMetrics = [
      { key: 'totalLeftItems', label: 'Total Properties/Elements (Left)' },
      { key: 'totalRightItems', label: 'Total Properties/Elements (Right)' },
      { key: 'commonPaths', label: 'Common Paths (Keys/Indices)' },
      { key: 'matchingValues', label: 'Matching Values (at Common Paths)' },
      { key: 'differentValues', label: 'Different Values (at Common Paths)' },
      { key: 'onlyInLeft', label: 'Exclusive to Left (Paths)' },
      { key: 'onlyInRight', label: 'Exclusive to Right (Paths)' },
    ];
    
    const tableBody = statMetrics.map(metric => [
      metric.label,
      comparisonStats[metric.key] !== undefined && comparisonStats[metric.key] !== null 
        ? comparisonStats[metric.key].toLocaleString() 
        : 'N/A'
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Metric', 'Value']],
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [22, 160, 133] }, // Dark cyan
      margin: { top: 10 }
    });
    
    // Summary of Differences
    let finalY = (doc).lastAutoTable.finalY || 50; // Get Y position after the table
    doc.setFontSize(14);
    doc.text("Summary of Differences", 14, finalY + 10);

    doc.setFontSize(10);
    let summaryTextY = finalY + 18;
    doc.text(`- Items only in Left JSON: ${comparisonStats.onlyInLeft}`, 14, summaryTextY);
    summaryTextY += 7;
    doc.text(`- Items only in Right JSON: ${comparisonStats.onlyInRight}`, 14, summaryTextY);
    summaryTextY += 7;
    doc.text(`- Items with different values: ${comparisonStats.differentValues}`, 14, summaryTextY);

    // Optionally, list a few differing paths (simplified)
    if (comparisonStats.differences && comparisonStats.differences.length > 0) {
      summaryTextY += 10;
      doc.setFontSize(12);
      doc.text("Examples of differing paths:", 14, summaryTextY);
      doc.setFontSize(9);
      summaryTextY += 6;
      const maxExamples = 5;
      comparisonStats.differences.slice(0, maxExamples).forEach((diff, index) => {
        if (summaryTextY > 280) return; // Avoid going off page
        doc.text(`  - Path: ${diff.path}`, 14, summaryTextY);
        summaryTextY += 5;
      });
    }
    
    doc.save(`json_comparison_report_${timestamp}.pdf`);
  };

  return (
    <div className={`p-4 max-w-7xl mx-auto ${darkMode ? 'dark' : ''}`}>
      <div className="dark:bg-gray-800 dark:text-white transition-colors duration-200">
        <Card className="mb-6 dark:bg-gray-700">
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="text-2xl font-bold dark:text-white">JSON Tree Compare Viewer</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleSaveSession} className="dark:text-white dark:border-white">
                <Save className="h-4 w-4 mr-1" /> Save Session
              </Button>
              {savedSessions.length > 0 ? (
                <>
                  <select
                    value={selectedSessionId} // Controlled component
                    onChange={(e) => handleLoadSession(e.target.value)}
                    className="p-2 border rounded text-sm bg-white dark:bg-gray-600 dark:text-white dark:border-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label="Load session"
                  >
                    <option value="" disabled>-- Select a session --</option>
                    {savedSessions.map(session => (
                      <option key={session.id} value={session.id}>
                        {session.name} ({new Date(session.timestamp).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => handleDeleteSession(selectedSessionId)} 
                    disabled={!selectedSessionId}
                    className="dark:text-white dark:border-white disabled:dark:text-gray-400 disabled:dark:border-gray-600"
                    aria-label="Delete selected session"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" disabled className="dark:text-gray-400 dark:border-gray-600">
                  <FolderOpen className="h-4 w-4 mr-1" /> No Saved Sessions
                </Button>
              )}
              <DarkModeToggle darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setIsHelpModalOpen(true)}
                className="dark:text-white dark:border-white"
                aria-label="Open help section"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleJsonDownload} 
                className="dark:text-white dark:border-white"
                aria-label="Download JSON Report"
                title="Download JSON Report"
                disabled={!parsedLeft || !parsedRight || !comparisonStats}
              >
                JSON
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePdfDownload} 
                className="dark:text-white dark:border-white"
                aria-label="Download PDF Report"
                title="Download PDF Report"
                disabled={!parsedLeft || !parsedRight || !comparisonStats}
              >
                PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="w-full md:w-1/2">
                <div className="mb-2 flex justify-between items-center">
                  <h3 className="text-lg font-semibold dark:text-white">Left JSON</h3>
                  <div>
                    <Button variant="outline" size="sm" onClick={() => handleCopy('left')} className="mr-2 dark:text-white dark:border-white">
                      <Copy className="h-4 w-4 mr-1" /> Copy
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleClear('left')} className="dark:text-white dark:border-white">
                      <RefreshCw className="h-4 w-4 mr-1" /> Clear
                    </Button>
                  </div>
                </div>
                <textarea
                  className="w-full h-40 p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-600 dark:text-white dark:border-gray-500"
                  value={leftJson}
                  onChange={(e) => setLeftJson(e.target.value)}
                  placeholder="Enter left JSON here"
                  aria-label="Left JSON input"
                  aria-describedby="left-json-help"
                />
                <div id="left-json-help" className="sr-only">
                  Enter your first JSON data for comparison. The JSON will be validated when you click Compare.
                </div>
              </div>
              <div className="w-full md:w-1/2">
                <div className="mb-2 flex justify-between items-center">
                  <h3 className="text-lg font-semibold dark:text-white">Right JSON</h3>
                  <div>
                    <Button variant="outline" size="sm" onClick={() => handleCopy('right')} className="mr-2 dark:text-white dark:border-white">
                      <Copy className="h-4 w-4 mr-1" /> Copy
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleClear('right')} className="dark:text-white dark:border-white">
                      <RefreshCw className="h-4 w-4 mr-1" /> Clear
                    </Button>
                  </div>
                </div>
                <textarea
                  className="w-full h-40 p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-600 dark:text-white dark:border-gray-500"
                  value={rightJson}
                  onChange={(e) => setRightJson(e.target.value)}
                  placeholder="Enter right JSON here"
                  aria-label="Right JSON input"
                  aria-describedby="right-json-help"
                />
                <div id="right-json-help" className="sr-only">
                  Enter your second JSON data for comparison. The JSON will be validated when you click Compare.
                </div>
              </div>
            </div>
            <Button onClick={handleCompare} className="w-full bg-gray-900 text-white hover:bg-gray-800 transition-colors dark:bg-gray-600 dark:hover:bg-gray-500">
              Compare
            </Button>
          </CardContent>
        </Card>

        <ComparisonStatsDisplay stats={comparisonStats} />

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {parsedLeft && parsedRight && (
          <>
            <div className="mb-4 relative">
              <input
                type="text"
                placeholder="Search keys/values..."
                className="w-full p-2 pr-10 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-600 dark:text-white dark:border-gray-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery.length > 0 && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  aria-label="Clear search"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            <Card className="dark:bg-gray-700">
              <CardHeader>
                <CardTitle className="text-xl font-semibold dark:text-white">Comparison Result</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/2">
                  <h3 className="text-lg font-semibold mb-2 dark:text-white">Left JSON</h3>
                  <div className="border rounded p-4 bg-gray-50 dark:bg-gray-600 dark:border-gray-500">
                    <JsonNode data={parsedLeft} otherData={parsedRight} isLeft={true} highlightPaths={leftHighlightPaths} />
                  </div>
                </div>
                <div className="w-full md:w-1/2">
                  <h3 className="text-lg font-semibold mb-2 dark:text-white">Right JSON</h3>
                  <div className="border rounded p-4 bg-gray-50 dark:bg-gray-600 dark:border-gray-500">
                    <JsonNode data={parsedRight} otherData={parsedLeft} isLeft={false} highlightPaths={rightHighlightPaths} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </>
        )}

        <div className="mt-6 bg-gray-100 p-4 rounded dark:bg-gray-700">
          <h3 className="text-lg font-semibold mb-2 dark:text-white">Legend</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="dark:text-white"><span className="inline-block w-4 h-4 bg-red-600 mr-2"></span>Extra data in left JSON</div>
            <div className="dark:text-white"><span className="inline-block w-4 h-4 bg-blue-600 mr-2"></span>Extra data in right JSON</div>
            <div className="dark:text-white"><span className="inline-block w-4 h-4 bg-green-600 mr-2"></span>Matching primitive values</div>
            <div className="dark:text-white"><span className="inline-block w-4 h-4 bg-gray-400 mr-2"></span>Matching keys or array indices</div>
          </div>
        </div>
      </div>
      <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
    </div>
  );
};
export default JsonTreeCompareViewer;
