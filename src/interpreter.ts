// interpreter.ts
import { ASTNode, ErrorHandler } from './types';

/**
 * A simple "runtime context":
 * - globals: the global scope object (for top-level variables)
 * - functions: stored AST for user-defined functions
 * - error: how we report errors
 * - drawingCommands: for storing e.g. circle(...) calls
 * - running: indicates if we're in a game loop
 * - keysDown: a set of currently pressed keys
 */
interface Context {
  globals: Record<string, any>;
  functions: Record<string, ASTNode>;
  error: ErrorHandler;
  drawingCommands: { cmd: string; args: number[] }[];
  running: boolean;
  /** New property to track pressed keys */
  keysDown: Set<string>;
}

/** 
 * Interpret the AST once (top-level). 
 * For each top-level node, call `executeNode(node, context, context.globals)`.
 */
export function interpret(ast: ASTNode[], context: Context) {
  ast.forEach(node => {
    executeNode(node, context, context.globals);
  });
}

/**
 * If there's a `run()` function, repeatedly call it via requestAnimationFrame.
 * Also set up event listeners for capturing key presses.
 */
export function startProgram(context: Context) {
  // Initialize our key set
  context.keysDown = new Set();

  // Listen for keydown/keyup
  window.addEventListener('keydown', (e) => {
    context.keysDown.add(e.key);
  });
  window.addEventListener('keyup', (e) => {
    context.keysDown.delete(e.key);
  });

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

/**
 * Create a child scope that can read from the parent but 
 * stores new variables in its own object.
 */
function createChildScope(parentScope: Record<string, any>): Record<string, any> {
  return Object.create(parentScope);
}

/**
 * Look up a variable in the given scope chain. 
 * If it's not found, throw an error.
 */
function getVar(name: string, scope: Record<string, any>, context: Context) {
  if (name in scope) {
    return scope[name];
  }
  context.error(`Variable "${name}" is not defined in the current scope.`);
  return undefined;
}

/**
 * Set a variable in the given scope chain. 
 * If it already exists up the chain, overwrite it there; 
 * otherwise define it in the current scope object.
 */
function setVar(name: string, value: any, scope: Record<string, any>) {
  let current: any = scope;
  // Walk up the chain to see if 'name' is a known property
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

/**
 * Execute a single AST node with a given scope object.
 */
function executeNode(node: ASTNode, context: Context, scope: Record<string, any>) {
  switch (node.type) {
    case 'CanvasSize': {
      // CanvasSize is global
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
      // e.g. "loop x=10 times:"
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
        consequent.forEach(c => executeNode(c, context, scope));
      } else {
        alternate.forEach(a => executeNode(a, context, scope));
      }
      break;
    }

    case 'Call': {
      // e.g. print(x), circle(100, 200, 30), or user-defined function
      if (node.callee === 'circle') {
        const [x, y, r] = node.args.map(arg => evalExpr(arg, context, scope));
        context.drawingCommands.push({ cmd: 'circle', args: [x, y, r] });
      }
      else if (node.callee === 'print') {
        const vals = node.args.map(arg => evalExpr(arg, context, scope));
        console.log(...vals);
      }
      else {
        // user-defined function
        executeFunction(node.callee, node.args, context, scope);
      }
      break;
    }

    case 'ReturnStatement': {
      // Only relevant inside function calls (handled in `executeFunction`)
      break;
    }

    default:
      // no-op or unknown
      break;
  }
}

/**
 * Execute a user-defined function by name, in a scope that 
 * can see the parent's variables.
 */
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

  // create a child scope so that function parameters are local
  const funcScope = createChildScope(callerScope);

  // assign arguments
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
 * - If numeric, parse it.
 * - If a single variable, read from scope.
 * - Otherwise, fallback to a naive JavaScript eval with known variables,
 *   plus a special `keyDown` function to check pressed keys.
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

  // Fallback to naive JS eval
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

    // We'll add a "keyDown" helper so that the user can call keyDown("a")
    const f = new Function(
      ...varNames,
      'keyDown',
      `return (${expr});`
    );

    return f(
      ...varVals,
      (key: string) => {
        // Return true if this key is held down
        return context.keysDown.has(key);
      }
    );
  } catch (err) {
    context.error(`Failed to evaluate expression: "${expr}"`);
    return undefined;
  }
}