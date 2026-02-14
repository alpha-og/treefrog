import {
  viewSync,
  editSync,
  ViewResult,
  EditResult
} from "../services/synctexService";

export function useSyncTeX(buildId: string | null = null) {

  async function fromCursor(file: string, line: number, col: number = 0): Promise<ViewResult | null> {
    return viewSync(buildId, file, line, col);
  }

  async function fromClick(page: number, x: number, y: number): Promise<EditResult | null> {
    return editSync(buildId, page, x, y);
  }

  return {
    fromCursor,
    fromClick
  };
}
