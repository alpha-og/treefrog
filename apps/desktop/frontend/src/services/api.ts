import axios, { AxiosInstance } from "axios";
import { isWails } from "../utils/env";
import { createLogger } from "../utils/logger";
import { WailsApp } from "@/types";

const log = createLogger("API");

let apiClient: AxiosInstance;

export function initializeAPI(baseURL: string) {
  log.debug(`Initializing API client with baseURL: ${baseURL}`);
  apiClient = axios.create({
    baseURL,
    headers: {
      "Content-Type": "application/json",
    },
  });
  return apiClient;
}

export function getAPI(): AxiosInstance {
  if (!apiClient) {
    apiClient = initializeAPI("/api");
  }
  return apiClient;
}

export async function GET(url: string) {
  log.debug(`GET ${url}`);
  try {
    const res = await getAPI().get(url);
    log.debug(`GET ${url} completed`, { status: res.status });
    return res.data;
  } catch (error) {
    log.error(`GET ${url} failed`, error);
    throw error;
  }
}

export async function POST(url: string, body: unknown) {
  log.debug(`POST ${url}`, { bodyKeys: Object.keys(body as Record<string, unknown> || {}) });
  try {
    const res = await getAPI().post(url, body);
    log.debug(`POST ${url} completed`, { status: res.status });
    return res.data;
  } catch (error) {
    log.error(`POST ${url} failed`, error);
    throw error;
  }
}

export async function PUT(url: string, body: unknown) {
  log.debug(`PUT ${url}`, { bodyKeys: Object.keys(body as Record<string, unknown> || {}) });
  try {
    const res = await getAPI().put(url, body);
    log.debug(`PUT ${url} completed`, { status: res.status });
    return res.data;
  } catch (error) {
    log.error(`PUT ${url} failed`, error);
    throw error;
  }
}

export const getWailsApp = (): WailsApp | null => {
  if (isWails() && window.go?.main?.App) {
    return window.go.main.App as unknown as WailsApp;
  }
  return null;
};