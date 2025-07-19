import { searchJsonTree } from './searchUtils';

describe('searchJsonTree', () => {
  // Test with empty JSON data
  test('should return an empty array for null data', () => {
    expect(searchJsonTree(null, 'test')).toEqual([]);
  });

  test('should return an empty array for undefined data', () => {
    expect(searchJsonTree(undefined, 'test')).toEqual([]);
  });

  test('should return an empty array for an empty object', () => {
    expect(searchJsonTree({}, 'test')).toEqual([]);
  });

  test('should return an empty array for an empty array', () => {
    expect(searchJsonTree([], 'test')).toEqual([]);
  });

  // Test with an empty search query
  test('should return an empty array for an empty search query', () => {
    const jsonData = { name: 'John Doe', age: 30 };
    expect(searchJsonTree(jsonData, '')).toEqual([]);
  });

  // Test searching for a key that exists at the root level
  test('should find a root-level key', () => {
    const jsonData = { name: 'John Doe', age: 30 };
    expect(searchJsonTree(jsonData, 'name')).toEqual([['name']]);
  });

  // Test searching for a key that exists in a nested object
  test('should find a key in a nested object', () => {
    const jsonData = { user: { name: 'Jane Doe', id: '123' } };
    expect(searchJsonTree(jsonData, 'name')).toEqual([['user', 'name']]);
  });

  // Test searching for a key that exists in an array of objects
  test('should find a key in an object within an array', () => {
    const jsonData = { users: [{ name: 'First' }, { name: 'Second' }] };
    expect(searchJsonTree(jsonData, 'name')).toEqual([
      ['users', '0', 'name'],
      ['users', '1', 'name'],
    ]);
  });
  
  // Test searching for an index in an array (should not typically match by index string itself unless values are stringy numbers)
  test('should not find an array index as a key unless value is stringy number', () => {
    const jsonData = ['first', 'second', '0'];
    expect(searchJsonTree(jsonData, '0')).toEqual([['0']]); // This will match the value '0'
    expect(searchJsonTree(jsonData, '1')).toEqual([['1']]); // Matches value 'second' at index 1
  });


  // Test searching for a string value
  test('should find a string value', () => {
    const jsonData = { city: 'New York' };
    expect(searchJsonTree(jsonData, 'New York')).toEqual([['city']]);
  });

  // Test searching for a numeric value
  test('should find a numeric value (converted to string)', () => {
    const jsonData = { quantity: 100 };
    expect(searchJsonTree(jsonData, '100')).toEqual([['quantity']]);
  });

  // Test searching for a boolean value
  test('should find a boolean value (converted to string)', () => {
    const jsonData = { isActive: true };
    expect(searchJsonTree(jsonData, 'true')).toEqual([['isActive']]);
  });

  // Test case-insensitivity
  test('should perform case-insensitive search for keys', () => {
    const jsonData = { UserName: 'user123' };
    expect(searchJsonTree(jsonData, 'username')).toEqual([['UserName']]);
  });

  test('should perform case-insensitive search for values', () => {
    const jsonData = { status: 'Completed' };
    expect(searchJsonTree(jsonData, 'completed')).toEqual([['status']]);
  });

  // Test when the search query is a partial match for a key or value
  test('should find partial matches in keys', () => {
    const jsonData = { employeeId: 'emp001' };
    expect(searchJsonTree(jsonData, 'Id')).toEqual([['employeeId']]);
  });

  test('should find partial matches in values', () => {
    const jsonData = { description: 'This is a sample text.' };
    expect(searchJsonTree(jsonData, 'sample')).toEqual([['description']]);
  });

  // Test when there are no matches
  test('should return an empty array if no matches are found', () => {
    const jsonData = { a: 1, b: 'text' };
    expect(searchJsonTree(jsonData, 'nonexistent')).toEqual([]);
  });

  // Test with multiple matches for the same query
  test('should find multiple occurrences of the same key', () => {
    const jsonData = { item: { name: 'widget' }, details: { name: 'info' } };
    expect(searchJsonTree(jsonData, 'name')).toEqual([
      ['item', 'name'],
      ['details', 'name'],
    ]);
  });
  
  test('should find multiple occurrences of the same value', () => {
    const jsonData = { title: 'Name', header: 'Name' };
    expect(searchJsonTree(jsonData, 'Name')).toEqual([
      ['title'],
      ['header'],
    ]);
  });
  
  test('should find key and value matches, avoiding duplicate paths', () => {
    const jsonData = { name: 'name' }; // Key 'name', value 'name'
    expect(searchJsonTree(jsonData, 'name')).toEqual([['name']]);
  });
  
  test('should find key and value matches in nested structures', () => {
    const jsonData = { user: { name: 'John', status: 'active' }, department: { id: 'HR', name: 'Human Resources' }};
    expect(searchJsonTree(jsonData, 'name')).toEqual([
        ['user', 'name'],
        ['department', 'name']
    ]);
  });

  // Test that the returned paths are correct
  test('should return correct paths for deeply nested objects', () => {
    const jsonData = { a: { b: { c: { d: 'found_me' } } } };
    expect(searchJsonTree(jsonData, 'found_me')).toEqual([['a', 'b', 'c', 'd']]);
  });

  test('should return correct paths for items in arrays', () => {
    const jsonData = { items: ['one', 'two', { id: 'target' }] };
    expect(searchJsonTree(jsonData, 'target')).toEqual([['items', '2', 'id']]);
  });
  
  test('should handle mixed array and object nesting', () => {
    const jsonData = {
      level1: [
        { id: 'A', data: { value: 10 } },
        { id: 'B', data: { value: 'target_value' } },
      ],
    };
    expect(searchJsonTree(jsonData, 'target_value')).toEqual([['level1', '1', 'data', 'value']]);
  });

  test('should handle direct string match in an array', () => {
    const jsonData = ["apple", "banana", "cherry"];
    expect(searchJsonTree(jsonData, "banana")).toEqual([["1"]]);
  });

  test('should handle search query matching an object/array itself (not typical, keys/values are primary)', () => {
    // This type of match (matching the string representation of an object/array) is not supported by current searchJsonTree logic
    // and usually not desired. searchJsonTree focuses on keys and primitive values.
    const jsonData = { config: { settings: [1,2,3] } };
    expect(searchJsonTree(jsonData, "[1,2,3]")).toEqual([]); // Expect no match for stringified array
  });

  test('should correctly identify paths for multiple matches of different types (key/value)', () => {
    const jsonData = {
      "id": "123",
      "data": {
        "id": "456",
        "value": "some id"
      }
    };
    const results = searchJsonTree(jsonData, "id");
    // Sort results for consistent comparison
    const sortedResults = results.map(path => path.join('.')).sort();
    const expectedSortedResults = [
      "id",
      "data.id",
      "data.value" // "id" is in "some id"
    ].sort();
    expect(sortedResults).toEqual(expectedSortedResults);
  });
});