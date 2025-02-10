import React from 'react';

const Documentation: React.FC = () => {
    return (
        <div style={{ fontFamily: 'Arial, sans-serif', margin: '40px' }}>
            <h1>Blocks Programming Language Documentation</h1>
            <p>Welcome to the documentation for the Blocks Programming Language. This language allows you to create graphical programs using a simple, Python-like syntax.</p>
            
            <h2>Getting Started</h2>
            <p>To write a program, define the canvas size and create a function named <code>run()</code>, which will execute in a loop.</p>
            
            <h3>Example Program</h3>
            <pre>
<code>{`# Set canvas size
CanvasSize = (500, 500)

x = 0

function run():
    circle(x, 300, 30)
    x = x + 2
    if x > 500:
        x = 0`}</code>
            </pre>
            
            <h2>Syntax & Features</h2>
            <h3>Variables</h3>
            <p>Variables are assigned using <code>=</code> and can store numbers, lists, or expressions.</p>
            <pre>
<code>{`x = 10
y = x + 5
board = [[0, 0], [0, 1]]`}</code>
            </pre>

            <h3>Functions</h3>
            <p>Define a function using <code>function name(args):</code>. The <code>run()</code> function is required for animation.</p>
            <pre>
<code>{`function greet(name):
    print("Hello, " + name)

greet("Alice")`}</code>
            </pre>
            
            <h3>Loops</h3>
            <p>Use <code>loop x=10 times:</code> for fixed iterations or <code>loop while condition:</code> for condition-based loops.</p>
            <pre>
<code>{`loop x=5 times:
    print(x)

loop while x < 10:
    x = x + 1`}</code>
            </pre>
            
            <h3>Conditionals</h3>
            <p>Use <code>if</code> and <code>else</code> for conditional execution.</p>
            <pre>
<code>{`if x > 5:
    print("x is big")
else:
    print("x is small")`}</code>
            </pre>
            
            <h2>Built-in Functions</h2>
            <h3>Drawing Functions</h3>
            <ul>
                <li><code>circle(x, y, r)</code> - Draws a circle at (x, y) with radius r.</li>
                <li><code>rectangle(x, y, w, h)</code> - Draws a rectangle at (x, y) with width w and height h.</li>
                <li><code>color(r, g, b)</code> - Sets the current drawing color.</li>
                <li><code>popColor()</code> - Restores the previous color.</li>
            </ul>
            
            <h3>Math & Utility Functions</h3>
            <ul>
                <li><code>random()</code> - Returns a random number between 0 and 1.</li>
                <li><code>floor(x)</code> - Returns the largest integer less than or equal to x.</li>
                <li><code>abs(x)</code> - Returns the absolute value of x.</li>
                <li><code>sin(x)</code>, <code>cos(x)</code> - Trigonometric functions.</li>
            </ul>
            
            <h3>Input Functions</h3>
            <ul>
                <li><code>keyDown("key")</code> - Checks if a key is pressed.</li>
            </ul>
            
            <h2>Execution</h2>
            <p>The <code>run()</code> function executes continuously. If no <code>run()</code> function is found, an error is thrown.</p>
            <p>To stop execution, use the stop button in the interface.</p>
            
            <h2>Errors</h2>
            <p>Errors will appear in the output panel. Common issues include:</p>
            <ul>
                <li>Undefined variables</li>
                <li>Syntax errors</li>
                <li>Calling undefined functions</li>
            </ul>
        </div>
    );
};

export default Documentation;