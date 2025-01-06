// App.tsx
import React, { useState } from 'react';
import Editor from './components/Editor';
import CanvasView from './components/CanvasView';
import { lex, parse } from './parser';
import { interpret, startProgram } from './interpreter';

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

    // Poll commands for each frame
    const pollCommands = () => {
      if (!context.running) return;
      setDrawingCommands([...context.drawingCommands]);
      requestAnimationFrame(pollCommands);
    };
    pollCommands();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Top Bar */}
      <div style={{ padding: '8px', background: '#ccc', display: 'flex', alignItems: 'center' }}>
        <button onClick={runCode} style={{ marginRight: '8px' }}>Run</button>
        {errors.length > 0 && (
          <div style={{ color: 'red', marginLeft: '16px' }}>
            {errors.map((e, i) => (
              <div key={i}>{e}</div>
            ))}
          </div>
        )}
      </div>

      {/* Main Area: Editor (Left) & Canvas (Right) */}
      <div style={{ flex: 1, display: 'flex' }}>
        {/* Editor Section */}
        <div style={{ flex: 1, borderRight: '1px solid #ccc' }}>
          <Editor code={code} onChange={setCode} />
        </div>

        {/* Canvas Section */}
        <div 
          style={{ 
            flex: 1, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            background: '#f7f7f7' 
          }}
        >
          <CanvasView
            width={canvasSize[0]}
            height={canvasSize[1]}
            drawingCommands={drawingCommands}
          />
        </div>
      </div>
    </div>
  );
}

export default App;