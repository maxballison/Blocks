import React, { useRef, useState } from 'react';
import Editor from './Editor';
import CanvasView from './CanvasView';
import { SnippetToolbar } from './SnippetToolbar';
import { lex, parse } from '../parser';
import { interpret, startProgram } from '../interpreter';

function Project() {
  const [code, setCode] = useState<string>(`# Example program
CanvasSize = (500, 500)

x = 0
sz = 3
function run():
    circle(x, 300, sz)
    sz = sz + 0.1
    x = x + 2
    if x > 500:
        x = 0
    if sz > 200:
        sz = 3

`);

  const [errors, setErrors] = useState<string[]>([]);
  const [canvasSize, setCanvasSize] = useState<[number, number]>([500, 500]);
  const [drawingCommands, setDrawingCommands] = useState<{ cmd: string; args: number[] }[]>([]);

  // We'll store the current execution context in a ref,
  // allowing us to stop execution (by setting context.running = false).
  const contextRef = useRef<any>(null);

  // A helper function that sets an error and stops code execution.
  // This will be used by the interpreter’s "error" callback.
  const handleError = (msg: string) => {
    setErrors(prev => [...prev, msg]);
    if (contextRef.current) {
      contextRef.current.running = false;
    }
  };

  const runCode = () => {
    setErrors([]);

    // 1. Lex
    let tokens;
    try {
      tokens = lex(code);
    } catch (err: any) {
      handleError(`Lexer error: ${err.message}`);
      return;
    }

    // 2. Parse
    let ast;
    try {
      ast = parse(tokens);
    } catch (err: any) {
      handleError(`Parser error: ${err.message}`);
      return;
    }

    console.log('Tokens:', tokens);
    console.log('AST:', ast);

    // 3. Interpret
    // We use handleError so that if interpret fails or calls context.error(...),
    // the code is automatically stopped.
    const newContext = {
      globals: {},
      functions: {},
      error: handleError,
      drawingCommands: [] as { cmd: string; args: number[] }[],
      running: false,
      keysDown: new Set<string>(),
      colorStack: [],
    };

    interpret(ast, newContext);

    // 4. Set canvas size if found
    if (newContext.globals['CanvasSize'] && Array.isArray(newContext.globals['CanvasSize'])) {
      setCanvasSize(newContext.globals['CanvasSize']);
    } else {
      setCanvasSize([800, 600]);
    }

    // 5. Start program
    startProgram(newContext);

    // 6. Poll commands for each frame
    const pollCommands = () => {
      if (!newContext.running) return;
      setDrawingCommands([...newContext.drawingCommands]);
      requestAnimationFrame(pollCommands);
    };
    pollCommands();

    // Store reference to the context so we can stop later.
    contextRef.current = newContext;
  };

  // Stop execution by setting running = false
  const stopCode = () => {
    if (contextRef.current) {
      contextRef.current.running = false;
    }
  };

  return (
    <div className="project-container">
      {/* Top bar with Run button, Stop button & snippet toolbar */}
      <div className="top-bar">
        <div className="snippet-toolbar">
          <SnippetToolbar />
        </div>

        {/* Run / Stop buttons */}
        <button onClick={runCode} className="run-button" style={{ marginLeft: 'auto' }}>
          Run
        </button>
        <button onClick={stopCode} className="stop-button">
          Stop
        </button>
      </div>

      {/* Main two-column layout: Editor & Canvas */}
      <div className="main-area">
        <div className="editor-section">
          <Editor code={code} onChange={setCode} />
        </div>
        <div className="canvas-section">
          <div className="canvas-inner">
            <CanvasView
              width={canvasSize[0]}
              height={canvasSize[1]}
              drawingCommands={drawingCommands}
            />
          </div>
        </div>
      </div>

      {/* Error area at the bottom */}
      <div className="error-area">
        {errors.length > 0 && (
          <div className="errors">
            {errors.map((e, i) => (
              <div key={i}>{e}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Project;