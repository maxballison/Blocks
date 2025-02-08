// interpreter.ts
import { ASTNode, ErrorHandler } from './types';

/**
 * A simple "runtime context":
 * - globals: the global scope object (for top-level variables)
 * - functions: stored AST for user-defined functions
 * - error: how we report errors
 * - drawingCommands: for storing e.g. circle(...) or rectangle(...) calls
 * - running: indicates if we're in a game loop
 * - keysDown: a set of currently pressed keys
 * - colorStack: an array of CSS color strings
 */
interface Context {
  globals: Record<string, any>;
  functions: Record<string, ASTNode>;
  error: ErrorHandler;
  drawingCommands: {
    cmd: string;
    args: number[];
    color?: string;  // color to use when drawing
  }[];
  running: boolean;
  keysDown: Set<string>;
  colorStack: string[];
}

/** Interpret the AST (top-level). */
export function interpret(ast: ASTNode[], context: Context) {
  ast.forEach(node => {
    executeNode(node, context, context.globals);
  });
}

/**
 * If there's a `run()` function, repeatedly call it via requestAnimationFrame.
 * Also set up event listeners for capturing key presses,
 * and initialize the color stack.
 */
export function startProgram(context: Context) {
  // Initialize pressed-keys set
  context.keysDown = new Set();

  // Listen for keydown/keyup
  window.addEventListener('keydown', (e) => {
    context.keysDown.add(e.key);
  });
  window.addEventListener('keyup', (e) => {
    context.keysDown.delete(e.key);
  });

  // Initialize color stack with a default color (black)
  context.colorStack = ['rgb(0,0,0)'];

  if (context.functions['run']) {
    context.running = true;
    const loop = () => {
      if (!context.running) return;
      // Clear drawing commands each frame
      context.drawingCommands.length = 0;
      // Call run()
      executeFunction('run', [], context, context.globals);
      requestAnimationFrame(loop);
    };
    loop();
  } else {
    context.error('No run() function found. Nothing to execute continuously.');
  }
}

/** Create a child scope that can read from the parent but store new variables locally. */
function createChildScope(parentScope: Record<string, any>): Record<string, any> {
  return Object.create(parentScope);
}

/** Look up a variable in the scope chain. */
function getVar(name: string, scope: Record<string, any>, context: Context) {
  if (name in scope) {
    return scope[name];
  }
  context.error(`Variable "${name}" is not defined in the current scope.`);
  return undefined;
}

/** Set a variable in the scope chain. */
function setVar(name: string, value: any, scope: Record<string, any>) {
  let current: any = scope;
  while (current && current !== Object.prototype) {
    if (Object.prototype.hasOwnProperty.call(current, name)) {
      current[name] = value;
      return;
    }
    current = Object.getPrototypeOf(current);
  }
  // Not found, define in the current scope
  scope[name] = value;
}

/** Execute a single AST node with a given scope object. */
function executeNode(node: ASTNode, context: Context, scope: Record<string, any>) {
  switch (node.type) {
    case 'CanvasSize': {
      // e.g. CanvasSize = (800, 600)
      setVar('CanvasSize', [node.width, node.height], context.globals);
      break;
    }

    case 'FunctionDeclaration': {
      // Store the function AST in a global map
      context.functions[node.name] = node;
      break;
    }

    case 'Assignment': {
      // e.g. x = 5
      const value = evalExpr(node.value, context, scope);
      setVar(node.varName, value, scope);
      break;
    }

    case 'LoopFor': {
      // e.g. loop i=10 times:
      const { varName, count, body } = node;
      const loopScope = createChildScope(scope);

      for (let i = 0; i < count; i++) {
        if (varName) {
          setVar(varName, i, loopScope);
        }
        for (const stmt of body) {
          executeNode(stmt, context, loopScope);
        }
      }
      break;
    }

    case 'LoopWhile': {
      // e.g. loop while x<10:
      const { condition, body } = node;
      const whileScope = createChildScope(scope);

      while (evalExpr(condition, context, whileScope)) {
        for (const stmt of body) {
          executeNode(stmt, context, whileScope);
        }
      }
      break;
    }

    case 'IfStatement': {
      // e.g. if x>10: ...
      const { condition, consequent, alternate } = node;
      if (evalExpr(condition, context, scope)) {
        consequent.forEach(stmt => executeNode(stmt, context, scope));
      } else {
        alternate.forEach(stmt => executeNode(stmt, context, scope));
      }
      break;
    }

    case 'Call': {
      // e.g. print(x), circle(100, 200, 50), rectangle(...), color(...), etc.
      const callee = node.callee;
      const argVals = node.args.map(arg => evalExpr(arg, context, scope));

      if (callee === 'print') {
        // print(...)
        console.log(...argVals);

      } else if (callee === 'circle') {
        // circle(x, y, r)
        const [x, y, r] = argVals;
        const topColor = context.colorStack[context.colorStack.length - 1] ?? 'rgb(0,0,0)';
        context.drawingCommands.push({
          cmd: 'circle',
          args: [x, y, r],
          color: topColor
        });

      } else if (callee === 'rectangle') {
        // rectangle(x, y, w, h)
        const [x, y, w, h] = argVals;
        const topColor = context.colorStack[context.colorStack.length - 1] ?? 'rgb(0,0,0)';
        context.drawingCommands.push({
          cmd: 'rectangle',
          args: [x, y, w, h],
          color: topColor
        });

      } else if (callee === 'color') {
        // color(r, g, b) => push a new color onto the stack
        const [r, g, b] = argVals;
        const colorString = `rgb(${r}, ${g}, ${b})`;
        context.colorStack.push(colorString);
        while (context.colorStack.length > 5) {
            context.colorStack.shift(); // remove the BOTTOM (oldest) color
          }

      } else if (callee === 'popColor') {
        // pop the top color
        context.colorStack.pop();
        if (context.colorStack.length === 0) {
          context.colorStack.push('rgb(0,0,0)');
        }

      } else {
        // user-defined function call
        executeFunction(callee, node.args, context, scope);
      }
      break;
    }

    case 'ReturnStatement': {
      // only relevant inside function calls
      break;
    }

    default:
      // no-op or unknown
      break;
  }
}

/** Execute a user-defined function by name in a new child scope. */
function executeFunction(
  name: string,
  rawArgs: string[],
  context: Context,
  callerScope: Record<string, any>
): any {
  const funcNode = context.functions[name];
  if (!funcNode) {
    context.error(`Function "${name}" not defined.`);
    return undefined;
  }

  // Create a child scope so that parameters are local
  const funcScope = createChildScope(callerScope);

  // Assign arguments
  for (let i = 0; i < funcNode.args.length; i++) {
    const paramName = funcNode.args[i];
    const argValue = evalExpr(rawArgs[i], context, callerScope);
    setVar(paramName, argValue, funcScope);
  }

  let returnValue: any = undefined;
  for (const stmt of funcNode.body) {
    if (stmt.type === 'ReturnStatement') {
      returnValue = evalExpr(stmt.expression, context, funcScope);
      break;
    } else {
      executeNode(stmt, context, funcScope);
    }
  }
  return returnValue;
}

/**
 * Evaluate a string expression.
 * - Replaces 'and' -> '&&' and 'or' -> '||' so you can use them in your language.
 * - Also includes 'keyDown' from previous examples for keyboard checks.
 */
function evalExpr(expr: string, context: Context, scope: Record<string, any>): any {
  if (!expr) return undefined;

  // numeric?
  if (!isNaN(Number(expr))) {
    return Number(expr);
  }

  // single variable?
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(expr)) {
    return getVar(expr, scope, context);
  }

  // Replace 'and' / 'or' with JavaScript operators
  // (naive approach — might catch "band" or "morph" etc., but good enough for demos)
  let transformed = expr
    .replace(/\band\b/g, '&&')
    .replace(/\bor\b/g, '||');

  try {
    // Gather all variables from the scope chain
    const varNames: string[] = [];
    const varVals: any[] = [];

    let cur = scope;
    while (cur && cur !== Object.prototype) {
      for (const key of Object.keys(cur)) {
        if (!varNames.includes(key)) {
          varNames.push(key);
          varVals.push(cur[key]);
        }
      }
      cur = Object.getPrototypeOf(cur);
    }

    // We'll add "keyDown" so you can do `if keyDown("a") and x>10:`
    const f = new Function(
      ...varNames,
      'keyDown',
      'sin',
      'cos',
      `return (${transformed});`
    );

    return f(
      ...varVals,
      (key: string) => context.keysDown.has(key),
      (val: number) => Math.sin(val),            // sin
      (val: number) => Math.cos(val)             // cos
    );
  } catch (err) {
    context.error(`Failed to evaluate expression: "${expr}"`);
    return undefined;
  }
}