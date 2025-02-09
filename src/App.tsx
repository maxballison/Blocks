// App.tsx
import React, { useState } from 'react';
import Editor from './components/Editor';
import CanvasView from './components/CanvasView';
import { SnippetToolbar } from './components/SnippetToolbar'; // Our snippet toolbar
import { lex, parse } from './parser';
import { interpret, startProgram } from './interpreter';
import './App.css'; // <-- Import the new CSS

function App() {
  const [code, setCode] = useState<string>(`# Example program
CanvasSize = (500, 500)

x = 0

function run():
    circle(x, 300, 30)
    x = x + 2
    if x > 500:
        x = 0
`);

  const [errors, setErrors] = useState<string[]>([]);
  const [canvasSize, setCanvasSize] = useState<[number, number]>([500, 500]);
  const [drawingCommands, setDrawingCommands] = useState<{ cmd: string; args: number[] }[]>([]);

  const runCode = () => {
    setErrors([]);

    // 1. Lex
    let tokens;
    try {
      tokens = lex(code);
    } catch (err: any) {
      setErrors(prev => [...prev, `Lexer error: ${err.message}`]);
      return;
    }

    // 2. Parse
    let ast;
    try {
      ast = parse(tokens);
    } catch (err: any) {
      setErrors(prev => [...prev, `Parser error: ${err.message}`]);
      return;
    }

    console.log('Tokens:', tokens);
    console.log('AST:', ast);

    // 3. Interpret
    const context = {
      globals: {},
      functions: {},
      error: (msg: string) => {
        setErrors(prev => [...prev, msg]);
      },
      drawingCommands: [] as { cmd: string; args: number[] }[],
      running: false,
      keysDown: new Set<string>(),
      colorStack: [],
    };

    interpret(ast, context);

    // 4. Set canvas size if found
    if (context.globals['CanvasSize'] && Array.isArray(context.globals['CanvasSize'])) {
      setCanvasSize(context.globals['CanvasSize']);
    } else {
      setCanvasSize([800, 600]);
    }

    // 5. Start program
    startProgram(context);

    // 6. Poll commands for each frame
    const pollCommands = () => {
      if (!context.running) return;
      setDrawingCommands([...context.drawingCommands]);
      requestAnimationFrame(pollCommands);
    };
    pollCommands();
  };

  return (
    <div id="root">
      {/* Top bar with Run button & snippet toolbar */}
      <div className="top-bar">

        <div className="snippet-toolbar">
          <SnippetToolbar />
        </div>
        <button onClick={runCode} className="run-button" style={{ marginLeft: 'auto' }}>
        Run
        </button>

        {errors.length > 0 && (
          <div className="errors">
            {errors.map((e, i) => (
              <div key={i}>{e}</div>
            ))}
          </div>
        )}
      </div>

      {/* Main two-column layout: Editor & Canvas */}
      <div className="main-area">
        <div className="editor-section">
          <Editor code={code} onChange={setCode} />
        </div>

        <div className="canvas-section">
          {/* If you want a small 'card' style wrap: */}
          <div className="canvas-inner">
            <CanvasView
              width={canvasSize[0]}
              height={canvasSize[1]}
              drawingCommands={drawingCommands}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;