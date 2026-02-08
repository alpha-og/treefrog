import { POST } from "./api";

export const syncConfig = (builderUrl: string, builderToken: string) =>
  POST("/config", { builderUrl, builderToken });
