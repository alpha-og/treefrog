import { GET, POST } from "./api";

export const getProject = () =>
  GET("/project");

export const setProject = (root: string) =>
  POST("/project/set", { root });

