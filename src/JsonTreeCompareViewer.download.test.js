import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import JsonTreeCompareViewer from './JsonTreeCompareViewer';
// Import html2pdf.js to be mocked. The actual library is not used in tests.
import html2pdf from 'html2pdf.js';

// --- Mocks Setup ---

// Mock html2pdf.js
const mockHtml2pdfSave = jest.fn().mockResolvedValue(undefined); // To simulate async save operation
const mockHtml2pdfInstance = {
  from: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  save: mockHtml2pdfSave,
};
jest.mock('html2pdf.js', () => jest.fn(() => mockHtml2pdfInstance));

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-object-url');
global.URL.revokeObjectURL = jest.fn();

// Declare spies/mocks that will be initialized in beforeEach
let mockAlert;
let jsonStringifySpy;
let mockDocumentCreateElement;
let mockBodyAppendChild;
let mockBodyRemoveChild;

beforeEach(() => {
  // Window method mocks
  mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {}); // Mock alert to prevent dialogs

  // JSON.stringify spy
  jsonStringifySpy = jest.spyOn(JSON, 'stringify');

  // DOM manipulation spies
  mockDocumentCreateElement = jest.spyOn(document, 'createElement');
  mockBodyAppendChild = jest.spyOn(document.body, 'appendChild').mockImplementation(node => node);
  mockBodyRemoveChild = jest.spyOn(document.body, 'removeChild').mockImplementation(node => node);

  // Clear mocks for html2pdf.js and URL object methods for each test
  mockHtml2pdfInstance.from.mockClear();
  mockHtml2pdfInstance.set.mockClear();
  mockHtml2pdfSave.mockClear();
  global.URL.createObjectURL.mockClear();
  global.URL.revokeObjectURL.mockClear();
});

afterEach(() => {
  jest.restoreAllMocks(); // This will restore window.alert, JSON.stringify, document.createElement, etc.
});

// --- Test Suite ---

describe('JsonTreeCompareViewer Download Functionality', () => {
  const leftJson = { a: 1, b: "hello" };
  const rightJson = { a: 1, b: "world", c: true };
  const leftJsonString = JSON.stringify(leftJson); // Use actual stringify for test data setup
  const rightJsonString = JSON.stringify(rightJson); // Use actual stringify for test data setup

  // Helper to perform comparison and enable download button
  const setupForDownload = async () => {
    render(<JsonTreeCompareViewer />);
    fireEvent.change(screen.getByPlaceholderText('Enter left JSON here'), { target: { value: leftJsonString } });
    fireEvent.change(screen.getByPlaceholderText('Enter right JSON here'), { target: { value: rightJsonString } });
    fireEvent.click(screen.getByText('Compare'));
    await screen.findByText('Comparison Statistics'); // Wait for comparison to complete
    const downloadReportButton = screen.getByRole('button', { name: /Download Report/i });
    expect(downloadReportButton).not.toBeDisabled();
    fireEvent.click(downloadReportButton); // Open dropdown
  };

  describe('Initial State', () => {
    test('Download Report button is disabled initially', () => {
      render(<JsonTreeCompareViewer />);
      const downloadReportButton = screen.getByRole('button', { name: /Download Report/i });
      expect(downloadReportButton).toBeDisabled();
    });
  });

  describe('JSON Download', () => {
    // Specific beforeEach for JSON download if needed, e.g. for the 'a' element mock
    let mockAnchorClick;

    beforeEach(() => {
      mockAnchorClick = jest.fn();
      // Refine the createElement mock for 'a' tags specifically for JSON download tests
      mockDocumentCreateElement.mockImplementation((tagName) => {
        if (tagName.toLowerCase() === 'a') {
          const mockAnchor = {
            href: '',
            download: '',
            click: mockAnchorClick,
            setAttribute: jest.fn(),
            removeAttribute: jest.fn(),
            style: {}, // Ensure style property exists
          };
          return mockAnchor;
        }
        // Fallback for other elements not created by the download function
        return document.createElementNS('http://www.w3.org/1999/xhtml', tagName);
      });
    });
    
    test('successfully downloads a JSON report', async () => {
      await setupForDownload();
      
      const downloadJsonButton = screen.getByText('Download as JSON');
      fireEvent.click(downloadJsonButton);

      await waitFor(() => {
        expect(jsonStringifySpy).toHaveBeenCalledWith(
          expect.objectContaining({
            leftJson: leftJsonString,
            rightJson: rightJsonString,
            comparisonStats: expect.objectContaining({ // Actual stats for the given JSONs
              totalLeftItems: 2,
              totalRightItems: 3,
              commonPaths: 2,
              matchingValues: 1,
              differentValues: 1,
              onlyInLeft: 0,
              onlyInRight: 1,
            }),
          }),
          null, // for replacer function
          2     // for space argument (pretty-printing)
        );
      });
      
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      const blobInstance = global.URL.createObjectURL.mock.calls[0][0];
      expect(blobInstance.type).toBe('application/json');

      expect(mockDocumentCreateElement).toHaveBeenCalledWith('a');
      const mockAnchorInstance = mockDocumentCreateElement.mock.results.find(r => r.value.click === mockAnchorClick)?.value;
      expect(mockAnchorInstance).toBeDefined();
      if (mockAnchorInstance) {
        expect(mockAnchorInstance.href).toBe('mock-object-url');
        expect(mockAnchorInstance.download).toBe('comparison_report.json');
      }
      expect(mockAnchorClick).toHaveBeenCalled();

      expect(mockBodyAppendChild).toHaveBeenCalledWith(mockAnchorInstance);
      expect(mockBodyRemoveChild).toHaveBeenCalledWith(mockAnchorInstance);
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('mock-object-url');
    });
  });

  describe('PDF Download', () => {
    beforeEach(() => {
      // Ensure createElement returns actual divs for PDF generation part
      mockDocumentCreateElement.mockImplementation((tagName) => 
        document.createElementNS('http://www.w3.org/1999/xhtml', tagName)
      );
    });

    test('successfully generates HTML and initiates PDF download', async () => {
      await setupForDownload();

      const downloadPdfButton = screen.getByText('Download as PDF');
      await act(async () => { // Use act for state updates / async operations
        fireEvent.click(downloadPdfButton);
      });

      expect(html2pdf).toHaveBeenCalledTimes(1);
      expect(mockHtml2pdfInstance.from).toHaveBeenCalledWith(expect.any(HTMLDivElement));
      
      const passedElement = mockHtml2pdfInstance.from.mock.calls[0][0];
      expect(passedElement.innerHTML).toContain('JSON Comparison Report');
      expect(passedElement.innerHTML).toContain('Comparison Statistics:');
      // Based on leftJson and rightJson for this test suite
      expect(passedElement.innerHTML).toContain('Total Left Items:</strong> 2');
      expect(passedElement.innerHTML).toContain('Total Right Items:</strong> 3');
      expect(passedElement.innerHTML).toContain('Common Paths:</strong> 2');
      expect(passedElement.innerHTML).toContain('Matching Values:</strong> 1');
      expect(passedElement.innerHTML).toContain('Different Values:</strong> 1');
      expect(passedElement.innerHTML).toContain('Only In Left:</strong> 0'); // Corrected from 'Exclusive to Left' to match implementation
      expect(passedElement.innerHTML).toContain('Only In Right:</strong> 1'); // Corrected from 'Exclusive to Right'

      expect(mockHtml2pdfInstance.set).toHaveBeenCalledWith(expect.objectContaining({
        filename: 'comparison_report.pdf',
        margin: [10, 10, 10, 10],
      }));
      expect(mockHtml2pdfSave).toHaveBeenCalledTimes(1);
      
      await waitFor(() => {
         expect(mockAlert).toHaveBeenCalledWith('PDF report download started. Please check your downloads.');
      });
    });

    test('handles error during PDF generation and shows alert', async () => {
      await setupForDownload();
      mockHtml2pdfSave.mockRejectedValueOnce(new Error('Test PDF Generation Error'));

      const downloadPdfButton = screen.getByText('Download as PDF');
      await act(async () => {
        fireEvent.click(downloadPdfButton);
      });
      
      expect(mockHtml2pdfSave).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Failed to generate or download PDF report: Test PDF Generation Error. See console for details.');
      });
    });
  });
});
