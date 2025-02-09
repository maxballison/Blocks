import React from 'react';

function Documentation() {
  return (
    <div className="documentation-container">
      <h1>Programming Language Interpreter Documentation</h1>

      <h2>Overview</h2>
      <p>
        This document describes the functionality of the interpreter for your custom programming
        language. The interpreter processes an Abstract Syntax Tree (AST) and executes code within
        a runtime environment. The language includes support for basic drawing operations,
        conditional statements, loops, functions, and variable assignments.
      </p>

      <h2>Runtime Context</h2>
      <p>
        The interpreter operates within a <code>Context</code> object that maintains execution
        state, including:
      </p>
      <ul>
        <li>
          <strong>globals</strong>: Stores top-level variables.
        </li>
        <li>
          <strong>functions</strong>: Stores AST representations of user-defined functions.
        </li>
        <li>
          <strong>error</strong>: Error handling mechanism.
        </li>
        <li>
          <strong>drawingCommands</strong>: List of graphical commands such as <code>circle(...)</code> and <code>rectangle(...)</code>.
        </li>
        <li>
          <strong>running</strong>: Indicates if execution is in a game loop.
        </li>
        <li>
          <strong>keysDown</strong>: Tracks currently pressed keys.
        </li>
        <li>
          <strong>colorStack</strong>: Stack of active colors for drawing.
        </li>
      </ul>

      <h2>Execution Model</h2>
      <h3><code>interpret(ast: ASTNode[], context: Context)</code></h3>
      <p>
        This function takes an AST and executes it by calling <code>executeNode</code> on each node.
      </p>

      <h3><code>startProgram(context: Context)</code></h3>
      <p>
        If a <code>run()</code> function is defined, this initializes the execution loop:
      </p>
      <ol>
        <li>Clears the drawing command list on each frame.</li>
        <li>Calls the <code>run()</code> function.</li>
        <li>Uses <code>requestAnimationFrame</code> for continuous execution.</li>
        <li>Sets up key event listeners.</li>
        <li>Initializes the color stack.</li>
      </ol>

      <h2>Variable Scope and Management</h2>
      <h3><code>createChildScope(parentScope: Record&lt;string, any&gt;)</code></h3>
      <p>Creates a new scope that inherits from a parent scope.</p>

      <h3><code>getVar(name: string, scope: Record&lt;string, any&gt;, context: Context)</code></h3>
      <p>Retrieves a variable from the scope chain.</p>

      <h3><code>setVar(name: string, value: any, scope: Record&lt;string, any&gt;)</code></h3>
      <p>Sets or updates a variable in the scope chain.</p>

      <h2>AST Node Execution</h2>
      <h3><code>executeNode(node: ASTNode, context: Context, scope: Record&lt;string, any&gt;)</code></h3>
      <p>Handles different types of AST nodes:</p>
      <ul>
        <li><strong>CanvasSize</strong>: Defines canvas dimensions.</li>
        <li><strong>FunctionDeclaration</strong>: Stores user-defined functions.</li>
        <li><strong>Assignment</strong>: Assigns values to variables.</li>
        <li><strong>LoopFor</strong>: Executes a loop for a given number of iterations.</li>
        <li><strong>LoopWhile</strong>: Executes a loop while a condition is true.</li>
        <li><strong>IfStatement</strong>: Executes conditional logic.</li>
        <li><strong>Call</strong>: Executes function calls (built-in or user-defined).</li>
        <li><strong>ReturnStatement</strong>: Handles function return values.</li>
      </ul>

      <h2>Built-in Functions</h2>
      <h3><code>print(...)</code></h3>
      <p>Prints values to the console.</p>

      <h3><code>circle(x, y, r)</code></h3>
      <p>
        Draws a circle at <code>(x, y)</code> with radius <code>r</code> using the top color from <code>colorStack</code>.
      </p>

      <h3><code>rectangle(x, y, w, h)</code></h3>
      <p>
        Draws a rectangle at <code>(x, y)</code> with width <code>w</code> and height <code>h</code> using
        the top color from <code>colorStack</code>.
      </p>

      <h3><code>color(r, g, b)</code></h3>
      <p>Pushes an RGB color onto <code>colorStack</code>.</p>

      <h3><code>popColor()</code></h3>
      <p>Removes the top color from <code>colorStack</code>.</p>

      <h2>Function Execution</h2>
      <h3><code>executeFunction(name: string, rawArgs: string[], context: Context, callerScope: Record&lt;string, any&gt;)</code></h3>
      <p>Runs a user-defined function in a new scope, binding parameters to arguments.</p>

      <h2>Expression Evaluation</h2>
      <h3><code>evalExpr(expr: string, context: Context, scope: Record&lt;string, any&gt;)</code></h3>
      <p>
        Evaluates expressions, supporting:
      </p>
      <ul>
        <li>Mathematical operations (e.g., <code>x + y</code>)</li>
        <li>Boolean expressions (<code>and</code>, <code>or</code>)</li>
        <li>Variable references</li>
        <li>Keyboard checks (<code>keyDown("a")</code>)</li>
        <li>Trigonometric functions (<code>sin(x)</code>, <code>cos(x)</code>)</li>
      </ul>
    </div>
  );
}

export default Documentation;