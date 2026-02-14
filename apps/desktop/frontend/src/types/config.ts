import { RendererConfig } from "./renderer";

export interface Config {
  projectRoot: string;
  compilerUrl: string;
  compilerToken: string;
  renderer?: RendererConfig;
}