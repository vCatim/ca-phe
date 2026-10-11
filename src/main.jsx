// Điểm vào của app: gắn component Root vào thẻ <div id="root"> trong index.html
import React from 'react';
import { createRoot } from 'react-dom/client';
import Root from './App.jsx';
import './style.css';

createRoot(document.getElementById('root')).render(<Root />);
