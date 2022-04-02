import React from 'react';
import ReactDom from 'react-dom';
import {HashRouter as Router, Routes, Route} from 'react-router-dom';
import Login from './Login';
import Signup from './Signup';
import Home from './Home';
import Editor from './Editor';


const mainElement = document.createElement('div');
document.body.appendChild(mainElement);

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/home" element={<Home />} />
        <Route path="/editor" element={<Editor />} />
      </Routes>
    </Router>
  )
}

export default App;

ReactDom.render(<App />, mainElement);
