/**
 * Retrieves a value from jsonData given a path array.
 * @param {object|array} jsonData - The JSON object or array to traverse.
 * @param {string[]} pathArray - An array of keys/indices representing the path.
 * @returns {*} The value at the specified path, or undefined if the path is invalid.
 */
export const getValueByPath = (jsonData, pathArray) => {
  if (jsonData === undefined || jsonData === null || !pathArray || pathArray.length === 0) {
    return jsonData; // Return the data itself if path is empty or data is primitive
  }
  let current = jsonData;
  for (const key of pathArray) {
    if (typeof current !== 'object' || current === null || !current.hasOwnProperty(key)) {
      return undefined; // Path is invalid or does not exist
    }
    current = current[key];
  }
  return current;
};

/**
 * Compares two values using deep equality that ignores object key order.
 * @param {*} valueA - The first value.
 * @param {*} valueB - The second value.
 * @returns {boolean} True if values are equal, false otherwise.
 */
export const areValuesEqual = (valueA, valueB) => {
  // Handle null and undefined cases
  if (valueA === valueB) return true;
  if (valueA == null || valueB == null) return false;
  if (typeof valueA !== typeof valueB) return false;

  // For primitives
  if (typeof valueA !== 'object') return valueA === valueB;

  // For arrays
  if (Array.isArray(valueA)) {
    if (!Array.isArray(valueB)) return false;
    if (valueA.length !== valueB.length) return false;
    for (let i = 0; i < valueA.length; i++) {
      if (!areValuesEqual(valueA[i], valueB[i])) return false;
    }
    return true;
  }

  // For objects
  if (Array.isArray(valueB)) return false;
  
  const keysA = Object.keys(valueA);
  const keysB = Object.keys(valueB);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!areValuesEqual(valueA[key], valueB[key])) return false;
  }
  
  return true;
};

/**
 * Recursively traverses jsonData and collects all unique path strings.
 * A path string represents a route to any node (primitive, object, or array).
 * @param {object|array} jsonData - The JSON object or array.
 * @param {string[]} currentPath - The current path being traversed (used internally for recursion).
 * @param {Set<string>} paths - A Set to store unique path strings (used internally for recursion).
 * @returns {Set<string>} A Set of unique path strings.
 */
export const getAllPaths = (jsonData, currentPath = [], paths = new Set()) => {
  // Add the current path for the current node itself (object, array, or primitive)
  // If currentPath is empty, it's the root, which we don't represent as a path unless it's a primitive.
  // However, for consistency in stat calculation, we might want a root representation if needed,
  // or ensure the iteration logic handles root values if they aren't objects/arrays.
  // For this implementation, paths lead TO nodes. If jsonData is primitive, path is empty.
  
  if (typeof jsonData !== 'object' || jsonData === null) {
    // If jsonData is a primitive, and currentPath is not empty, this path leads to this primitive.
    if (currentPath.length > 0) {
         paths.add(currentPath.join('.'));
    } else {
        // If jsonData itself is a primitive at the root, we can add a special marker or handle it
        // in the stats calculation. For now, root primitives won't generate a path string via this.
        // The logic in calculateJsonComparisonStats will handle comparing root primitives directly.
    }
    return paths;
  }

  // Add path for the current object/array itself, if not root
  if (currentPath.length > 0) {
      paths.add(currentPath.join('.'));
  }

  if (Array.isArray(jsonData)) {
    jsonData.forEach((item, index) => {
      getAllPaths(item, [...currentPath, String(index)], paths);
    });
  } else { // It's an object
    for (const key in jsonData) {
      if (Object.prototype.hasOwnProperty.call(jsonData, key)) {
        getAllPaths(jsonData[key], [...currentPath, key], paths);
      }
    }
  }
  return paths;
};


/**
 * Calculates comparison statistics between two JSON objects/arrays.
 * @param {object|array|null} jsonA - The first JSON data.
 * @param {object|array|null} jsonB - The second JSON data.
 * @returns {object} An object containing comparison statistics.
 */
export const calculateJsonComparisonStats = (jsonA, jsonB) => {
  const stats = {
    totalLeftItems: 0,    // Total unique paths in Left JSON
    totalRightItems: 0,   // Total unique paths in Right JSON
    commonPaths: 0,       // Number of paths present in both
    matchingValues: 0,    // Number of common paths with identical values
    differentValues: 0,   // Number of common paths with different values
    onlyInLeft: 0,        // Number of paths present only in Left JSON
    onlyInRight: 0,       // Number of paths present only in Right JSON
  };

  // Handle cases where one or both JSON inputs are null/undefined or not objects/arrays (primitives at root)
  if (typeof jsonA !== 'object' || jsonA === null) {
    if (typeof jsonB !== 'object' || jsonB === null) { // Both are primitive or null
      stats.totalLeftItems = jsonA === undefined ? 0 : 1; // Count root as 1 item if not undefined
      stats.totalRightItems = jsonB === undefined ? 0 : 1;
      if (jsonA !== undefined || jsonB !== undefined) { // if at least one is not undefined
          stats.commonPaths = (jsonA !== undefined && jsonB !== undefined) ? 1: 0; // if both defined, they share the "root" path
          if (areValuesEqual(jsonA, jsonB)) {
            stats.matchingValues = stats.commonPaths;
          } else {
            stats.differentValues = stats.commonPaths;
          }
          if (jsonA !== undefined && jsonB === undefined) stats.onlyInLeft = 1;
          if (jsonB !== undefined && jsonA === undefined) stats.onlyInRight = 1;
      }
    } else { // jsonA is primitive/null, jsonB is object/array
      stats.totalLeftItems = jsonA === undefined ? 0 : 1;
      const pathsB = getAllPaths(jsonB);
      stats.totalRightItems = pathsB.size > 0 ? pathsB.size : 1; // count root object/array itself if not empty
      stats.onlyInLeft = stats.totalLeftItems;
      stats.onlyInRight = stats.totalRightItems;
    }
    return stats;
  } else if (typeof jsonB !== 'object' || jsonB === null) { // jsonA is object/array, jsonB is primitive/null
    const pathsA = getAllPaths(jsonA);
    stats.totalLeftItems = pathsA.size > 0 ? pathsA.size : 1;
    stats.totalRightItems = jsonB === undefined ? 0 : 1;
    stats.onlyInLeft = stats.totalLeftItems;
    stats.onlyInRight = stats.totalRightItems;
    return stats;
  }

  // Both jsonA and jsonB are objects or arrays
  const pathsA = getAllPaths(jsonA);
  const pathsB = getAllPaths(jsonB);

  stats.totalLeftItems = pathsA.size;
  stats.totalRightItems = pathsB.size;
  
  // If root objects/arrays are empty, they still count as one item path (empty string path from getAllPaths logic)
  // The problem with empty string path is it will not be added by current getAllPaths if currentPath.length is 0
  // Let's adjust getAllPaths to add a root marker if needed, or just handle count here.
  // For now, if pathsA/B is empty but jsonA/B is an object/array, it means it's an empty obj/arr.
  if (stats.totalLeftItems === 0 && typeof jsonA === 'object' && jsonA !== null) stats.totalLeftItems = 1;
  if (stats.totalRightItems === 0 && typeof jsonB === 'object' && jsonB !== null) stats.totalRightItems = 1;


  const allUniquePathStrings = new Set([...pathsA, ...pathsB]);
  
  // If both are empty objects/arrays, they are common and match.
  if (pathsA.size === 0 && pathsB.size === 0 && typeof jsonA === 'object' && typeof jsonB === 'object') {
    stats.commonPaths = 1; // The "root" path
    if (areValuesEqual(jsonA, jsonB)) { // e.g. {} vs {} or [] vs []
        stats.matchingValues = 1;
    } else { // e.g. {} vs []
        stats.differentValues = 1;
    }
    return stats;
  }


  allUniquePathStrings.forEach(pathStr => {
    const pathArray = pathStr.split('.');
    const valueA = getValueByPath(jsonA, pathArray);
    const valueB = getValueByPath(jsonB, pathArray);

    const inA = pathsA.has(pathStr);
    const inB = pathsB.has(pathStr);

    if (inA && inB) {
      stats.commonPaths++;
      if (areValuesEqual(valueA, valueB)) {
        stats.matchingValues++;
      } else {
        stats.differentValues++;
      }
    } else if (inA) {
      stats.onlyInLeft++;
    } else if (inB) {
      stats.onlyInRight++;
    }
  });
  
  // Special case for root comparison if both are non-empty objects/arrays but paths were generated
  // Check if "root" itself should be considered a common path if not captured by getAllPaths (if it returns empty for root)
  // Current getAllPaths adds path for current object if currentPath.length > 0.
  // This means the root object itself is not in pathsA/pathsB.
  // We need to decide: are totalItems the number of nodes, or number of "addressable" paths?
  // The prompt: "totalLeftItems = pathsA.size". This implies we count nodes that have a path.
  // If jsonA = {} and jsonB = {}, pathsA and pathsB are empty.
  // My adjustment for empty objects handles this.

  return stats;
};
