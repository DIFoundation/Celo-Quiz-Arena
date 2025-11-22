// store/quizStore.js
import {create} from "zustand";

export const useQuizStore = create((set) => ({
  currentQuestion: null,
  setCurrentQuestion: (q) => set({ currentQuestion: q }),
  participants: [],
  setParticipants: (p) => set({ participants: p }),
}));
