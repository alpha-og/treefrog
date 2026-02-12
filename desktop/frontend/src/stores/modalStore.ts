import { create } from "zustand";
import { ModalState } from "../types";

interface ModalStore {
  modal: ModalState | null;
  modalInput: string;
  openModal: (modal: ModalState) => void;
  closeModal: () => void;
  setModalInput: (input: string) => void;
}

export const useModalStore = create<ModalStore>((set) => ({
  modal: null,
  modalInput: "",
  openModal: (modal) => set({ modal, modalInput: "" }),
  closeModal: () => set({ modal: null, modalInput: "" }),
  setModalInput: (input) => set({ modalInput: input }),
}));
