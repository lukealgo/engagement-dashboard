import Dashboard from './components/Dashboard'
import ErrorBoundary from './components/ErrorBoundary'
import './App.css'

function App() {
  return (
    <div className="App">
      <ErrorBoundary
        onError={(error, errorInfo) => {
          // In production, you would send this to your error tracking service
          console.error('Application Error:', error, errorInfo);
        }}
      >
        <Dashboard />
      </ErrorBoundary>
    </div>
  )
}

export default App
