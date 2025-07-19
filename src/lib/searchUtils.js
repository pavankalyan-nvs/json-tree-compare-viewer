export const searchJsonTree = (jsonData, searchQuery, currentPath = []) => {
  if (jsonData === null || jsonData === undefined) {
    return [];
  }

  let results = [];
  const lowerCaseSearchQuery = searchQuery.toLowerCase();

  if (Array.isArray(jsonData)) {
    jsonData.forEach((item, index) => {
      // Check if the index itself matches (less common, but for completeness)
      // No, this doesn't make sense for arrays, an index is a number.

      // Check the value
      if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
        if (String(item).toLowerCase().includes(lowerCaseSearchQuery)) {
          results.push([...currentPath, index]);
        }
      } else if (typeof item === 'object' && item !== null) {
        results = results.concat(searchJsonTree(item, searchQuery, [...currentPath, index]));
      }
    });
  } else if (typeof jsonData === 'object') {
    for (const key in jsonData) {
      if (Object.prototype.hasOwnProperty.call(jsonData, key)) {
        // Check if the key matches
        if (key.toLowerCase().includes(lowerCaseSearchQuery)) {
          results.push([...currentPath, key]);
        }

        const value = jsonData[key];
        // Check the value
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          if (String(value).toLowerCase().includes(lowerCaseSearchQuery)) {
            // Avoid duplicate paths if key already matched
            const path = [...currentPath, key];
            if (!results.some(r => r.join(',') === path.join(','))) {
                 results.push(path);
            }
          }
        } else if (typeof value === 'object' && value !== null) {
          results = results.concat(searchJsonTree(value, searchQuery, [...currentPath, key]));
        }
      }
    }
  }

  // Deduplicate results - recursive calls might add overlapping paths
  const uniqueResults = [];
  const seenPaths = new Set();
  for (const path of results) {
    const pathString = path.join(',');
    if (!seenPaths.has(pathString)) {
      uniqueResults.push(path);
      seenPaths.add(pathString);
    }
  }
  return uniqueResults;
};