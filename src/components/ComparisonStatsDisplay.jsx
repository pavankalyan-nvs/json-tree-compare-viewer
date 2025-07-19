import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'; // Assuming path is correct

const ComparisonStatsDisplay = ({ stats }) => {
  if (!stats) {
    return null;
  }

  // Define the order and labels for stats
  const statMetrics = [
    { key: 'totalLeftItems', label: 'Total Properties/Elements (Left)' },
    { key: 'totalRightItems', label: 'Total Properties/Elements (Right)' },
    { key: 'commonPaths', label: 'Common Paths (Keys/Indices)' },
    { key: 'matchingValues', label: 'Matching Values (at Common Paths)' },
    { key: 'differentValues', label: 'Different Values (at Common Paths)' },
    { key: 'onlyInLeft', label: 'Exclusive to Left (Paths)' },
    { key: 'onlyInRight', label: 'Exclusive to Right (Paths)' },
  ];

  return (
    <Card className="mb-6 dark:bg-gray-700">
      <CardHeader>
        <CardTitle className="text-xl font-semibold dark:text-white">Comparison Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          {statMetrics.map(metric => (
            <div key={metric.key} className="flex justify-between text-sm py-1 border-b border-gray-200 dark:border-gray-600 last:border-b-0 md:last:border-b-0">
              <span className="text-gray-600 dark:text-gray-300">{metric.label}:</span>
              <span className="font-semibold text-gray-800 dark:text-white">
                {stats[metric.key] !== undefined && stats[metric.key] !== null ? stats[metric.key].toLocaleString() : 'N/A'}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ComparisonStatsDisplay;
