// types.ts

export interface Token {
    type: string;
    value: string;
    indent: number; // keep track of how many indents (for block scope)
  }
  
  export interface ASTNode {
    type: string; // "Assignment", "LoopFor", "LoopWhile", "If", "Function", "Call", ...
    [key: string]: any;
  }
  
  export interface ErrorHandler {
    (message: string): void;
  }