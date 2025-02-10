// parser.ts
import { Token, ASTNode } from './types';

const isBlankOrComment = (line: string) => {
  const trimmed = line.trim();
  return trimmed === '' || trimmed.startsWith('#');
};

export function lex(input: string): Token[] {
  const rawLines = input.split('\n');

  const tokens: Token[] = [];
  let buffer = '';           // to accumulate lines if we're in a multiline array
  let bracketDepth = 0;      // track how many '[' minus ']' we've seen
  let currentIndent = 0;     // store indent for the combined line

  function flushBuffer() {
    if (buffer.trim() !== '') {
      tokens.push({
        type: 'LINE',
        value: buffer.trim(),
        indent: currentIndent,
      });
    }
    buffer = '';
    bracketDepth = 0;
    currentIndent = 0;
  }

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (isBlankOrComment(line)) {
      // If we are currently accumulating a multiline array, we still might need the line
      // but if bracketDepth===0, we can ignore it
      if (bracketDepth === 0) {
        continue;
      }
    }

    // Count leading spaces
    const matchIndent = line.match(/^(\s+)/);
    const leadingSpaces = matchIndent ? matchIndent[1].length : 0;

    // Trim for content
    const trimmed = line.trim();
    if (trimmed === '' && bracketDepth === 0) {
      // skip blank line if not inside an array
      continue;
    }

    // Update bracket depth:
    // naive approach: count '[' minus ']' in the line
    let localBracketChange = 0;
    for (let c = 0; c < trimmed.length; c++) {
      if (trimmed[c] === '[') localBracketChange++;
      if (trimmed[c] === ']') localBracketChange--;
    }

    if (bracketDepth === 0) {
      // If we are not currently in a multiline array, start fresh
      buffer = trimmed;
      currentIndent = leadingSpaces;
      bracketDepth = localBracketChange;
    } else {
      // We are continuing a multiline array
      // append this line (with a space in between, or some delimiter)
      buffer += ' ' + trimmed;
      bracketDepth += localBracketChange;
    }

    if (bracketDepth <= 0) {
      // We reached bracketDepth 0 => flush
      flushBuffer();
    }
  }

  // if anything left in buffer
  if (bracketDepth !== 0) {
    // flush anyway
    flushBuffer();
  }

  return tokens;
}

export function parse(tokens: Token[]): ASTNode[] {
  let position = 0;

  function parseBlock(parentIndent: number): ASTNode[] {
    const block: ASTNode[] = [];

    while (position < tokens.length) {
      const token = tokens[position];
      if (token.indent <= parentIndent) {
        break;
      }
      block.push(parseStatement());
    }
    return block;
  }

  function parseStatement(): ASTNode {
    const token = tokens[position++];
    const line = token.value;

    // CanvasSize = (800, 600)
    if (line.startsWith('CanvasSize')) {
      const match = line.match(/^CanvasSize\s*=\s*\((\d+)\s*,\s*(\d+)\)/);
      if (match) {
        return {
          type: 'CanvasSize',
          width: Number(match[1]),
          height: Number(match[2]),
        };
      }
    }

    // function name(args):
    if (line.startsWith('function')) {
      const match = line.match(/^function\s+([A-Za-z_][A-Za-z0-9_]*)\((.*?)\)\s*:/);
      if (match) {
        const name = match[1];
        const args = match[2].split(',').map(arg => arg.trim()).filter(Boolean);

        const body = parseBlock(token.indent);
        return {
          type: 'FunctionDeclaration',
          name,
          args,
          body,
        };
      }
    }

    // loop x=10 times:
    // or loop while x<10:
    if (line.startsWith('loop')) {
      if (line.includes('times:')) {
        // e.g. "loop x=10 times:" OR "loop x=rowCount times:"
        const match = line.match(/^loop\s+([A-Za-z_][A-Za-z0-9_]*)=(.+)\s+times:$/);
        if (match) {
          const varName = match[1];
          const countExpr = match[2].trim();
          const body = parseBlock(token.indent);
          return {
            type: 'LoopFor',
            varName,
            countExpr,
            body,
          };
        }
      } else if (line.includes('while')) {
        // e.g. "loop while x<10:"
        const match = line.match(/^loop\s+while\s+(.*):/);
        if (match) {
          const condition = match[1].trim();
          const body = parseBlock(token.indent);
          return {
            type: 'LoopWhile',
            condition,
            body,
          };
        }
      }
    }

    // if x<10:
    // else:
    if (line.startsWith('if ')) {
      const match = line.match(/^if\s+(.*):$/);
      if (match) {
        const condition = match[1].trim();
        const consequent = parseBlock(token.indent);

        // immediate 'else:' at same indent?
        let alternate: ASTNode[] = [];
        if (
          position < tokens.length &&
          tokens[position].value.startsWith('else:') &&
          tokens[position].indent === token.indent
        ) {
          position++;
          alternate = parseBlock(token.indent);
        }

        return {
          type: 'IfStatement',
          condition,
          consequent,
          alternate,
        };
      }
    }

    if (line.startsWith('else:')) {
      return { type: 'Noop' }; // consumed by if
    }

    if (line.startsWith('return ')) {
      const expr = line.replace('return ', '').trim();
      return {
        type: 'ReturnStatement',
        expression: expr,
      };
    }

    // assignment
    // e.g. x = 10  or board[0][1] = 3  or board = [[0,0],[0,0]] ...
    const assignmentMatch = line.match(/^(.+)\s*=\s*(.*)$/);
    if (assignmentMatch) {
      return {
        type: 'Assignment',
        varName: assignmentMatch[1].trim(),
        value: assignmentMatch[2].trim(),
      };
    }

    // function call
    // e.g. print("Hello"), circle(x, 300, 30), color(255,0,0)
    const callMatch = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\((.*)\)$/);
    if (callMatch) {
      const callee = callMatch[1];
      const args = callMatch[2]
        .split(',')
        .map(a => a.trim())
        .filter(Boolean);
      return {
        type: 'Call',
        callee,
        args,
      };
    }

    // fallback
    return { type: 'Unknown', line };
  }

  const ast = parseBlock(-1);
  return ast;
}