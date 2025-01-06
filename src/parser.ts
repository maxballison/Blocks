// parser.ts
import { Token, ASTNode } from './types';

const isBlankOrComment = (line: string) => {
  const trimmed = line.trim();
  return trimmed === '' || trimmed.startsWith('#');
};

export function lex(input: string): Token[] {
  const lines = input.split('\n');
  const tokens: Token[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isBlankOrComment(line)) continue;

    // Match leading spaces
    const match = line.match(/^(\s+)/);
    const leadingSpaces = match ? match[1].length : 0;

    tokens.push({
      type: 'LINE',
      value: line.trim(),
      indent: leadingSpaces, // store the actual count
    });
  }

  return tokens;
}

export function parse(tokens: Token[]): ASTNode[] {
  let position = 0;

  function parseBlock(parentIndent: number): ASTNode[] {
    const block: ASTNode[] = [];

    // We keep reading while next token's indent is strictly greater
    // than the parent's indent.
    while (position < tokens.length) {
      const token = tokens[position];
      if (token.indent <= parentIndent) {
        // we've gone "out" of this block
        break;
      }
      // belongs to this block, so parse it
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
      // e.g. "function add(x, y):"
      const match = line.match(/^function\s+([A-Za-z_][A-Za-z0-9_]*)\((.*?)\)\s*:/);
      if (match) {
        const name = match[1];
        const args = match[2].split(',').map(arg => arg.trim()).filter(Boolean);

        // parse block with token.indent as the "parent indent"
        // so we capture all lines with indent > token.indent
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
        // e.g. "loop x=10 times:"
        const match = line.match(/^loop\s+([A-Za-z_][A-Za-z0-9_]*)=(\d+)\s+times:/);
        if (match) {
          const varName = match[1];
          const count = Number(match[2]);
          const body = parseBlock(token.indent);
          return {
            type: 'LoopFor',
            varName,
            count,
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

        // Check for an immediate 'else:' at same indent
        let alternate: ASTNode[] = [];
        if (
          position < tokens.length &&
          tokens[position].value.startsWith('else:') &&
          tokens[position].indent === token.indent
        ) {
          // consume 'else'
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

    // else:
    if (line.startsWith('else:')) {
      // This should have been consumed by the preceding if-statement parse
      return { type: 'Noop' };
    }

    // return statement
    if (line.startsWith('return ')) {
      const expr = line.replace('return ', '').trim();
      return {
        type: 'ReturnStatement',
        expression: expr,
      };
    }

    // x = 10 (assignment)
    const assignmentMatch = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (assignmentMatch) {
      return {
        type: 'Assignment',
        varName: assignmentMatch[1],
        value: assignmentMatch[2],
      };
    }

    // function call: print("Hello"), circle(x, 300, 30), etc.
    const callMatch = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\((.*)\)$/);
    if (callMatch) {
      const callee = callMatch[1];
      // split on comma for arguments
      const args = callMatch[2].split(',').map(a => a.trim()).filter(Boolean);
      return {
        type: 'Call',
        callee,
        args,
      };
    }

    // fallback
    return { type: 'Unknown', line };
  }

  // parse the top-level block, i.e. lines with indent >= 0
  // Actually, we want lines with indent == 0, so let's do parseBlock(-1)
  // so we accept lines with indent > -1 => i.e. >= 0
  const ast = parseBlock(-1);
  return ast;
}