import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import JsonTreeCompareViewer from './JsonTreeCompareViewer';

// --- Mocks Setup ---

// Mocking navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
  configurable: true,
});

// Mock Local Storage
let localStorageMock = {};
beforeEach(() => {
  localStorageMock = {};
  jest.spyOn(window.localStorage.__proto__, 'getItem').mockImplementation((key) => localStorageMock[key]);
  jest.spyOn(window.localStorage.__proto__, 'setItem').mockImplementation((key, value) => {
    localStorageMock[key] = value;
  });
  jest.spyOn(window.localStorage.__proto__, 'removeItem').mockImplementation((key) => {
    delete localStorageMock[key];
  });
  jest.spyOn(window.localStorage.__proto__, 'clear').mockImplementation(() => {
    localStorageMock = {};
  });
});

afterEach(() => {
  jest.restoreAllMocks(); // Cleans up spies
});

// Mock window.prompt and window.confirm
let mockPrompt;
let mockConfirm;
beforeEach(() => {
  mockPrompt = jest.spyOn(window, 'prompt');
  mockConfirm = jest.spyOn(window, 'confirm');
});


// --- Test Suite ---

describe('JsonTreeCompareViewer Integration Tests', () => {
  const leftJsonSimple = { name: 'John Doe', age: 30 };
  const rightJsonSimple = { name: 'Jane Doe', age: 28 };
  const leftJsonStringSimple = JSON.stringify(leftJsonSimple);
  const rightJsonStringSimple = JSON.stringify(rightJsonSimple);

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
  const leftJsonStringComplex = JSON.stringify(leftJsonComplex);
  const rightJsonStringComplex = JSON.stringify(rightJsonComplex);
  
  const getJsonNodeTextElements = (container, text) => {
    return Array.from(container.querySelectorAll('span, div')).filter(el => el.textContent.includes(text));
  };


  test('renders the component and performs a basic comparison', () => {
    render(<JsonTreeCompareViewer />);
    
    fireEvent.change(screen.getByPlaceholderText('Enter left JSON here'), {
      target: { value: leftJsonStringSimple },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter right JSON here'), {
      target: { value: rightJsonStringSimple },
    });
    fireEvent.click(screen.getByText('Compare'));

    expect(screen.getByText('Comparison Result')).toBeInTheDocument();
    expect(screen.getByText(/"name":/)).toBeInTheDocument(); 
    expect(screen.getByText(/"John Doe"/)).toBeInTheDocument(); 
    expect(screen.getByText(/"Jane Doe"/)).toBeInTheDocument();
  });

  test('simulates typing a search query and verifies highlighting', async () => {
    render(<JsonTreeCompareViewer />);
    
    fireEvent.change(screen.getByPlaceholderText('Enter left JSON here'), {
      target: { value: leftJsonStringComplex },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter right JSON here'), {
      target: { value: rightJsonStringComplex },
    });
    fireEvent.click(screen.getByText('Compare'));
    await screen.findByText('Comparison Result');

    const searchInput = screen.getByPlaceholderText('Search keys/values...');
    fireEvent.change(searchInput, { target: { value: 'Admin' } });
    
    await waitFor(() => {
      const leftTreeContainer = screen.getByText('Left JSON').closest('.w-full.md\\:w-1\\/2').querySelector('.border.rounded.p-4');
      const adminElementsLeft = getJsonNodeTextElements(leftTreeContainer, '"Admin"');
      expect(adminElementsLeft.some(el => el.closest('.bg-yellow-200, .dark\\:bg-yellow-700'))).toBe(true);
    });
  });

  test('clears search query and removes highlights', async () => {
    render(<JsonTreeCompareViewer />);
    fireEvent.change(screen.getByPlaceholderText('Enter left JSON here'), {
      target: { value: leftJsonStringComplex },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter right JSON here'), {
      target: { value: rightJsonStringComplex },
    });
    fireEvent.click(screen.getByText('Compare'));
    await screen.findByText('Comparison Result');

    const searchInput = screen.getByPlaceholderText('Search keys/values...');
    fireEvent.change(searchInput, { target: { value: 'Admin' } });

    await waitFor(() => {
      const leftTreeContainer = screen.getByText('Left JSON').closest('.w-full.md\\:w-1\\/2').querySelector('.border.rounded.p-4');
      expect(getJsonNodeTextElements(leftTreeContainer, '"Admin"').some(el => el.closest('.bg-yellow-200, .dark\\:bg-yellow-700'))).toBe(true);
    });
    
    fireEvent.click(screen.getByLabelText('Clear search'));
    expect(searchInput.value).toBe('');

    await waitFor(() => {
      const leftTreeContainer = screen.getByText('Left JSON').closest('.w-full.md\\:w-1\\/2').querySelector('.border.rounded.p-4');
      expect(getJsonNodeTextElements(leftTreeContainer, '"Admin"').some(el => el.closest('.bg-yellow-200, .dark\\:bg-yellow-700'))).toBe(false);
    });
  });

  // --- Session Management Tests ---
  describe('Session Management', () => {
    const sessionKey = "jsonCompareSessions";

    test('Save Session: successfully saves a new session when none exist', async () => {
      mockPrompt.mockReturnValue('My First Session');
      render(<JsonTreeCompareViewer />);

      fireEvent.change(screen.getByPlaceholderText('Enter left JSON here'), { target: { value: leftJsonStringSimple } });
      fireEvent.change(screen.getByPlaceholderText('Enter right JSON here'), { target: { value: rightJsonStringSimple } });
      fireEvent.click(screen.getByText('Compare')); 

      fireEvent.click(screen.getByText('Save Session'));

      expect(mockPrompt).toHaveBeenCalledWith('Enter a name for this session:');
      expect(localStorage.setItem).toHaveBeenCalledWith(sessionKey, expect.any(String));
      const savedData = JSON.parse(localStorageMock[sessionKey]);
      expect(savedData).toHaveLength(1);
      expect(savedData[0].name).toBe('My First Session');
      expect(savedData[0].leftJson).toBe(leftJsonStringSimple);
      expect(savedData[0].rightJson).toBe(rightJsonStringSimple);

      const dropdown = await screen.findByRole('combobox', { name: /Load session/i });
      expect(dropdown).toBeInTheDocument();
      expect(screen.getByText(/My First Session/)).toBeInTheDocument();
    });

    test('Save Session: adds to existing sessions and updates dropdown', async () => {
        const initialSessions = [{ id: '1', name: 'Old Session', leftJson: '{}', rightJson: '{}', timestamp: new Date().toISOString() }];
        localStorageMock[sessionKey] = JSON.stringify(initialSessions);
        mockPrompt.mockReturnValue('New Session');
        
        render(<JsonTreeCompareViewer />); 
        await screen.findByText(/Old Session/);

        fireEvent.change(screen.getByPlaceholderText('Enter left JSON here'), { target: { value: leftJsonStringSimple } });
        fireEvent.click(screen.getByText('Save Session'));

        const savedData = JSON.parse(localStorageMock[sessionKey]);
        expect(savedData).toHaveLength(2);
        expect(savedData.find(s => s.name === 'New Session')).toBeDefined();
        
        expect(screen.getByText(/New Session/)).toBeInTheDocument(); 
    });
    
    test('Save Session: does not save if session name is empty', () => {
      mockPrompt.mockReturnValue(''); 
      render(<JsonTreeCompareViewer />);
      fireEvent.click(screen.getByText('Save Session'));
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    test('Save Session: does not save if both JSON inputs are empty', () => {
      mockPrompt.mockReturnValue('Empty Session');
      render(<JsonTreeCompareViewer />);
      fireEvent.click(screen.getByText('Save Session'));
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });


    test('Load Session: populates dropdown and loads selected session', async () => {
      const sessions = [
        { id: 's1', name: 'Session One', leftJson: leftJsonStringSimple, rightJson: rightJsonStringSimple, timestamp: new Date().toISOString() },
        { id: 's2', name: 'Session Two', leftJson: leftJsonStringComplex, rightJson: rightJsonStringComplex, timestamp: new Date().toISOString() },
      ];
      localStorageMock[sessionKey] = JSON.stringify(sessions);

      render(<JsonTreeCompareViewer />);

      const dropdown = await screen.findByRole('combobox', { name: /Load session/i });
      expect(screen.getByText(/Session One/)).toBeInTheDocument();
      expect(screen.getByText(/Session Two/)).toBeInTheDocument();

      fireEvent.change(dropdown, { target: { value: 's2' } }); 

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter left JSON here').value).toBe(leftJsonStringComplex);
        expect(screen.getByPlaceholderText('Enter right JSON here').value).toBe(rightJsonStringComplex);
      });
      await screen.findByText('Comparison Result');
      expect(screen.getByText(/"id": "user123"/)).toBeInTheDocument(); 
      expect(screen.getByText(/"id": "user456"/)).toBeInTheDocument(); 
      
      const searchInput = screen.getByPlaceholderText('Search keys/values...');
      expect(searchInput.value).toBe('');
      expect(dropdown.value).toBe('s2');
    });
    
    test('Load Session: "No Saved Sessions" button is shown when no sessions exist', () => {
        render(<JsonTreeCompareViewer />);
        expect(screen.getByText('No Saved Sessions')).toBeInTheDocument();
        expect(screen.queryByRole('combobox', { name: /Load session/i })).not.toBeInTheDocument();
    });


    test('Delete Session: successfully deletes a session and updates UI', async () => {
      const sessions = [
        { id: 's1', name: 'To Delete', leftJson: '{}', rightJson: '{}', timestamp: new Date().toISOString() },
        { id: 's2', name: 'To Keep', leftJson: '{}', rightJson: '{}', timestamp: new Date().toISOString() },
      ];
      localStorageMock[sessionKey] = JSON.stringify(sessions);
      mockConfirm.mockReturnValue(true); 

      render(<JsonTreeCompareViewer />);

      const dropdown = await screen.findByRole('combobox', { name: /Load session/i });
      expect(screen.getByText(/To Delete/)).toBeInTheDocument();
      expect(screen.getByText(/To Keep/)).toBeInTheDocument();
      
      fireEvent.change(dropdown, { target: { value: 's1' } });
      expect(dropdown.value).toBe('s1'); 

      const deleteButton = screen.getByRole('button', { name: /Delete selected session/i });
      expect(deleteButton).not.toBeDisabled();
      fireEvent.click(deleteButton);

      expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete the session "To Delete"?');
      
      await waitFor(() => {
        const updatedSavedData = JSON.parse(localStorageMock[sessionKey]);
        expect(updatedSavedData).toHaveLength(1);
        expect(updatedSavedData[0].name).toBe('To Keep');
      });
      
      expect(screen.queryByText(/To Delete/)).not.toBeInTheDocument();
      expect(screen.getByText(/To Keep/)).toBeInTheDocument();
      expect(dropdown.value).toBe(''); 
    });

    test('Delete Session: cancels deletion if user does not confirm', async () => {
      const sessions = [{ id: 's1', name: 'Session A', leftJson: '{}', rightJson: '{}', timestamp: new Date().toISOString() }];
      localStorageMock[sessionKey] = JSON.stringify(sessions);
      mockConfirm.mockReturnValue(false); 

      render(<JsonTreeCompareViewer />);
      const dropdown = await screen.findByRole('combobox', { name: /Load session/i });
      fireEvent.change(dropdown, { target: { value: 's1' } });
      
      fireEvent.click(screen.getByRole('button', { name: /Delete selected session/i }));

      expect(mockConfirm).toHaveBeenCalled();
      const currentSavedData = JSON.parse(localStorageMock[sessionKey]);
      expect(currentSavedData).toHaveLength(1); 
      expect(screen.getByText(/Session A/)).toBeInTheDocument(); 
    });
    
    test('Delete Session: delete button is disabled if no session is selected', async () => {
        const sessions = [{ id: 's1', name: 'Session A', leftJson: '{}', rightJson: '{}', timestamp: new Date().toISOString() }];
        localStorageMock[sessionKey] = JSON.stringify(sessions);
        render(<JsonTreeCompareViewer />);
        await screen.findByRole('combobox', { name: /Load session/i }); 
        
        const deleteButton = screen.getByRole('button', { name: /Delete selected session/i });
        expect(deleteButton).toBeDisabled();
    });
  });

  // --- Lazy Loading (Node Expansion/Collapse) Tests ---
  describe('Lazy Loading and Node Expansion', () => {
    const nestedJson = {
      level1_key: 'level1_value',
      level1_obj: {
        level2_key: 'level2_value',
        level2_obj: {
          level3_key: 'level3_value_target', // Target for search
        },
        level2_arr: ['arr_val1', { arr_obj_key: 'arr_obj_val' }],
      },
      another_level1_key: 'another_value',
    };
    const nestedJsonString = JSON.stringify(nestedJson);

    // Helper to get a toggle button (Chevron) for a given key's node
    // This is a bit fragile and depends on DOM structure.
    // A data-testid on the toggle button itself would be more robust.
    const getToggleForNodeByKey = (keyText) => {
        const keyElement = screen.getByText(`"${keyText}":`);
        // The toggle is usually a sibling span containing an SVG.
        // Or, it's a child of the parent div of the keyElement's parent span.
        // JsonNode structure: div (my-1) -> span (key) & JsonNode (value)
        // JsonNode (value) -> div (ml-4) -> span (toggle) & div (children)
        const parentDiv = keyElement.closest('div.my-1');
        if (!parentDiv) return null;
        const valueNodeDiv = parentDiv.querySelector('div.ml-4'); // This is the start of the JsonNode for the value
        if (!valueNodeDiv) return null;
        return valueNodeDiv.querySelector('span[role="button"]'); // Assuming toggle span has role="button" or similar
    };
    
    const findChevronDown = (element) => element.querySelector('svg.lucide-chevron-down');
    const findChevronRight = (element) => element.querySelector('svg.lucide-chevron-right');


    test('Initial Render: root expanded, children collapsed', async () => {
      render(<JsonTreeCompareViewer />);
      fireEvent.change(screen.getByPlaceholderText('Enter left JSON here'), { target: { value: nestedJsonString } });
      fireEvent.change(screen.getByPlaceholderText('Enter right JSON here'), { target: { value: "{}" } }); // Simple right JSON
      fireEvent.click(screen.getByText('Compare'));
      await screen.findByText('Comparison Result');

      // Verify root node (Left JSON tree) content is visible
      expect(screen.getByText(/"level1_key":/)).toBeInTheDocument();
      expect(screen.getByText(/"level1_obj":/)).toBeInTheDocument();
      expect(screen.getByText(/"another_level1_key":/)).toBeInTheDocument();
      
      // Verify root node's toggle icon indicates expanded (ChevronDown)
      // The root itself doesn't have a key name like "level1_obj", its toggle is the first one.
      const leftTreeContainer = screen.getByText('Left JSON').closest('.w-full.md\\:w-1\\/2').querySelector('.border.rounded.p-4');
      const rootToggle = leftTreeContainer.querySelector('span.cursor-pointer'); // First toggle
      expect(rootToggle).not.toBeNull();
      expect(findChevronDown(rootToggle)).toBeInTheDocument(); // Root is expanded by default (path.length < 1)
      
      // Verify content of second-level nodes (e.g., "level2_key") is NOT present
      expect(screen.queryByText(/"level2_key":/)).not.toBeInTheDocument();
      expect(screen.queryByText(/"level3_key":/)).not.toBeInTheDocument();

      // Verify toggle icons for first-level children (like level1_obj) indicate collapsed (ChevronRight)
      // Since level1_obj is a child of root (path.length 0), its own path.length will be 1.
      // Thus, level1_obj (if it were expanded) would have its children initially collapsed (path.length < 1 for them)
      // The task states: "The toggle icons for any first-level children (that are objects/arrays) should indicate they are collapsed"
      // This means we need to find the toggle for "level1_obj".
      // The "level1_obj" key is visible. Its associated value (the object node) contains the toggle.
      const level1ObjToggleContainer = screen.getByText(/"level1_obj":/).parentElement.querySelector('div.ml-4 > span.cursor-pointer');
      expect(level1ObjToggleContainer).not.toBeNull();
      expect(findChevronRight(level1ObjToggleContainer)).toBeInTheDocument();
    });

    test('Expanding a Node: children appear, icons update', async () => {
      render(<JsonTreeCompareViewer />);
      fireEvent.change(screen.getByPlaceholderText('Enter left JSON here'), { target: { value: nestedJsonString } });
      fireEvent.click(screen.getByText('Compare'));
      await screen.findByText('Comparison Result');

      // Initial state: "level2_key" should not be visible
      expect(screen.queryByText(/"level2_key":/)).not.toBeInTheDocument();

      // Find and click the toggle for "level1_obj"
      const level1ObjToggle = screen.getByText(/"level1_obj":/).parentElement.querySelector('div.ml-4 > span.cursor-pointer');
      expect(findChevronRight(level1ObjToggle)).toBeInTheDocument(); // Starts collapsed
      fireEvent.click(level1ObjToggle);

      // Verify "level1_obj" is now expanded
      expect(findChevronDown(level1ObjToggle)).toBeInTheDocument();
      
      // Verify its direct children are now visible
      expect(await screen.findByText(/"level2_key":/)).toBeInTheDocument();
      expect(screen.getByText(/"level2_obj":/)).toBeInTheDocument();
      expect(screen.getByText(/"level2_arr":/)).toBeInTheDocument();

      // Verify "level3_key" (child of "level2_obj") is still not visible
      expect(screen.queryByText(/"level3_key":/)).not.toBeInTheDocument();
      
      // Verify toggle for "level2_obj" is collapsed
      const level2ObjToggle = screen.getByText(/"level2_obj":/).parentElement.querySelector('div.ml-4 > span.cursor-pointer');
      expect(findChevronRight(level2ObjToggle)).toBeInTheDocument();
    });

    test('Collapsing a Node: children disappear, icons update', async () => {
      render(<JsonTreeCompareViewer />);
      fireEvent.change(screen.getByPlaceholderText('Enter left JSON here'), { target: { value: nestedJsonString } });
      fireEvent.click(screen.getByText('Compare'));
      await screen.findByText('Comparison Result');

      // Expand "level1_obj" first
      const level1ObjToggle = screen.getByText(/"level1_obj":/).parentElement.querySelector('div.ml-4 > span.cursor-pointer');
      fireEvent.click(level1ObjToggle);
      await screen.findByText(/"level2_key":/); // Wait for expansion
      expect(findChevronDown(level1ObjToggle)).toBeInTheDocument(); // Confirmed expanded

      // Now, click to collapse "level1_obj"
      fireEvent.click(level1ObjToggle);

      // Verify "level1_obj" is now collapsed
      expect(findChevronRight(level1ObjToggle)).toBeInTheDocument();
      
      // Verify its direct children are no longer visible
      expect(screen.queryByText(/"level2_key":/)).not.toBeInTheDocument();
      expect(screen.queryByText(/"level2_obj":/)).not.toBeInTheDocument();
    });

    test('Interaction with Search: highlight appears on expansion', async () => {
      render(<JsonTreeCompareViewer />);
      fireEvent.change(screen.getByPlaceholderText('Enter left JSON here'), { target: { value: nestedJsonString } });
      fireEvent.click(screen.getByText('Compare'));
      await screen.findByText('Comparison Result');

      const searchInput = screen.getByPlaceholderText('Search keys/values...');
      fireEvent.change(searchInput, { target: { value: 'level3_value_target' } });

      // At this point, "level3_value_target" is inside "level2_obj", which is inside "level1_obj".
      // Both "level1_obj" and "level2_obj" are initially collapsed.
      // The text "level3_value_target" should not be in the DOM yet.
      expect(screen.queryByText("level3_value_target")).not.toBeInTheDocument();
      
      // Also, its parent key "level3_key" should not be in the DOM.
      expect(screen.queryByText(/"level3_key":/)).not.toBeInTheDocument();

      // The highlight is applied to the div wrapping the key-value pair.
      // Let's check if "level1_obj" (ancestor) is highlighted because its child contains a match.
      // This depends on how searchJsonTree returns paths and how JsonNode applies highlights to ancestors.
      // Current searchJsonTree returns the direct path to the match.
      // JsonNode highlights the direct path elements.
      // So, "level1_obj" itself might not be highlighted directly, but its entry might be.
      // The key here is that the *target itself* is not visible, so no direct highlight on it.

      // Expand "level1_obj"
      const level1ObjToggle = screen.getByText(/"level1_obj":/).parentElement.querySelector('div.ml-4 > span.cursor-pointer');
      fireEvent.click(level1ObjToggle);
      await screen.findByText(/"level2_obj":/); // "level2_obj" is now visible

      // "level3_value_target" is still not visible.
      expect(screen.queryByText("level3_value_target")).not.toBeInTheDocument();
      // The "level2_obj" should now be highlighted because its descendant contains the search term.
      // The highlight class is applied to the div with class "my-1" that contains the key and the JsonNode.
      const level2ObjEntryDiv = screen.getByText(/"level2_obj":/).closest('div.my-1');
      expect(level2ObjEntryDiv).toHaveClass('bg-yellow-200'); // Or dark mode equivalent

      // Expand "level2_obj"
      const level2ObjToggle = screen.getByText(/"level2_obj":/).parentElement.querySelector('div.ml-4 > span.cursor-pointer');
      fireEvent.click(level2ObjToggle);
      
      // Now "level3_key" and "level3_value_target" should be visible
      await screen.findByText(/"level3_key":/);
      expect(screen.getByText(/"level3_value_target"/)).toBeInTheDocument();

      // The "level3_key" entry div should now be highlighted
      const level3KeyEntryDiv = screen.getByText(/"level3_key":/).closest('div.my-1');
      expect(level3KeyEntryDiv).toHaveClass('bg-yellow-200'); // Or dark mode equivalent
    });
  });
});
