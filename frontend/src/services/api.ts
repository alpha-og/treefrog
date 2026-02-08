import axios, { AxiosInstance } from "axios";

let apiClient: AxiosInstance;

export function initializeAPI(baseURL: string) {
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
  return getAPI().get(url).then((res) => res.data);
}

export async function POST(url: string, body: any) {
  return getAPI().post(url, body).then((res) => res.data);
}

export async function PUT(url: string, body: any) {
  return getAPI().put(url, body).then((res) => res.data);
}
