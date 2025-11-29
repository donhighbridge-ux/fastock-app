import FileUpload from './components/FileUpload';
import './App.css';

function App() {
  return (
    // Solo un div contenedor, como debe ser.
    <div className="app-container">
      <h1>FASTock Admin</h1>
      <FileUpload />
    </div>
  );
}

export default App;
