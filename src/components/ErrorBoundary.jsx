import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
          <Card className="w-full max-w-2xl dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-6 w-6" />
                Application Error
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Something went wrong</AlertTitle>
                <AlertDescription>
                  An unexpected error occurred while rendering the application. This might be due to invalid JSON data or a component issue.
                </AlertDescription>
              </Alert>

              {this.state.error && (
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md">
                  <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-2">
                    Error Details:
                  </h4>
                  <pre className="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap break-words">
                    {this.state.error.toString()}
                  </pre>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={this.handleReset}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="dark:text-white dark:border-white"
                >
                  Reload Page
                </Button>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <p><strong>Troubleshooting tips:</strong></p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Verify that your JSON input is valid</li>
                  <li>Try clearing the JSON inputs and starting fresh</li>
                  <li>Check the browser console for additional error details</li>
                  <li>If the issue persists, try refreshing the page</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;