import type { BlockTool, BlockToolConstructorOptions, ToolboxConfig } from "@editorjs/editorjs";
import type { MathfieldElement } from "mathlive";
import type { NoteMathBlockData } from "@/lib/notes/types";

const MATH_TOOL_ICON = `
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 6.5H16M4 13.5H10M12.5 11L16 14.5M16 11L12.5 14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;

export class MathBlockTool implements BlockTool {
  public static get toolbox(): ToolboxConfig {
    return {
      title: "Math",
      icon: MATH_TOOL_ICON,
    };
  }

  public static get isReadOnlySupported() {
    return true;
  }

  private readonly readOnly: boolean;
  private data: NoteMathBlockData;
  private mathField: MathfieldElement | null = null;
  private wrapper: HTMLDivElement | null = null;
  private readonly handleInput = () => {
    if (!this.mathField) {
      return;
    }

    this.data = {
      latex: this.mathField.value,
    };
  };

  constructor({ data, readOnly }: BlockToolConstructorOptions<NoteMathBlockData>) {
    this.readOnly = readOnly;
    this.data = {
      latex: data.latex ?? "",
    };
  }

  public render() {
    const wrapper = document.createElement("div");
    wrapper.className =
      "rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950";

    const label = document.createElement("div");
    label.className = "mb-2 text-xs font-medium uppercase tracking-[0.2em] text-zinc-500";
    label.textContent = this.readOnly ? "Equation" : "Math";
    wrapper.append(label);

    const mathField = document.createElement("math-field") as unknown as MathfieldElement;
    mathField.className = "block min-h-12 w-full rounded-md bg-white px-3 py-2 text-lg dark:bg-zinc-900";
    mathField.setAttribute("math-virtual-keyboard-policy", "manual");
    mathField.setAttribute("smart-mode", "on");
    mathField.setAttribute("default-mode", "math");
    mathField.setAttribute("placeholder", "\\frac{a}{b}");
    mathField.value = this.data.latex;

    if (this.readOnly) {
      mathField.setAttribute("read-only", "");
      mathField.tabIndex = -1;
    } else {
      mathField.addEventListener("input", this.handleInput);
      mathField.addEventListener("change", this.handleInput);
    }

    wrapper.append(mathField);

    this.mathField = mathField;
    this.wrapper = wrapper;

    return wrapper;
  }

  public save() {
    return {
      latex: this.mathField?.value ?? this.data.latex,
    };
  }

  public validate(blockData: NoteMathBlockData) {
    return blockData.latex.trim().length > 0;
  }

  public destroy() {
    if (this.mathField) {
      this.mathField.removeEventListener("input", this.handleInput);
      this.mathField.removeEventListener("change", this.handleInput);
    }

    this.mathField = null;
    this.wrapper = null;
  }
}
