declare module "turndown" {
  export default class TurndownService {
    public constructor(options?: Record<string, unknown>);
    public use(plugin: unknown): void;
    public turndown(value: string): string;
  }
}

declare module "turndown-plugin-gfm" {
  export const gfm: unknown;
}
