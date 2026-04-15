import type * as React from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "math-field": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        "default-mode"?: string;
        "math-virtual-keyboard-policy"?: string;
        "read-only"?: boolean | "" | "true";
        "smart-mode"?: string;
      };
    }
  }
}
