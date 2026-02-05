import { AuthProvider } from './lib/contexts/AuthContext';
import { Router } from './components/Router';

function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}

export default App;
