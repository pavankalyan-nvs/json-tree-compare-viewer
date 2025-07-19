import { getValueByPath, areValuesEqual, getAllPaths, calculateJsonComparisonStats } from './comparisonUtils';

describe('comparisonUtils', () => {
  describe('getValueByPath', () => {
    const testData = {
      a: 1,
      b: { c: 2, d: [3, 4, { e: 5 }] },
      f: null,
    };

    test('should get primitive values', () => {
      expect(getValueByPath(testData, ['a'])).toBe(1);
      expect(getValueByPath(testData, ['b', 'c'])).toBe(2);
      expect(getValueByPath(testData, ['b', 'd', '0'])).toBe(3);
      expect(getValueByPath(testData, ['b', 'd', '2', 'e'])).toBe(5);
    });

    test('should get object/array values', () => {
      expect(getValueByPath(testData, ['b'])).toEqual({ c: 2, d: [3, 4, { e: 5 }] });
      expect(getValueByPath(testData, ['b', 'd'])).toEqual([3, 4, { e: 5 }]);
      expect(getValueByPath(testData, ['b', 'd', '2'])).toEqual({ e: 5 });
    });
    
    test('should return undefined for invalid or non-existent paths', () => {
      expect(getValueByPath(testData, ['x'])).toBeUndefined();
      expect(getValueByPath(testData, ['a', 'x'])).toBeUndefined(); // 'a' is primitive
      expect(getValueByPath(testData, ['b', 'd', '5'])).toBeUndefined(); // Index out of bounds
      expect(getValueByPath(testData, ['b', 'x', 'e'])).toBeUndefined();
      expect(getValueByPath(null, ['a'])).toBeUndefined();
      expect(getValueByPath({}, ['a'])).toBeUndefined();
    });

    test('should return the data itself for empty or null path', () => {
      expect(getValueByPath(testData, [])).toEqual(testData);
      expect(getValueByPath(testData, null)).toEqual(testData);
      expect(getValueByPath(123, [])).toBe(123);
    });
    
    test('should handle null values in path', () => {
        expect(getValueByPath(testData, ['f'])).toBeNull();
    });
  });

  describe('areValuesEqual', () => {
    test('should correctly compare primitives', () => {
      expect(areValuesEqual(1, 1)).toBe(true);
      expect(areValuesEqual(1, 2)).toBe(false);
      expect(areValuesEqual('a', 'a')).toBe(true);
      expect(areValuesEqual('a', 'b')).toBe(false);
      expect(areValuesEqual(true, true)).toBe(true);
      expect(areValuesEqual(true, false)).toBe(false);
      expect(areValuesEqual(null, null)).toBe(true);
      expect(areValuesEqual(undefined, undefined)).toBe(true);
      expect(areValuesEqual(null, undefined)).toBe(false);
      expect(areValuesEqual(1, '1')).toBe(false);
    });

    test('should correctly compare simple objects', () => {
      expect(areValuesEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
      // Updated: Now ignores key order - this should return true
      expect(areValuesEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true); 
      expect(areValuesEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    });

    test('should correctly compare simple arrays', () => {
      expect(areValuesEqual([1, 2], [1, 2])).toBe(true);
      expect(areValuesEqual([1, 2], [2, 1])).toBe(false); // Order matters
      expect(areValuesEqual([1], [1, 2])).toBe(false);
    });

    test('should correctly compare nested objects/arrays', () => {
      const obj1 = { a: 1, b: { c: [3, 4] } };
      const obj2 = { a: 1, b: { c: [3, 4] } };
      const obj3 = { a: 1, b: { c: [3, 5] } }; // Different nested value
      expect(areValuesEqual(obj1, obj2)).toBe(true);
      expect(areValuesEqual(obj1, obj3)).toBe(false);
    });
    
    test('should handle null/undefined with other values', () => {
        expect(areValuesEqual(null, {})).toBe(false);
        expect(areValuesEqual(undefined, {})).toBe(false);
        expect(areValuesEqual({}, null)).toBe(false);
        expect(areValuesEqual({}, undefined)).toBe(false);
    });
  });

  describe('getAllPaths', () => {
    test('should return empty set for empty object/array if not counting root', () => {
      // Current implementation adds path for current object if currentPath.length > 0
      // So, for root empty object/array, it returns empty set.
      expect(getAllPaths({})).toEqual(new Set());
      expect(getAllPaths([])).toEqual(new Set());
    });

    test('should return paths for flat object', () => {
      expect(getAllPaths({ a: 1, b: 'text' })).toEqual(new Set(['a', 'b']));
    });

    test('should return paths for flat array', () => {
      expect(getAllPaths([1, 'text'])).toEqual(new Set(['0', '1']));
    });

    test('should return paths for nested object', () => {
      const data = { a: { b: 2, c: 3 } };
      const expected = new Set(['a', 'a.b', 'a.c']);
      expect(getAllPaths(data)).toEqual(expected);
    });

    test('should return paths for nested array', () => {
      const data = { a: [1, { b: 2 }] };
      const expected = new Set(['a', 'a.0', 'a.1', 'a.1.b']);
      expect(getAllPaths(data)).toEqual(expected);
    });
    
    test('should handle primitives at root (returning empty set)', () => {
        expect(getAllPaths(123)).toEqual(new Set());
        expect(getAllPaths("hello")).toEqual(new Set());
        expect(getAllPaths(null)).toEqual(new Set());
        expect(getAllPaths(undefined)).toEqual(new Set());
    });
  });

  describe('calculateJsonComparisonStats', () => {
    // Test cases for calculateJsonComparisonStats
    // Note: totalLeftItems/totalRightItems based on getAllPaths which counts paths to nodes.
    // An empty object {} or array [] will have 0 paths from getAllPaths, but the stats logic
    // treats them as 1 item if they are the root.

    test('identical simple JSONs', () => {
      const json = { a: 1, b: "hello" };
      const stats = calculateJsonComparisonStats(json, json);
      expect(stats.totalLeftItems).toBe(2); // a, b
      expect(stats.totalRightItems).toBe(2); // a, b
      expect(stats.commonPaths).toBe(2);
      expect(stats.matchingValues).toBe(2);
      expect(stats.differentValues).toBe(0);
      expect(stats.onlyInLeft).toBe(0);
      expect(stats.onlyInRight).toBe(0);
    });

    test('identical nested JSONs', () => {
      const json = { a: 1, b: { c: 2 } };
      const stats = calculateJsonComparisonStats(json, json);
      // Paths: a, b, b.c
      expect(stats.totalLeftItems).toBe(3);
      expect(stats.totalRightItems).toBe(3);
      expect(stats.commonPaths).toBe(3);
      expect(stats.matchingValues).toBe(3);
      expect(stats.differentValues).toBe(0);
      expect(stats.onlyInLeft).toBe(0);
      expect(stats.onlyInRight).toBe(0);
    });

    test('completely different JSONs (different keys)', () => {
      const jsonA = { a: 1 };
      const jsonB = { b: 1 };
      const stats = calculateJsonComparisonStats(jsonA, jsonB);
      // Paths: a (left), b (right)
      expect(stats.totalLeftItems).toBe(1);
      expect(stats.totalRightItems).toBe(1);
      expect(stats.commonPaths).toBe(0);
      expect(stats.matchingValues).toBe(0);
      expect(stats.differentValues).toBe(0);
      expect(stats.onlyInLeft).toBe(1);
      expect(stats.onlyInRight).toBe(1);
    });
    
    test('completely different JSONs (same top key, different structures)', () => {
        const jsonA = { data: { a: 1 } };
        const jsonB = { data: { b: 2 } };
        const stats = calculateJsonComparisonStats(jsonA, jsonB);
        // Paths: data, data.a (left); data, data.b (right)
        expect(stats.totalLeftItems).toBe(2);
        expect(stats.totalRightItems).toBe(2);
        expect(stats.commonPaths).toBe(1); // 'data' is common
        expect(stats.matchingValues).toBe(0); // value of 'data' is different
        expect(stats.differentValues).toBe(1); // for path 'data'
        expect(stats.onlyInLeft).toBe(1); // 'data.a'
        expect(stats.onlyInRight).toBe(1); // 'data.b'
      });


    test('items only in left', () => {
      const jsonA = { a: 1, b: 2, c: { d: 3 } };
      const jsonB = { a: 1 };
      const stats = calculateJsonComparisonStats(jsonA, jsonB);
      // Left paths: a, b, c, c.d (4)
      // Right paths: a (1)
      // Common: a (1)
      // Matching: a (1)
      // OnlyInLeft: b, c, c.d (3)
      expect(stats.totalLeftItems).toBe(4);
      expect(stats.totalRightItems).toBe(1);
      expect(stats.commonPaths).toBe(1);
      expect(stats.matchingValues).toBe(1);
      expect(stats.differentValues).toBe(0);
      expect(stats.onlyInLeft).toBe(3);
      expect(stats.onlyInRight).toBe(0);
    });

    test('items only in right', () => {
      const jsonA = { a: 1 };
      const jsonB = { a: 1, b: 2, c: { d: 3 } };
      const stats = calculateJsonComparisonStats(jsonA, jsonB);
      expect(stats.onlyInRight).toBe(3);
      expect(stats.onlyInLeft).toBe(0);
    });

    test('different values for same keys', () => {
      const jsonA = { a: 1, b: { c: 10 } };
      const jsonB = { a: 2, b: { c: 20 } }; // a is different, b.c is different, b is different
      const stats = calculateJsonComparisonStats(jsonA, jsonB);
      // Paths: a, b, b.c (3 for each side)
      expect(stats.totalLeftItems).toBe(3);
      expect(stats.totalRightItems).toBe(3);
      expect(stats.commonPaths).toBe(3);
      expect(stats.matchingValues).toBe(0);
      expect(stats.differentValues).toBe(3); // a, b, b.c all different
      expect(stats.onlyInLeft).toBe(0);
      expect(stats.onlyInRight).toBe(0);
    });
    
    test('mixed scenario', () => {
      const jsonA = { common: 1, left_only: true, nested: { common_child: "valA", left_child: "L" } };
      const jsonB = { common: 2, right_only: false, nested: { common_child: "valB", right_child: "R" } };
      const stats = calculateJsonComparisonStats(jsonA, jsonB);
      // Left paths: common, left_only, nested, nested.common_child, nested.left_child (5)
      // Right paths: common, right_only, nested, nested.common_child, nested.right_child (5)
      // Common paths: common, nested, nested.common_child (3)
      // Matching values: 0
      // Different values: common (1 vs 2), nested ({...} vs {...}), nested.common_child ("valA" vs "valB") (3)
      // Only in Left: left_only, nested.left_child (2)
      // Only in Right: right_only, nested.right_child (2)
      expect(stats.totalLeftItems).toBe(5);
      expect(stats.totalRightItems).toBe(5);
      expect(stats.commonPaths).toBe(3);
      expect(stats.matchingValues).toBe(0);
      expect(stats.differentValues).toBe(3);
      expect(stats.onlyInLeft).toBe(2);
      expect(stats.onlyInRight).toBe(2);
    });

    test('empty objects/arrays comparisons', () => {
      expect(calculateJsonComparisonStats({}, {})).toEqual({
        totalLeftItems: 1, totalRightItems: 1, commonPaths: 1, matchingValues: 1,
        differentValues: 0, onlyInLeft: 0, onlyInRight: 0
      });
      expect(calculateJsonComparisonStats([], [])).toEqual({
        totalLeftItems: 1, totalRightItems: 1, commonPaths: 1, matchingValues: 1,
        differentValues: 0, onlyInLeft: 0, onlyInRight: 0
      });
      expect(calculateJsonComparisonStats({}, [])).toEqual({
        totalLeftItems: 1, totalRightItems: 1, commonPaths: 1, matchingValues: 0,
        differentValues: 1, onlyInLeft: 0, onlyInRight: 0
      });
       expect(calculateJsonComparisonStats({a:1}, {})).toEqual({
        totalLeftItems: 1, totalRightItems: 1, commonPaths: 0, matchingValues: 0,
        differentValues: 0, onlyInLeft: 1, onlyInRight: 1 // {} is 1 item, {a:1} is 1 item
      });
    });
    
    test('one or both inputs are primitives/null', () => {
      expect(calculateJsonComparisonStats(null, {})).toEqual({
        totalLeftItems: 1, totalRightItems: 1, commonPaths: 0, matchingValues: 0,
        differentValues: 0, onlyInLeft: 1, onlyInRight: 1
      });
      expect(calculateJsonComparisonStats(1, 2)).toEqual({
        totalLeftItems: 1, totalRightItems: 1, commonPaths: 1, matchingValues: 0,
        differentValues: 1, onlyInLeft: 0, onlyInRight: 0
      });
      expect(calculateJsonComparisonStats("a", "a")).toEqual({
        totalLeftItems: 1, totalRightItems: 1, commonPaths: 1, matchingValues: 1,
        differentValues: 0, onlyInLeft: 0, onlyInRight: 0
      });
       expect(calculateJsonComparisonStats(null, null)).toEqual({
        totalLeftItems: 1, totalRightItems: 1, commonPaths: 1, matchingValues: 1,
        differentValues: 0, onlyInLeft: 0, onlyInRight: 0
      });
      expect(calculateJsonComparisonStats(undefined, undefined)).toEqual({
        totalLeftItems: 0, totalRightItems: 0, commonPaths: 0, matchingValues: 0,
        differentValues: 0, onlyInLeft: 0, onlyInRight: 0
      });
       expect(calculateJsonComparisonStats({a:1}, null)).toEqual({
        totalLeftItems: 1, totalRightItems: 1, commonPaths: 0, matchingValues: 0,
        differentValues: 0, onlyInLeft: 1, onlyInRight: 1
      });
    });
  });
});
