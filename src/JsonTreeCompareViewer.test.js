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
          level3_key: 'level3_value_target', 
        },
        level2_arr: ['arr_val1', { arr_obj_key: 'arr_obj_val' }],
      },
      another_level1_key: 'another_value',
    };
    const nestedJsonString = JSON.stringify(nestedJson);
    
    const findChevronDown = (element) => element.querySelector('svg.lucide-chevron-down');
    const findChevronRight = (element) => element.querySelector('svg.lucide-chevron-right');


    test('Initial Render: root expanded, children collapsed', async () => {
      render(<JsonTreeCompareViewer />);
      fireEvent.change(screen.getByPlaceholderText('Enter left JSON here'), { target: { value: nestedJsonString } });
      fireEvent.change(screen.getByPlaceholderText('Enter right JSON here'), { target: { value: "{}" } }); 
      fireEvent.click(screen.getByText('Compare'));
      await screen.findByText('Comparison Result');

      expect(screen.getByText(/"level1_key":/)).toBeInTheDocument();
      expect(screen.getByText(/"level1_obj":/)).toBeInTheDocument();
      expect(screen.getByText(/"another_level1_key":/)).toBeInTheDocument();
      
      const leftTreeContainer = screen.getByText('Left JSON').closest('.w-full.md\\:w-1\\/2').querySelector('.border.rounded.p-4');
      const rootToggle = leftTreeContainer.querySelector('span.cursor-pointer'); 
      expect(rootToggle).not.toBeNull();
      expect(findChevronDown(rootToggle)).toBeInTheDocument(); 
      
      expect(screen.queryByText(/"level2_key":/)).not.toBeInTheDocument();
      expect(screen.queryByText(/"level3_key":/)).not.toBeInTheDocument();

      const level1ObjToggleContainer = screen.getByText(/"level1_obj":/).parentElement.querySelector('div.ml-4 > span.cursor-pointer');
      expect(level1ObjToggleContainer).not.toBeNull();
      expect(findChevronRight(level1ObjToggleContainer)).toBeInTheDocument();
    });

    test('Expanding a Node: children appear, icons update', async () => {
      render(<JsonTreeCompareViewer />);
      fireEvent.change(screen.getByPlaceholderText('Enter left JSON here'), { target: { value: nestedJsonString } });
      fireEvent.click(screen.getByText('Compare'));
      await screen.findByText('Comparison Result');

      expect(screen.queryByText(/"level2_key":/)).not.toBeInTheDocument();

      const level1ObjToggle = screen.getByText(/"level1_obj":/).parentElement.querySelector('div.ml-4 > span.cursor-pointer');
      expect(findChevronRight(level1ObjToggle)).toBeInTheDocument(); 
      fireEvent.click(level1ObjToggle);

      expect(findChevronDown(level1ObjToggle)).toBeInTheDocument();
      
      expect(await screen.findByText(/"level2_key":/)).toBeInTheDocument();
      expect(screen.getByText(/"level2_obj":/)).toBeInTheDocument();
      expect(screen.getByText(/"level2_arr":/)).toBeInTheDocument();

      expect(screen.queryByText(/"level3_key":/)).not.toBeInTheDocument();
      
      const level2ObjToggle = screen.getByText(/"level2_obj":/).parentElement.querySelector('div.ml-4 > span.cursor-pointer');
      expect(findChevronRight(level2ObjToggle)).toBeInTheDocument();
    });

    test('Collapsing a Node: children disappear, icons update', async () => {
      render(<JsonTreeCompareViewer />);
      fireEvent.change(screen.getByPlaceholderText('Enter left JSON here'), { target: { value: nestedJsonString } });
      fireEvent.click(screen.getByText('Compare'));
      await screen.findByText('Comparison Result');

      const level1ObjToggle = screen.getByText(/"level1_obj":/).parentElement.querySelector('div.ml-4 > span.cursor-pointer');
      fireEvent.click(level1ObjToggle);
      await screen.findByText(/"level2_key":/); 
      expect(findChevronDown(level1ObjToggle)).toBeInTheDocument(); 

      fireEvent.click(level1ObjToggle);

      expect(findChevronRight(level1ObjToggle)).toBeInTheDocument();
      
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

      expect(screen.queryByText("level3_value_target")).not.toBeInTheDocument();
      expect(screen.queryByText(/"level3_key":/)).not.toBeInTheDocument();

      const level1ObjToggle = screen.getByText(/"level1_obj":/).parentElement.querySelector('div.ml-4 > span.cursor-pointer');
      fireEvent.click(level1ObjToggle);
      await screen.findByText(/"level2_obj":/); 

      expect(screen.queryByText("level3_value_target")).not.toBeInTheDocument();
      const level2ObjEntryDiv = screen.getByText(/"level2_obj":/).closest('div.my-1');
      expect(level2ObjEntryDiv).toHaveClass('bg-yellow-200'); 

      const level2ObjToggle = screen.getByText(/"level2_obj":/).parentElement.querySelector('div.ml-4 > span.cursor-pointer');
      fireEvent.click(level2ObjToggle);
      
      await screen.findByText(/"level3_key":/);
      expect(screen.getByText(/"level3_value_target"/)).toBeInTheDocument();

      const level3KeyEntryDiv = screen.getByText(/"level3_key":/).closest('div.my-1');
      expect(level3KeyEntryDiv).toHaveClass('bg-yellow-200'); 
    });
  });

  // --- Help Modal Tests ---
  describe('Help Modal', () => {
    test('Opening the Help Modal', async () => {
      render(<JsonTreeCompareViewer />);
      
      const helpButton = screen.getByRole('button', { name: /Open help section/i });
      fireEvent.click(helpButton);

      const helpModal = await screen.findByRole('dialog', { name: /How to Use This Tool/i });
      expect(helpModal).toBeVisible();
      expect(screen.getByText('How to Use This Tool')).toBeVisible();
      expect(screen.getByText(/Welcome to the JSON Tree Compare Viewer!/)).toBeVisible();
    });

    test('Closing the Help Modal (via "X" button in header)', async () => {
      render(<JsonTreeCompareViewer />);
      
      const helpButton = screen.getByRole('button', { name: /Open help section/i });
      fireEvent.click(helpButton);
      await screen.findByRole('dialog'); 

      const closeButtonInModal = screen.getByRole('button', { name: /Close modal/i });
      fireEvent.click(closeButtonInModal);

      await waitFor(() => {
        expect(screen.queryByRole('dialog', { name: /How to Use This Tool/i })).not.toBeInTheDocument();
      });
      expect(screen.queryByText('How to Use This Tool')).not.toBeInTheDocument();
    });

    test('Closing the Help Modal (via "Close" button in footer)', async () => {
        render(<JsonTreeCompareViewer />);
        
        const helpButton = screen.getByRole('button', { name: /Open help section/i });
        fireEvent.click(helpButton);
        const modal = await screen.findByRole('dialog'); 
  
        const closeButtonInFooter = Array.from(modal.querySelectorAll('button')).find(b => b.textContent === "Close");
        expect(closeButtonInFooter).toBeInTheDocument();
        fireEvent.click(closeButtonInFooter);
  
        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
    });

    test('Closing the Help Modal (via overlay click)', async () => {
        render(<JsonTreeCompareViewer />);
        
        const helpButton = screen.getByRole('button', { name: /Open help section/i });
        fireEvent.click(helpButton);
        const modalOverlay = await screen.findByRole('dialog'); 
        
        fireEvent.click(modalOverlay); 
  
        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
    });
  });

  // --- Comparison Statistics Display Tests ---
  describe('Comparison Statistics Display', () => {
    test('Stats are hidden initially', () => {
      render(<JsonTreeCompareViewer />);
      expect(screen.queryByText('Comparison Statistics')).not.toBeInTheDocument();
    });

    test('Basic stats display correctly after comparison', async () => {
      render(<JsonTreeCompareViewer />);
      const jsonA = { a: 1, b: "hello", c: true };
      const jsonB = { a: 1, b: "world", d: false };

      fireEvent.change(screen.getByPlaceholderText('Enter left JSON here'), { target: { value: JSON.stringify(jsonA) } });
      fireEvent.change(screen.getByPlaceholderText('Enter right JSON here'), { target: { value: JSON.stringify(jsonB) } });
      fireEvent.click(screen.getByText('Compare'));

      await screen.findByText('Comparison Statistics');
      
      // Expected stats for jsonA vs jsonB:
      // totalLeftItems: 3 (a, b, c)
      // totalRightItems: 3 (a, b, d)
      // commonPaths: 2 (a, b)
      // matchingValues: 1 (a)
      // differentValues: 1 (b)
      // onlyInLeft: 1 (c)
      // onlyInRight: 1 (d)

      expect(screen.getByText('Total Properties/Elements (Left):').nextSibling.textContent).toBe('3');
      expect(screen.getByText('Total Properties/Elements (Right):').nextSibling.textContent).toBe('3');
      expect(screen.getByText('Common Paths (Keys/Indices):').nextSibling.textContent).toBe('2');
      expect(screen.getByText('Matching Values (at Common Paths):').nextSibling.textContent).toBe('1');
      expect(screen.getByText('Different Values (at Common Paths):').nextSibling.textContent).toBe('1');
      expect(screen.getByText('Exclusive to Left (Paths):').nextSibling.textContent).toBe('1');
      expect(screen.getByText('Exclusive to Right (Paths):').nextSibling.textContent).toBe('1');
    });

    test('Stats are cleared on parsing error', async () => {
      render(<JsonTreeCompareViewer />);
      // First, a valid comparison to show stats
      fireEvent.change(screen.getByPlaceholderText('Enter left JSON here'), { target: { value: '{"a":1}' } });
      fireEvent.change(screen.getByPlaceholderText('Enter right JSON here'), { target: { value: '{"b":2}' } });
      fireEvent.click(screen.getByText('Compare'));
      await screen.findByText('Comparison Statistics');
      expect(screen.getByText('Comparison Statistics')).toBeVisible();

      // Then, an invalid comparison
      fireEvent.change(screen.getByPlaceholderText('Enter right JSON here'), { target: { value: 'invalid json' } });
      fireEvent.click(screen.getByText('Compare'));
      
      // Error message should appear
      await screen.findByText('Invalid JSON input. Please check your JSON and try again.');
      expect(screen.queryByText('Comparison Statistics')).not.toBeInTheDocument();
    });

    test('Stats are cleared with the "Clear" button for one input', async () => {
      render(<JsonTreeCompareViewer />);
      fireEvent.change(screen.getByPlaceholderText('Enter left JSON here'), { target: { value: '{"a":1}' } });
      fireEvent.change(screen.getByPlaceholderText('Enter right JSON here'), { target: { value: '{"b":2}' } });
      fireEvent.click(screen.getByText('Compare'));
      await screen.findByText('Comparison Statistics');

      // Clear Left JSON (assuming clear buttons are identifiable, e.g., by aria-label or order)
      // The buttons are: Copy (left), Clear (left), Copy (right), Clear (right)
      const clearButtons = screen.getAllByRole('button', { name: /Clear/i });
      fireEvent.click(clearButtons[0]); // Click "Clear" for Left JSON

      // Wait for stats to disappear
      await waitFor(() => {
        expect(screen.queryByText('Comparison Statistics')).not.toBeInTheDocument();
      });
    });
    
    test('Stats are cleared when both inputs are cleared', async () => {
        render(<JsonTreeCompareViewer />);
        fireEvent.change(screen.getByPlaceholderText('Enter left JSON here'), { target: { value: '{"a":1}' } });
        fireEvent.change(screen.getByPlaceholderText('Enter right JSON here'), { target: { value: '{"b":2}' } });
        fireEvent.click(screen.getByText('Compare'));
        await screen.findByText('Comparison Statistics');
  
        const clearButtons = screen.getAllByRole('button', { name: /Clear/i });
        fireEvent.click(clearButtons[0]); // Clear Left JSON
        fireEvent.click(clearButtons[1]); // Clear Right JSON
  
        await waitFor(() => {
          expect(screen.queryByText('Comparison Statistics')).not.toBeInTheDocument();
        });
      });
  });
});
