
import { renderToString } from 'react-dom/server';
import App from './src/App';
import React from 'react';
try {
  const html = renderToString(React.createElement(App));
  console.log('SUCCESS:', html.substring(0, 100));
} catch (e) {
  console.error('ERROR RENDER:', e);
}

