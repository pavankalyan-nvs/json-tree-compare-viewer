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

// --- Download Functionality Tests ---
describe('Download Functionality', () => {
  const leftJson = { name: 'Left', value: 1 };
  const rightJson = { name: 'Right', value: 2 };
  const leftJsonString = JSON.stringify(leftJson);
  const rightJsonString = JSON.stringify(rightJson);

  let createObjectURLMock;
  let revokeObjectURLMock;
  let anchorClickMock;

  beforeEach(() => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    createObjectURLMock = jest.fn().mockReturnValue('mock-url');
    revokeObjectURLMock = jest.fn();
    global.URL.createObjectURL = createObjectURLMock;
    global.URL.revokeObjectURL = revokeObjectURLMock;

    // Mock anchor element click
    anchorClickMock = jest.fn();
    HTMLAnchorElement.prototype.click = anchorClickMock; // Mocking the click method
    
    // Mock jsPDF and autoTable
    jest.mock('jspdf', () => {
      const mockSave = jest.fn();
      const mockText = jest.fn();
      const mockSetFontSize = jest.fn();
      // Mock the lastAutoTable property for jsPDF instance
      const mockInstance = {
        save: mockSave,
        text: mockText,
        setFontSize: mockSetFontSize,
        lastAutoTable: { finalY: 50 }, 
      };
      return jest.fn(() => mockInstance);
    });

    jest.mock('jspdf-autotable', () => jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks(); // Restores original implementations
    jest.unmock('jspdf'); // Unmock jspdf
    jest.unmock('jspdf-autotable'); // Unmock jspdf-autotable
    // Clean up specific mocks if necessary, though restoreAllMocks should handle most.
    if (HTMLAnchorElement.prototype.click === anchorClickMock) {
        delete HTMLAnchorElement.prototype.click; // Or restore original if saved
    }
  });

  test('Download buttons are initially disabled and enabled after comparison', async () => {
    render(<JsonTreeCompareViewer />);
    const downloadJsonButton = screen.getByRole('button', { name: 'Download JSON Report' });
    const downloadPdfButton = screen.getByRole('button', { name: 'Download PDF Report' });

    expect(downloadJsonButton).toBeDisabled();
    expect(downloadPdfButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Enter left JSON here'), { target: { value: leftJsonString } });
    fireEvent.change(screen.getByPlaceholderText('Enter right JSON here'), { target: { value: rightJsonString } });
    fireEvent.click(screen.getByText('Compare'));

    await waitFor(() => {
      expect(downloadJsonButton).not.toBeDisabled();
      expect(downloadPdfButton).not.toBeDisabled();
    });
  });
  
  test('Download JSON Report functionality', async () => {
    render(<JsonTreeCompareViewer />);
    fireEvent.change(screen.getByPlaceholderText('Enter left JSON here'), { target: { value: leftJsonString } });
    fireEvent.change(screen.getByPlaceholderText('Enter right JSON here'), { target: { value: rightJsonString } });
    fireEvent.click(screen.getByText('Compare'));
    
    const downloadJsonButton = await screen.findByRole('button', { name: 'Download JSON Report' });
    expect(downloadJsonButton).not.toBeDisabled();
    fireEvent.click(downloadJsonButton);

    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    const blob = createObjectURLMock.mock.calls[0][0];
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/json');

    const blobText = await blob.text(); // Read the Blob's content
    const reportData = JSON.parse(blobText);
    expect(reportData.leftJson).toEqual(leftJson);
    expect(reportData.rightJson).toEqual(rightJson);
    expect(reportData.statistics).toBeDefined();
    expect(reportData.timestamp).toBeDefined();

    const downloadAttribute = document.querySelector('a[download]');
    expect(downloadAttribute.download).toMatch(/^json_comparison_report_.*\.json$/);
    expect(anchorClickMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLMock).toHaveBeenCalledWith('mock-url');
  });

  test('Download PDF Report functionality', async () => {
    const { jsPDF } = require('jspdf'); // Retrieve the mocked constructor
    const autoTable = require('jspdf-autotable'); // Retrieve the mocked function
    
    render(<JsonTreeCompareViewer />);
    fireEvent.change(screen.getByPlaceholderText('Enter left JSON here'), { target: { value: leftJsonString } });
    fireEvent.change(screen.getByPlaceholderText('Enter right JSON here'), { target: { value: rightJsonString } });
    fireEvent.click(screen.getByText('Compare'));

    const downloadPdfButton = await screen.findByRole('button', { name: 'Download PDF Report' });
    expect(downloadPdfButton).not.toBeDisabled();
    fireEvent.click(downloadPdfButton);
    
    expect(jsPDF).toHaveBeenCalledTimes(1);
    const mockPdfInstance = jsPDF.mock.results[0].value;

    expect(mockPdfInstance.text).toHaveBeenCalledWith("JSON Comparison Report", 14, 22);
    expect(mockPdfInstance.text).toHaveBeenCalledWith(expect.stringContaining("Report generated on:"), 14, 30);
    
    expect(autoTable).toHaveBeenCalledTimes(1);
    expect(autoTable.mock.calls[0][1].head).toEqual([['Metric', 'Value']]);
    expect(autoTable.mock.calls[0][1].body.length).toBeGreaterThan(0); // Check that some stats rows were passed
    
    expect(mockPdfInstance.save).toHaveBeenCalledTimes(1);
    expect(mockPdfInstance.save).toHaveBeenCalledWith(expect.stringMatching(/^json_comparison_report_.*\.pdf$/));
  });
});


// --- Keyboard Shortcut Tests ---
describe('JsonTreeCompareViewer Keyboard Shortcuts', () => {
  let consoleLogSpy;

  beforeEach(() => {
    // Spy on console.log before each test in this suite
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    // Ensure navigator.clipboard.writeText is fresh for each test
    navigator.clipboard.writeText.mockClear(); 
  });

  afterEach(() => {
    // Restore console.log
    consoleLogSpy.mockRestore();
    // Clear the class list for documentElement after dark mode tests
    document.documentElement.classList.remove('dark');
  });

  const testCases = [
    { description: 'Ctrl', keyProps: { ctrlKey: true, metaKey: false } },
    { description: 'Meta (Cmd)', keyProps: { ctrlKey: false, metaKey: true } },
  ];

  testCases.forEach(({ description, keyProps }) => {
    describe(`With ${description} Key`, () => {
      test(`toggles dark mode with ${description}+D`, () => {
        render(<JsonTreeCompareViewer />);
        expect(document.documentElement.classList.contains('dark')).toBe(false);

        fireEvent.keyDown(document, { key: 'd', ...keyProps });
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(consoleLogSpy).toHaveBeenCalledWith('Dark mode toggled via shortcut.');

        fireEvent.keyDown(document, { key: 'D', ...keyProps }); // Test with uppercase D
        expect(document.documentElement.classList.contains('dark')).toBe(false);
        expect(consoleLogSpy).toHaveBeenCalledWith('Dark mode toggled via shortcut.');
      });

      test(`copies left JSON with ${description}+Shift+C`, () => {
        const { getByPlaceholderText } = render(<JsonTreeCompareViewer />);
        const leftInput = getByPlaceholderText('Enter left JSON here');
        const testJson = '{"name":"test"}';
        fireEvent.change(leftInput, { target: { value: testJson } });

        fireEvent.keyDown(document, { key: 'C', shiftKey: true, ...keyProps });
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(testJson);
        expect(consoleLogSpy).toHaveBeenCalledWith('Left JSON copied to clipboard via shortcut.');
      });

      test(`clears left JSON with ${description}+Shift+L`, () => {
        const { getByPlaceholderText } = render(<JsonTreeCompareViewer />);
        const leftInput = getByPlaceholderText('Enter left JSON here');
        fireEvent.change(leftInput, { target: { value: '{"data":"left"}' } });
        expect(leftInput.value).toBe('{"data":"left"}');

        fireEvent.keyDown(document, { key: 'L', shiftKey: true, ...keyProps });
        expect(leftInput.value).toBe('');
        expect(consoleLogSpy).toHaveBeenCalledWith('Left JSON cleared via shortcut.');
      });

      test(`clears right JSON with ${description}+Shift+R`, () => {
        const { getByPlaceholderText } = render(<JsonTreeCompareViewer />);
        const rightInput = getByPlaceholderText('Enter right JSON here');
        fireEvent.change(rightInput, { target: { value: '{"data":"right"}' } });
        expect(rightInput.value).toBe('{"data":"right"}');

        fireEvent.keyDown(document, { key: 'R', shiftKey: true, ...keyProps });
        expect(rightInput.value).toBe('');
        expect(consoleLogSpy).toHaveBeenCalledWith('Right JSON cleared via shortcut.');
      });
    });
  });
});
