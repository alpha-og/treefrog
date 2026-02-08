import { GET, POST } from "./api";

export const gitStatus = () =>
  GET("/git/status");

export const gitCommit = (message: string) =>
  POST("/git/commit", {
    message,
    all: true,
  });

export const gitPush = () =>
  POST("/git/push", {});

export const gitPull = () =>
  POST("/git/pull", {});

