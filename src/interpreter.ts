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
  // Not found, define it in the current scope
  scope[name] = value;
}

/**
 * Helper to assign a value to a left-hand side expression that might contain bracket indexing,
 * e.g. "board[2]" or "board[2][3]".
 */
function setValueToExpression(lhs: string, newVal: any, context: Context, scope: Record<string, any>) {
  if (!lhs.includes('[')) {
    // no bracket indexing, just a variable
    setVar(lhs, newVal, scope);
    return;
  }

  // e.g. "board[2][3]" => split by '[' => ["board", "2]", "3]"]
  const parts = lhs.split('[');
  const baseName = parts.shift()!.trim(); // e.g. "board"
  let obj = getVar(baseName, scope, context);
  if (obj === undefined) return;

  while (parts.length > 0) {
    // "2]" => bracketContent = "2"
    const bracketContent = parts.shift()!.replace(']', '').trim();
    // Evaluate bracket content, in case it's an expression
    const index = evalExpr(bracketContent, context, scope);

    if (parts.length === 0) {
      // last one, assign
      obj[index] = newVal;
    } else {
      // go deeper
      obj = obj[index];
      if (obj === undefined) {
        context.error(`Cannot set property [${index}] on undefined object.`);
        return;
      }
    }
  }
}

/** Execute a single AST node with a given scope object. */
function executeNode(node: ASTNode, context: Context, scope: Record<string, any>) {
  switch (node.type) {
    case 'CanvasSize': {
      setVar('CanvasSize', [node.width, node.height], context.globals);
      break;
    }

    case 'FunctionDeclaration': {
      // Store the function AST in a global map
      context.functions[node.name] = node;
      break;
    }

    case 'Assignment': {
      // x = 5, or board[2][3] = 10, or board = [[0,0],[0,0]]
      const lhs = node.varName;
      const value = evalExpr(node.value, context, scope);
      setValueToExpression(lhs, value, context, scope);
      break;
    }

    case 'LoopFor': {
      // loop r=EXPR times:
      const { varName, countExpr, body } = node;
      const loopScope = createChildScope(scope);

      const countVal = evalExpr(countExpr, context, loopScope);
      const max = Number(countVal) || 0;  // ensure numeric
      for (let i = 0; i < max; i++) {
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
      const { condition, consequent, alternate } = node;
      if (evalExpr(condition, context, scope)) {
        consequent.forEach(stmt => executeNode(stmt, context, scope));
      } else {
        alternate.forEach(stmt => executeNode(stmt, context, scope));
      }
      break;
    }

    case 'Call': {
      // e.g. print(x), circle(100,200,50), color(255,0,0), or user-defined function
      const callee = node.callee;
      const argVals = node.args.map(arg => evalExpr(arg, context, scope));

      if (callee === 'print') {
        console.log(...argVals);

      } else if (callee === 'circle') {
        const [cx, cy, r] = argVals;
        const col = context.colorStack[context.colorStack.length - 1] ?? 'rgb(0,0,0)';
        context.drawingCommands.push({ cmd: 'circle', args: [cx, cy, r], color: col });

      } else if (callee === 'rectangle') {
        const [x, y, w, h] = argVals;
        const col = context.colorStack[context.colorStack.length - 1] ?? 'rgb(0,0,0)';
        context.drawingCommands.push({ cmd: 'rectangle', args: [x, y, w, h], color: col });

      } else if (callee === 'color') {
        const [r, g, b] = argVals;
        const colorString = `rgb(${r}, ${g}, ${b})`;
        context.colorStack.push(colorString);
        // limit stack to 5
        while (context.colorStack.length > 5) {
          context.colorStack.shift();
        }

      } else if (callee === 'popColor') {
        context.colorStack.pop();
        if (context.colorStack.length === 0) {
          context.colorStack.push('rgb(0,0,0)');
        }

      } else {
        // user-defined function
        executeFunction(callee, node.args, context, scope);
      }
      break;
    }

    case 'ReturnStatement': {
      // only relevant in function calls
      break;
    }

    default:
      // unknown or Noop
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

  const funcScope = createChildScope(callerScope);

  // assign parameters
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
    }
    executeNode(stmt, context, funcScope);
  }
  return returnValue;
}

/**
 * Evaluate a string expression.
 * - Replaces `and` -> `&&` and `or` -> `||` so you can use them in your language.
 * - Exposes built-in and user-defined functions inside expressions.
 */
function evalExpr(expr: string, context: Context, scope: Record<string, any>): any {
  if (!expr) return undefined;

  // numeric?
  if (!isNaN(Number(expr))) {
    return Number(expr);
  }

  // single variable? (only if no bracket or parenthesis)
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(expr)) {
    return getVar(expr, scope, context);
  }

  // Replace 'and' / 'or' with JS operators
  let transformed = expr
    .replace(/\band\b/g, '&&')
    .replace(/\bor\b/g, '||');

  // We'll feed it into a Function for evaluation
  try {
    // gather all variables from the scope chain
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

    // Also gather all user-defined function names so we can expose them in the expression
    // We'll create a small JS wrapper for each user-defined function name
    const userFuncNames = Object.keys(context.functions);
    const userFuncWrappers = userFuncNames.map(fname => {
      // We create a function that calls "executeFunction(fname, args, context, scope)"
      return function(...jsArgs: any[]) {
        // We'll need to do a little trick: convert jsArgs into string expressions
        // Actually, we can store them in a hidden array variable in the scope
        // but let's do something simpler: we can pass them as "raw" and rely on the
        // internal system. We'll just treat them as if they're numeric or string.
        // For more advanced usage, you might need a more robust approach.
        const strArgs = jsArgs.map(x => JSON.stringify(x));
        return executeFunction(fname, strArgs, context, scope);
      };
    });

    // We'll add random, floor, abs, etc. too
    const builtins = {
      keyDown: (key: string) => context.keysDown.has(key),
      sin: (val: number) => Math.sin(val),
      cos: (val: number) => Math.cos(val),
      random: () => Math.random(),
      floor: (val: number) => Math.floor(val),
      abs: (val: number) => Math.abs(val),
    };

    // Build the new Function argument list
    // e.g. new Function(varNames..., userFuncNames..., 'keyDown', 'sin', 'cos', 'random', 'floor', 'abs', `return (${transformed});`)
    const f = new Function(
      ...varNames,
      ...userFuncNames,
      'keyDown',
      'sin',
      'cos',
      'random',
      'floor',
      'abs',
      `return (${transformed});`
    );

    // call the newly constructed function
    return f(
      ...varVals,
      ...userFuncWrappers,
      builtins.keyDown,
      builtins.sin,
      builtins.cos,
      builtins.random,
      builtins.floor,
      builtins.abs
    );

  } catch (err) {
        context.error(`Failed to evaluate expression: "${expr}"\nCause: ${err.message}\nStack: ${err.stack}`);
        return undefined;
  }
}