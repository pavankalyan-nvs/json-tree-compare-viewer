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
      fireEvent.click(screen.getByText('Compare')); // Ensure parsed data is available if needed by save logic

      fireEvent.click(screen.getByText('Save Session'));

      expect(mockPrompt).toHaveBeenCalledWith('Enter a name for this session:');
      expect(localStorage.setItem).toHaveBeenCalledWith(sessionKey, expect.any(String));
      const savedData = JSON.parse(localStorageMock[sessionKey]);
      expect(savedData).toHaveLength(1);
      expect(savedData[0].name).toBe('My First Session');
      expect(savedData[0].leftJson).toBe(leftJsonStringSimple);
      expect(savedData[0].rightJson).toBe(rightJsonStringSimple);

      // Check dropdown
      const dropdown = await screen.findByRole('combobox', { name: /Load session/i });
      expect(dropdown).toBeInTheDocument();
      expect(screen.getByText(/My First Session/)).toBeInTheDocument();
    });

    test('Save Session: adds to existing sessions and updates dropdown', async () => {
        const initialSessions = [{ id: '1', name: 'Old Session', leftJson: '{}', rightJson: '{}', timestamp: new Date().toISOString() }];
        localStorageMock[sessionKey] = JSON.stringify(initialSessions);
        mockPrompt.mockReturnValue('New Session');
        
        render(<JsonTreeCompareViewer />); // Mounts after LS is pre-populated

        // Wait for initial sessions to load into dropdown
        await screen.findByText(/Old Session/);

        fireEvent.change(screen.getByPlaceholderText('Enter left JSON here'), { target: { value: leftJsonStringSimple } });
        fireEvent.click(screen.getByText('Save Session'));

        const savedData = JSON.parse(localStorageMock[sessionKey]);
        expect(savedData).toHaveLength(2);
        expect(savedData.find(s => s.name === 'New Session')).toBeDefined();
        
        expect(screen.getByText(/New Session/)).toBeInTheDocument(); // New session in dropdown
    });
    
    test('Save Session: does not save if session name is empty', () => {
      mockPrompt.mockReturnValue(''); // Empty name
      render(<JsonTreeCompareViewer />);
      fireEvent.click(screen.getByText('Save Session'));
      expect(localStorage.setItem).not.toHaveBeenCalled();
      // Check for alert if possible, or just that LS wasn't touched.
      // Alert functionality is harder to test without overriding window.alert
    });

    test('Save Session: does not save if both JSON inputs are empty', () => {
      mockPrompt.mockReturnValue('Empty Session');
      render(<JsonTreeCompareViewer />);
      // JSON inputs are empty by default
      fireEvent.click(screen.getByText('Save Session'));
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });


    test('Load Session: populates dropdown and loads selected session', async () => {
      const sessions = [
        { id: 's1', name: 'Session One', leftJson: leftJsonStringSimple, rightJson: rightJsonStringSimple, timestamp: new Date().toISOString() },
        { id:s2, name: 'Session Two', leftJson: leftJsonStringComplex, rightJson: rightJsonStringComplex, timestamp: new Date().toISOString() },
      ];
      localStorageMock[sessionKey] = JSON.stringify(sessions);

      render(<JsonTreeCompareViewer />);

      const dropdown = await screen.findByRole('combobox', { name: /Load session/i });
      expect(screen.getByText(/Session One/)).toBeInTheDocument();
      expect(screen.getByText(/Session Two/)).toBeInTheDocument();

      fireEvent.change(dropdown, { target: { value: 's2' } }); // Select "Session Two"

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter left JSON here').value).toBe(leftJsonStringComplex);
        expect(screen.getByPlaceholderText('Enter right JSON here').value).toBe(rightJsonStringComplex);
      });
      // Check if comparison result reflects loaded data
      await screen.findByText('Comparison Result');
      expect(screen.getByText(/"id": "user123"/)).toBeInTheDocument(); // From leftJsonComplex
      expect(screen.getByText(/"id": "user456"/)).toBeInTheDocument(); // From rightJsonComplex
      
      // Check search query is cleared (assuming it might have had value before)
      // This requires search input to be present, which happens after compare
      const searchInput = screen.getByPlaceholderText('Search keys/values...');
      expect(searchInput.value).toBe('');
      
      // Check selectedSessionId state (indirectly via dropdown value)
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
      mockConfirm.mockReturnValue(true); // Confirm deletion

      render(<JsonTreeCompareViewer />);

      const dropdown = await screen.findByRole('combobox', { name: /Load session/i });
      expect(screen.getByText(/To Delete/)).toBeInTheDocument();
      expect(screen.getByText(/To Keep/)).toBeInTheDocument();
      
      // Select "To Delete"
      fireEvent.change(dropdown, { target: { value: 's1' } });
      expect(dropdown.value).toBe('s1'); // Ensure selection is registered

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
      // Check if dropdown selection is cleared
      expect(dropdown.value).toBe(''); // or the first available option if not default
    });

    test('Delete Session: cancels deletion if user does not confirm', async () => {
      const sessions = [{ id: 's1', name: 'Session A', leftJson: '{}', rightJson: '{}', timestamp: new Date().toISOString() }];
      localStorageMock[sessionKey] = JSON.stringify(sessions);
      mockConfirm.mockReturnValue(false); // Cancel deletion

      render(<JsonTreeCompareViewer />);
      const dropdown = await screen.findByRole('combobox', { name: /Load session/i });
      fireEvent.change(dropdown, { target: { value: 's1' } });
      
      fireEvent.click(screen.getByRole('button', { name: /Delete selected session/i }));

      expect(mockConfirm).toHaveBeenCalled();
      const currentSavedData = JSON.parse(localStorageMock[sessionKey]);
      expect(currentSavedData).toHaveLength(1); // Session still there
      expect(screen.getByText(/Session A/)).toBeInTheDocument(); // Still in dropdown
    });
    
    test('Delete Session: delete button is disabled if no session is selected', async () => {
        const sessions = [{ id: 's1', name: 'Session A', leftJson: '{}', rightJson: '{}', timestamp: new Date().toISOString() }];
        localStorageMock[sessionKey] = JSON.stringify(sessions);
        render(<JsonTreeCompareViewer />);
        await screen.findByRole('combobox', { name: /Load session/i }); // Wait for dropdown
        
        const deleteButton = screen.getByRole('button', { name: /Delete selected session/i });
        expect(deleteButton).toBeDisabled();
    });
  });
});
