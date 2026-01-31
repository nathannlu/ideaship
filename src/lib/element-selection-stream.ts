import { create, StateCreator } from 'zustand';

export interface ElementSelectionEvent {
  id: string;
  content: string;
  rect: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  tag: string;
  style?: {
    backgroundColor?: string;
    color?: string;
  };
  metadata?: any;
}

interface ElementSelectionState {
  selectedElement: ElementSelectionEvent | null;
  setSelectedElement: (element: ElementSelectionEvent | null) => void;
}

// Create a global store for element selection
export const useElementSelection = create<ElementSelectionState>((set: StateCreator<ElementSelectionState>['setState']) => ({
  selectedElement: null,
  setSelectedElement: (element: ElementSelectionEvent | null) => set({ selectedElement: element }),
}));

// Helper function to emit element selection events
export const emitElementSelection = (event: ElementSelectionEvent) => {
  useElementSelection.getState().setSelectedElement({...event});
};

// Helper function to clear element selection
export const clearElementSelection = () => {
  useElementSelection.getState().setSelectedElement(null);
}; 