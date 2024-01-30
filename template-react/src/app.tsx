import { useState } from 'react';
import reactLogo from '/react.svg';
import ppDevLogo from '/pp-dev.svg';
import './assets/css/app.scss';
import Docs from './components/docs/docs.tsx';

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <div>
        <a href="https://www.npmjs.com/package/@metricinsights/pp-dev" target="_blank" rel="noopener noreferrer">
          <img src={ppDevLogo} className="logo" alt="PP-Dev logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noopener noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>PP Dev + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>count is {count}</button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">Click on the Vite and React logos to learn more</p>

      <Docs />
    </>
  );
}

export default App;
