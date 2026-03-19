import { createServer } from 'vite';
import fs from 'fs';

async function testRender() {
  try {
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'custom'
    });
    
    // Load and execute App.tsx through Vite
    const AppModule = await vite.ssrLoadModule('/src/App.tsx');
    console.log("AppModule imported successfully");
    
    // Can we render it?
    const ReactDOMServer = await vite.ssrLoadModule('react-dom/server');
    const React = await vite.ssrLoadModule('react');
    
    const html = ReactDOMServer.renderToString(React.createElement(AppModule.default));
    console.log("Rendered HTML starts with:", html.substring(0, 100));
    
    await vite.close();
  } catch (err) {
    console.error("Vite SSR Error:", err);
    process.exit(1);
  }
}
testRender();
