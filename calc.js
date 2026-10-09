// 📂 calc.js — Calculatrice sûre : +  -  *  /  %  ^  ( )  — pas d'eval(), pas d'injection possible.

function tokenize(expr) {
  return expr.match(/\d+\.?\d*|[+\-*/%^()]/g) || [];
}

function toRPN(tokens) {
  const prec = { "+": 1, "-": 1, "*": 2, "/": 2, "%": 2, "^": 3 };
  const output = [], ops = [];
  for (const t of tokens) {
    if (!isNaN(t)) { output.push(parseFloat(t)); continue; }
    if (t === "(") { ops.push(t); continue; }
    if (t === ")") {
      while (ops.length && ops[ops.length - 1] !== "(") output.push(ops.pop());
      ops.pop();
      continue;
    }
    while (ops.length && prec[ops[ops.length - 1]] >= prec[t] && ops[ops.length - 1] !== "(") {
      output.push(ops.pop());
    }
    ops.push(t);
  }
  while (ops.length) output.push(ops.pop());
  return output;
}

function evalRPN(rpn) {
  const stack = [];
  for (const t of rpn) {
    if (typeof t === "number") { stack.push(t); continue; }
    const b = stack.pop(), a = stack.pop();
    switch (t) {
      case "+": stack.push(a + b); break;
      case "-": stack.push(a - b); break;
      case "*": stack.push(a * b); break;
      case "/": stack.push(a / b); break;
      case "%": stack.push(a % b); break;
      case "^": stack.push(Math.pow(a, b)); break;
    }
  }
  return stack[0];
}

module.exports = async function calc({ args, reply }) {
  const expr = args.join("");
  if (!expr) return reply("✏️ Utilise : .calc <expression> (ex: .calc (4+2)*3)");
  if (!/^[\d+\-*/%^().\s]+$/.test(expr)) return reply("❌ Caractères non autorisés dans l'expression.");

  try {
    const result = evalRPN(toRPN(tokenize(expr)));
    if (!isFinite(result) || isNaN(result)) return reply("❌ Expression invalide.");
    reply(`🧮 ${expr} = *${result}*`);
  } catch {
    reply("❌ Expression invalide.");
  }
};
