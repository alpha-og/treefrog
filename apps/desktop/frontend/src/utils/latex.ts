import * as monaco from "monaco-editor";
import {
  registerLaTeXLanguage,
  LATEX_COMMANDS as MONACO_LATEX_COMMANDS,
} from "monaco-latex";
import { createLogger } from "./logger";

const log = createLogger("LaTeX");

// Additional LaTeX commands to augment monaco-latex
const ADDITIONAL_COMMANDS = [
  { name: "frac", description: "Fraction", snippet: "frac{${1:numerator}}{${2:denominator}}" },
  { name: "sum", description: "Summation", snippet: "sum_{${1:i=1}}^{${2:n}}" },
  { name: "int", description: "Integral", snippet: "int_{${1:a}}^{${2:b}}" },
  { name: "sqrt", description: "Square root", snippet: "sqrt{${1:x}}" },
  { name: "textbf", description: "Bold text", snippet: "textbf{${1:text}}" },
  { name: "textit", description: "Italic text", snippet: "textit{${1:text}}" },
  { name: "texttt", description: "Monospace text", snippet: "texttt{${1:text}}" },
  { name: "emph", description: "Emphasized text", snippet: "emph{${1:text}}" },
  { name: "underline", description: "Underlined text", snippet: "underline{${1:text}}" },
  { name: "includegraphics", description: "Include image", snippet: "includegraphics[width=${1:0.8\\textwidth}]{${2:image}}" },
  { name: "label", description: "Create label", snippet: "label{${1:label}}" },
  { name: "ref", description: "Reference label", snippet: "ref{${1:label}}" },
  { name: "cite", description: "Citation", snippet: "cite{${1:key}}" },
  { name: "alpha", description: "Greek letter alpha", snippet: "alpha" },
  { name: "beta", description: "Greek letter beta", snippet: "beta" },
  { name: "gamma", description: "Greek letter gamma", snippet: "gamma" },
  { name: "delta", description: "Greek letter delta", snippet: "delta" },
  { name: "epsilon", description: "Greek letter epsilon", snippet: "epsilon" },
  { name: "ldots", description: "Ellipsis", snippet: "ldots" },
];

/**
 * Initialize LaTeX language support in Monaco Editor
 */
export function setupLatexLanguage() {
  try {
    // Register LaTeX language using the official registration function
    registerLaTeXLanguage(monaco as typeof monaco);

    // Register augmented completion provider with both built-in and additional commands
    monaco.languages.registerCompletionItemProvider("latex", {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endLineNumber: position.lineNumber,
          endColumn: word.endColumn,
        };

        // Combine built-in and additional commands
        const allCommands = [
          ...MONACO_LATEX_COMMANDS.map((cmd) => ({
            label: `\\${cmd.name}`,
            detail: cmd.description || "",
            snippet: `\\${cmd.snippet}`,
          })),
          ...ADDITIONAL_COMMANDS.map((cmd) => ({
            label: `\\${cmd.name}`,
            detail: cmd.description || "",
            snippet: `\\${cmd.snippet}`,
          })),
        ];

        const suggestions = allCommands
          .filter((cmd) => cmd.label.toLowerCase().includes(word.word.toLowerCase()))
          .map((cmd) => ({
            label: cmd.label,
            kind: monaco.languages.CompletionItemKind.Function,
            detail: cmd.detail,
            insertText: cmd.snippet,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range,
            sortText: cmd.label,
            preselect:
              cmd.label.includes("section") ||
              cmd.label.includes("documentclass") ||
              cmd.label.includes("begin"),
          }));

        return { suggestions };
      },
      triggerCharacters: ["\\"],
    });
  } catch (error) {
    log.error("Error setting up LaTeX language", { error });
  }
}
