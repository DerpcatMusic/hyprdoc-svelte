/**
 * Formula Engine - Type-safe expression parser and evaluator
 *
 * Supports:
 * - Basic math: +, -, *, /, %, ^ (power)
 * - Parentheses for grouping
 * - Variable references: {{variableName}}
 * - Functions: sum, avg, min, max, round, floor, ceil, abs, if
 * - Percentage operations: value + 20%
 * - Constants: PI, E
 */

// ============================================================================
// TYPES
// ============================================================================

export type TokenType =
  | "NUMBER"
  | "OPERATOR"
  | "LPAREN"
  | "RPAREN"
  | "COMMA"
  | "VARIABLE"
  | "FUNCTION"
  | "PERCENT"
  | "CONSTANT"
  | "COMPARISON"
  | "EOF";

export interface Token {
  type: TokenType;
  value: string | number;
  position: number;
}

export type ASTNodeType =
  | "Number"
  | "Variable"
  | "BinaryOp"
  | "UnaryOp"
  | "FunctionCall"
  | "Percentage"
  | "Conditional";

export interface ASTNode {
  type: ASTNodeType;
  value?: number | string;
  operator?: string;
  left?: ASTNode;
  right?: ASTNode;
  args?: ASTNode[];
  condition?: ASTNode;
  trueBranch?: ASTNode;
  falseBranch?: ASTNode;
}

export interface FormulaContext {
  variables: Record<string, number>;
}

export interface FormulaResult {
  success: boolean;
  value: number;
  error?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CONSTANTS: Record<string, number> = {
  PI: Math.PI,
  E: Math.E,
};

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  sum: (...args) => args.reduce((a, b) => a + b, 0),
  avg: (...args) => (args.length > 0 ? args.reduce((a, b) => a + b, 0) / args.length : 0),
  min: (...args) => Math.min(...args),
  max: (...args) => Math.max(...args),
  round: (n, decimals = 0) => {
    const factor = 10 ** decimals;
    return Math.round(n * factor) / factor;
  },
  floor: (n) => Math.floor(n),
  ceil: (n) => Math.ceil(n),
  abs: (n) => Math.abs(n),
  pow: (base, exp) => base ** exp,
  sqrt: (n) => Math.sqrt(n),
};

// Special function that returns days between two dates
const daysBetween = (date1: string | number, date2: string | number): number => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// ============================================================================
// TOKENIZER
// ============================================================================

export function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  const peek = (offset = 0) => expression[pos + offset];
  const advance = () => expression[pos++];
  const isDigit = (c: string) => /\d/.test(c);
  const isAlpha = (c: string) => /[A-Z_a-z]/.test(c);
  const isAlphaNum = (c: string) => /\w/.test(c);

  while (pos < expression.length) {
    const char = peek();

    // Skip whitespace
    if (/\s/.test(char)) {
      advance();
      continue;
    }

    // Numbers (including decimals)
    if (isDigit(char) || (char === "." && isDigit(peek(1)))) {
      const start = pos;
      let numStr = "";
      while (pos < expression.length && (isDigit(peek()) || peek() === ".")) {
        numStr += advance();
      }
      tokens.push({
        type: "NUMBER",
        value: Number.parseFloat(numStr),
        position: start,
      });
      continue;
    }

    // Variable references: {{variableName}}
    if (char === "{" && peek(1) === "{") {
      const start = pos;
      advance();
      advance(); // skip {{
      let varName = "";
      while (pos < expression.length && !(peek() === "}" && peek(1) === "}")) {
        varName += advance();
      }
      if (peek() === "}" && peek(1) === "}") {
        advance();
        advance(); // skip }}
      }
      tokens.push({ type: "VARIABLE", value: varName.trim(), position: start });
      continue;
    }

    // Functions and constants
    if (isAlpha(char)) {
      const start = pos;
      let name = "";
      while (pos < expression.length && isAlphaNum(peek())) {
        name += advance();
      }
      const upperName = name.toUpperCase();
      if (CONSTANTS[upperName] !== undefined) {
        tokens.push({ type: "CONSTANT", value: upperName, position: start });
      } else if (name.toLowerCase() === "if") {
        tokens.push({ type: "FUNCTION", value: "if", position: start });
      } else if (name.toLowerCase() === "daysbetween") {
        tokens.push({
          type: "FUNCTION",
          value: "daysBetween",
          position: start,
        });
      } else if (FUNCTIONS[name.toLowerCase()]) {
        tokens.push({
          type: "FUNCTION",
          value: name.toLowerCase(),
          position: start,
        });
      } else {
        // Treat unknown identifiers as variables (without braces)
        tokens.push({ type: "VARIABLE", value: name, position: start });
      }
      continue;
    }

    // Operators and symbols
    const start = pos;
    switch (char) {
      case "+":
      case "-":
      case "*":
      case "/":
      case "^": {
        tokens.push({ type: "OPERATOR", value: advance(), position: start });
        break;
      }
      case "%": {
        tokens.push({ type: "PERCENT", value: advance(), position: start });
        break;
      }
      case "(": {
        tokens.push({ type: "LPAREN", value: advance(), position: start });
        break;
      }
      case ")": {
        tokens.push({ type: "RPAREN", value: advance(), position: start });
        break;
      }
      case ",": {
        tokens.push({ type: "COMMA", value: advance(), position: start });
        break;
      }
      case ">": {
        advance();
        if (peek() === "=") {
          advance();
          tokens.push({ type: "COMPARISON", value: ">=", position: start });
        } else {
          tokens.push({ type: "COMPARISON", value: ">", position: start });
        }
        break;
      }
      case "<": {
        advance();
        if (peek() === "=") {
          advance();
          tokens.push({ type: "COMPARISON", value: "<=", position: start });
        } else {
          tokens.push({ type: "COMPARISON", value: "<", position: start });
        }
        break;
      }
      case "=": {
        advance();
        if (peek() === "=") {
          advance();
        }
        tokens.push({ type: "COMPARISON", value: "==", position: start });
        break;
      }
      case "!": {
        advance();
        if (peek() === "=") {
          advance();
          tokens.push({ type: "COMPARISON", value: "!=", position: start });
        }
        break;
      }
      default: {
        // Skip unknown characters
        advance();
      }
    }
  }

  tokens.push({ type: "EOF", value: "", position: pos });
  return tokens;
}

// ============================================================================
// PARSER
// ============================================================================

class Parser {
  private readonly tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private current(): Token {
    return this.tokens[this.pos] || { type: "EOF", value: "", position: 0 };
  }

  private advance(): Token {
    return this.tokens[this.pos++];
  }

  private expect(type: TokenType): Token {
    const token = this.current();
    if (token.type !== type) {
      throw new Error(`Expected ${type} but got ${token.type} at position ${token.position}`);
    }
    return this.advance();
  }

  parse(): ASTNode {
    const result = this.parseExpression();
    if (this.current().type !== "EOF") {
      throw new Error(`Unexpected token: ${this.current().value}`);
    }
    return result;
  }

  private parseExpression(): ASTNode {
    return this.parseComparison();
  }

  private parseComparison(): ASTNode {
    let left = this.parseAddSub();

    while (this.current().type === "COMPARISON") {
      const op = this.advance().value as string;
      const right = this.parseAddSub();
      left = { type: "BinaryOp", operator: op, left, right };
    }

    return left;
  }

  private parseAddSub(): ASTNode {
    let left = this.parseMulDiv();

    while (
      this.current().type === "OPERATOR" &&
      (this.current().value === "+" || this.current().value === "-")
    ) {
      const op = this.advance().value as string;
      const right = this.parseMulDiv();

      // Check for percentage after operator
      if (this.current().type === "PERCENT") {
        this.advance(); // consume %
        // "left + right%" means "left + (left * right / 100)"
        left = {
          type: "BinaryOp",
          operator: op,
          left,
          right: {
            type: "BinaryOp",
            operator: "*",
            left,
            right: {
              type: "BinaryOp",
              operator: "/",
              left: right,
              right: { type: "Number", value: 100 },
            },
          },
        };
      } else {
        left = { type: "BinaryOp", operator: op, left, right };
      }
    }

    return left;
  }

  private parseMulDiv(): ASTNode {
    let left = this.parsePower();

    while (
      this.current().type === "OPERATOR" &&
      (this.current().value === "*" || this.current().value === "/")
    ) {
      const op = this.advance().value as string;
      const right = this.parsePower();
      left = { type: "BinaryOp", operator: op, left, right };
    }

    // Handle modulo with %
    if (
      this.current().type === "PERCENT" &&
      this.tokens[this.pos + 1]?.type !== "EOF" &&
      this.tokens[this.pos + 1]?.type !== "RPAREN" &&
      this.tokens[this.pos + 1]?.type !== "COMMA"
    ) {
      // This is modulo, not percentage
      this.advance();
      const right = this.parsePower();
      left = { type: "BinaryOp", operator: "%", left, right };
    }

    return left;
  }

  private parsePower(): ASTNode {
    let left = this.parseUnary();

    while (this.current().type === "OPERATOR" && this.current().value === "^") {
      this.advance();
      const right = this.parseUnary();
      left = { type: "BinaryOp", operator: "^", left, right };
    }

    return left;
  }

  private parseUnary(): ASTNode {
    if (this.current().type === "OPERATOR" && this.current().value === "-") {
      this.advance();
      const operand = this.parseUnary();
      return { type: "UnaryOp", operator: "-", right: operand };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ASTNode {
    const token = this.current();

    if (token.type === "NUMBER") {
      this.advance();
      let node: ASTNode = { type: "Number", value: token.value as number };
      // Check for trailing percentage
      if (this.current().type === "PERCENT") {
        this.advance();
        node = { type: "Percentage", value: token.value as number };
      }
      return node;
    }

    if (token.type === "VARIABLE") {
      this.advance();
      return { type: "Variable", value: token.value as string };
    }

    if (token.type === "CONSTANT") {
      this.advance();
      return { type: "Number", value: CONSTANTS[token.value as string] };
    }

    if (token.type === "FUNCTION") {
      const funcName = token.value as string;
      this.advance();
      this.expect("LPAREN");

      const args: ASTNode[] = [];
      if (this.current().type !== "RPAREN") {
        args.push(this.parseExpression());
        while (this.current().type === "COMMA") {
          this.advance();
          args.push(this.parseExpression());
        }
      }
      this.expect("RPAREN");

      // Special handling for if()
      if (funcName === "if" && args.length === 3) {
        return {
          type: "Conditional",
          condition: args[0],
          trueBranch: args[1],
          falseBranch: args[2],
        };
      }

      return { type: "FunctionCall", value: funcName, args };
    }

    if (token.type === "LPAREN") {
      this.advance();
      const expr = this.parseExpression();
      this.expect("RPAREN");
      return expr;
    }

    throw new Error(
      `Unexpected token: ${token.type} (${token.value}) at position ${token.position}`
    );
  }
}

export function parse(expression: string): ASTNode {
  const tokens = tokenize(expression);
  const parser = new Parser(tokens);
  return parser.parse();
}

// ============================================================================
// EVALUATOR
// ============================================================================

export function evaluate(ast: ASTNode, context: FormulaContext): number {
  switch (ast.type) {
    case "Number": {
      return ast.value as number;
    }

    case "Percentage": {
      // Standalone percentage - divide by 100
      return (ast.value as number) / 100;
    }

    case "Variable": {
      const varName = ast.value as string;
      const value = context.variables[varName];
      if (value === undefined) {
        throw new Error(`Unknown variable: ${varName}`);
      }
      return value;
    }

    case "UnaryOp": {
      if (ast.operator === "-") {
        return -evaluate(ast.right!, context);
      }
      throw new Error(`Unknown unary operator: ${ast.operator}`);
    }

    case "BinaryOp": {
      const left = evaluate(ast.left!, context);
      const right = evaluate(ast.right!, context);
      switch (ast.operator) {
        case "+": {
          return left + right;
        }
        case "-": {
          return left - right;
        }
        case "*": {
          return left * right;
        }
        case "/": {
          return right === 0 ? 0 : left / right;
        }
        case "%": {
          return left % right;
        }
        case "^": {
          return left ** right;
        }
        case ">": {
          return left > right ? 1 : 0;
        }
        case "<": {
          return left < right ? 1 : 0;
        }
        case ">=": {
          return left >= right ? 1 : 0;
        }
        case "<=": {
          return left <= right ? 1 : 0;
        }
        case "==": {
          return left === right ? 1 : 0;
        }
        case "!=": {
          return left === right ? 0 : 1;
        }
        default: {
          throw new Error(`Unknown operator: ${ast.operator}`);
        }
      }
    }

    case "FunctionCall": {
      const funcName = ast.value as string;
      const args = (ast.args || []).map((arg) => evaluate(arg, context));

      if (funcName === "daysBetween") {
        // Special case: daysBetween expects date strings/timestamps
        // For now, treat args as numeric timestamps
        return daysBetween(args[0], args[1]);
      }

      const func = FUNCTIONS[funcName];
      if (!func) {
        throw new Error(`Unknown function: ${funcName}`);
      }
      return func(...args);
    }

    case "Conditional": {
      const condition = evaluate(ast.condition!, context);
      return condition === 0
        ? evaluate(ast.falseBranch!, context)
        : evaluate(ast.trueBranch!, context);
    }

    default: {
      throw new Error(`Unknown AST node type: ${ast.type}`);
    }
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Evaluate a formula expression with the given variable context
 */
export function evaluateFormula(
  expression: string,
  variables: Record<string, number>
): FormulaResult {
  try {
    if (!expression || expression.trim() === "") {
      return { success: true, value: 0 };
    }

    const ast = parse(expression);
    const value = evaluate(ast, { variables });

    // Handle NaN and Infinity
    if (!Number.isFinite(value)) {
      return {
        success: false,
        value: 0,
        error: "Result is not a finite number",
      };
    }

    return { success: true, value };
  } catch (error) {
    return {
      success: false,
      value: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Validate formula syntax without evaluating
 */
export function validateFormula(expression: string): {
  valid: boolean;
  error?: string;
} {
  try {
    if (!expression || expression.trim() === "") {
      return { valid: true };
    }
    parse(expression);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Invalid formula syntax",
    };
  }
}

/**
 * Extract all variable references from a formula
 */
export function extractVariables(expression: string): string[] {
  const matches = expression.match(/{{([^}]+)}}/g) || [];
  return matches.map((m) => m.slice(2, -2).trim());
}

/**
 * Get list of available functions
 */
export function getAvailableFunctions(): string[] {
  return [...Object.keys(FUNCTIONS), "if", "daysBetween"];
}

/**
 * Get list of available constants
 */
export function getAvailableConstants(): string[] {
  return Object.keys(CONSTANTS);
}
