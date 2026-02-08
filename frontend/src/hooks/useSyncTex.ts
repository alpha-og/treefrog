import { useState } from "react";
import {
  viewSync,
  editSync
} from "../services/synctexService";

export function useSyncTeX() {

  const [target, setTarget] = useState<any>(null);

  async function fromCursor(file: string, line: number, col: number) {
    const data = await viewSync(file, line, col);
    setTarget(data);
    return data;
  }

  async function fromClick(page: number, x: number, y: number) {
    return editSync(page, x, y);
  }

  return {
    target,
    fromCursor,
    fromClick
  };
}
