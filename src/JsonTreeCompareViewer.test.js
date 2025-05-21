import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import JsonTreeCompareViewer from './JsonTreeCompareViewer';

// Mocking navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
  configurable: true,
});

describe('JsonTreeCompareViewer Integration Tests', () => {
  const leftJsonSimple = { name: 'John Doe', age: 30 };
  const rightJsonSimple = { name: 'Jane Doe', age: 28 };

  const leftJsonComplex = {
    id: 'user123',
    details: { name: 'Alice', role: 'Admin' },
    tags: ['developer', 'react', 'admin'],
    active: true,
  };
  const rightJsonComplex = {
    id: 'user456',
    details: { name: 'Bob', role: 'User' },
    tags: ['designer', 'figma', 'user'],
    active: false,
    extraField: 'this is new',
  };
  
  const getJsonNodeTextElements = (container, text) => {
    // This helper will find elements that contain the text, trying to be specific to JsonNode rendered output.
    // It's a bit naive as it relies on JSON.stringify output for primitives and key names.
    // A more robust way would be to add data-testid attributes to JsonNode elements.
    return Array.from(container.querySelectorAll('span, div')).filter(el => el.textContent.includes(text));
  };


  test('renders the component and performs a basic comparison', () => {
    render(<JsonTreeCompareViewer />);
    
    fireEvent.change(screen.getByPlaceholderText('Enter left JSON here'), {
      target: { value: JSON.stringify(leftJsonSimple) },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter right JSON here'), {
      target: { value: JSON.stringify(rightJsonSimple) },
    });
    fireEvent.click(screen.getByText('Compare'));

    expect(screen.getByText('Comparison Result')).toBeInTheDocument();
    // Check if parts of the JSON are rendered
    expect(screen.getByText(/"name":/)).toBeInTheDocument(); // Key "name"
    expect(screen.getByText(/"John Doe"/)).toBeInTheDocument(); // Left value
    expect(screen.getByText(/"Jane Doe"/)).toBeInTheDocument(); // Right value
  });

  test('simulates typing a search query and verifies highlighting', async () => {
    render(<JsonTreeCompareViewer />);
    
    fireEvent.change(screen.getByPlaceholderText('Enter left JSON here'), {
      target: { value: JSON.stringify(leftJsonComplex) },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter right JSON here'), {
      target: { value: JSON.stringify(rightJsonComplex) },
    });
    fireEvent.click(screen.getByText('Compare'));

    // Wait for comparison results to render
    await screen.findByText('Comparison Result');

    const searchInput = screen.getByPlaceholderText('Search keys/values...');
    fireEvent.change(searchInput, { target: { value: 'Admin' } });
    
    // Wait for highlights to apply (useEffect dependency)
    // Check for highlight class on the element containing "Admin" in the left tree
    // The actual DOM structure for JsonNode makes direct parent selection tricky.
    // We look for the "Admin" text and check its parent or relevant ancestor.
    // Highlight class is 'bg-yellow-200 dark:bg-yellow-700 rounded p-1'
    await waitFor(() => {
      // Find "Admin" text specifically in the left JSON display area
      const leftTreeContainer = screen.getByText('Left JSON').closest('.w-full.md\\:w-1\\/2').querySelector('.border.rounded.p-4');
      const adminElementsLeft = getJsonNodeTextElements(leftTreeContainer, '"Admin"');
      expect(adminElementsLeft.length).toBeGreaterThan(0);
      // Check if any parent of these elements has the highlight class
      const isHighlightedLeft = adminElementsLeft.some(el => el.closest('.bg-yellow-200, .dark\\:bg-yellow-700'));
      expect(isHighlightedLeft).toBe(true);
    });

    // Check that "User" in the right tree is NOT highlighted by "Admin" search
    const rightTreeContainer = screen.getByText('Right JSON').closest('.w-full.md\\:w-1\\/2').querySelector('.border.rounded.p-4');
    const userElementsRight = getJsonNodeTextElements(rightTreeContainer, '"User"');
    expect(userElementsRight.length).toBeGreaterThan(0);
    const isUserHighlightedRight = userElementsRight.some(el => el.closest('.bg-yellow-200, .dark\\:bg-yellow-700'));
    expect(isUserHighlightedRight).toBe(false); // "User" should not be highlighted by "Admin" search

    // Search for "role" key
    fireEvent.change(searchInput, { target: { value: 'role' } });
    await waitFor(() => {
        // Check left tree for "role" key highlight
        const roleElementsLeft = getJsonNodeTextElements(leftTreeContainer, /"role":/);
        expect(roleElementsLeft.length).toBeGreaterThan(0);
        const isRoleHighlightedLeft = roleElementsLeft.some(el => el.closest('.bg-yellow-200, .dark\\:bg-yellow-700'));
        expect(isRoleHighlightedLeft).toBe(true);

        // Check right tree for "role" key highlight
        const roleElementsRight = getJsonNodeTextElements(rightTreeContainer, /"role":/);
        expect(roleElementsRight.length).toBeGreaterThan(0);
        const isRoleHighlightedRight = roleElementsRight.some(el => el.closest('.bg-yellow-200, .dark\\:bg-yellow-700'));
        expect(isRoleHighlightedRight).toBe(true);
    });
  });

  test('clears search query and removes highlights', async () => {
    render(<JsonTreeCompareViewer />);
    fireEvent.change(screen.getByPlaceholderText('Enter left JSON here'), {
      target: { value: JSON.stringify(leftJsonComplex) },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter right JSON here'), {
      target: { value: JSON.stringify(rightJsonComplex) },
    });
    fireEvent.click(screen.getByText('Compare'));
    await screen.findByText('Comparison Result');

    const searchInput = screen.getByPlaceholderText('Search keys/values...');
    fireEvent.change(searchInput, { target: { value: 'Admin' } });

    // Wait for highlight to appear
    await waitFor(() => {
      const leftTreeContainer = screen.getByText('Left JSON').closest('.w-full.md\\:w-1\\/2').querySelector('.border.rounded.p-4');
      const adminElementsLeft = getJsonNodeTextElements(leftTreeContainer, '"Admin"');
      expect(adminElementsLeft.some(el => el.closest('.bg-yellow-200, .dark\\:bg-yellow-700'))).toBe(true);
    });
    
    // Click the clear search button
    const clearButton = screen.getByLabelText('Clear search');
    fireEvent.click(clearButton);

    expect(searchInput.value).toBe('');

    // Wait for highlight to be removed
    await waitFor(() => {
      const leftTreeContainer = screen.getByText('Left JSON').closest('.w-full.md\\:w-1\\/2').querySelector('.border.rounded.p-4');
      const adminElementsLeft = getJsonNodeTextElements(leftTreeContainer, '"Admin"');
      // Check no parent has highlight
      expect(adminElementsLeft.some(el => el.closest('.bg-yellow-200, .dark\\:bg-yellow-700'))).toBe(false);
    });
  });

  test('searches in one tree when the other is empty or term is absent', async () => {
    render(<JsonTreeCompareViewer />);
    const emptyJson = {};
    fireEvent.change(screen.getByPlaceholderText('Enter left JSON here'), {
      target: { value: JSON.stringify(leftJsonComplex) }, // Has "Admin"
    });
    fireEvent.change(screen.getByPlaceholderText('Enter right JSON here'), {
      target: { value: JSON.stringify(emptyJson) }, // Empty
    });
    fireEvent.click(screen.getByText('Compare'));
    await screen.findByText('Comparison Result');

    const searchInput = screen.getByPlaceholderText('Search keys/values...');
    fireEvent.change(searchInput, { target: { value: 'Admin' } });

    await waitFor(() => {
      const leftTreeContainer = screen.getByText('Left JSON').closest('.w-full.md\\:w-1\\/2').querySelector('.border.rounded.p-4');
      const adminElementsLeft = getJsonNodeTextElements(leftTreeContainer, '"Admin"');
      expect(adminElementsLeft.some(el => el.closest('.bg-yellow-200, .dark\\:bg-yellow-700'))).toBe(true);
      
      // Ensure right tree (empty) doesn't error or show false positives
      const rightTreeContainer = screen.getByText('Right JSON').closest('.w-full.md\\:w-1\\/2').querySelector('.border.rounded.p-4');
      expect(rightTreeContainer.textContent).not.toContain("Admin"); // No "Admin" text
    });

    // Now test with right JSON having different content
     fireEvent.change(screen.getByPlaceholderText('Enter right JSON here'), {
      target: { value: JSON.stringify({ unrelated: "data" }) }, 
    });
    fireEvent.click(screen.getByText('Compare')); // Re-compare
    await screen.findByText('Comparison Result'); // Wait for re-render
    fireEvent.change(searchInput, { target: { value: 'Admin' } }); // Re-apply search

    await waitFor(() => {
      const leftTreeContainer = screen.getByText('Left JSON').closest('.w-full.md\\:w-1\\/2').querySelector('.border.rounded.p-4');
      const adminElementsLeft = getJsonNodeTextElements(leftTreeContainer, '"Admin"');
      expect(adminElementsLeft.some(el => el.closest('.bg-yellow-200, .dark\\:bg-yellow-700'))).toBe(true);
      
      const rightTreeContainer = screen.getByText('Right JSON').closest('.w-full.md\\:w-1\\/2').querySelector('.border.rounded.p-4');
      const adminElementsRight = getJsonNodeTextElements(rightTreeContainer, '"Admin"');
      expect(adminElementsRight.some(el => el.closest('.bg-yellow-200, .dark\\:bg-yellow-700'))).toBe(false);
    });
  });
});