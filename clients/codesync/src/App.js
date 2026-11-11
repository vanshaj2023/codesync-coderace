import './App.css';
import { Routes, Route } from "react-router-dom";
import Home from './components/Home';
import EditorPage from './components/EditorPage';
import { Toaster } from 'react-hot-toast';
import HomePage from './components/HomePage';

function App() {
  return (
    <>
    <div>
      <Toaster
        position='top-center'
        toastOptions={{
          style: {
            background: '#0e1512',
            color: '#f5f5f5',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
          success: { iconTheme: { primary: '#5ed29c', secondary: '#070b0a' } },
        }}
      ></Toaster>
    </div>
    <Routes>
     <Route path='/' element={ <HomePage/> } />
     <Route path='/Home' element={<Home/>}/>
     <Route path='/editor/:roomId' element={ <EditorPage /> } />
    </Routes>
    </>
  );
}

export default App;
