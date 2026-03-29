export type ViewMode = 'isometric' | 'floorplan'

export interface UiSlice {
  selectedRoomId: string | null
  viewMode: ViewMode
  activePanel: string | null
  activeModal: string | null
  setSelectedRoom: (roomId: string | null) => void
  setViewMode: (mode: ViewMode) => void
  openPanel: (panelId: string) => void
  closePanel: () => void
  openModal: (modalId: string) => void
  closeModal: () => void
}

export const createUiSlice = (
  set: (fn: (state: UiSlice) => Partial<UiSlice>) => void
): UiSlice => ({
  selectedRoomId: null,
  viewMode: 'floorplan',
  activePanel: null,
  activeModal: null,

  setSelectedRoom: (roomId) => set(() => ({ selectedRoomId: roomId })),
  setViewMode: (mode) => set(() => ({ viewMode: mode })),
  openPanel: (panelId) => set(() => ({ activePanel: panelId })),
  closePanel: () => set(() => ({ activePanel: null })),
  openModal: (modalId) => set(() => ({ activeModal: modalId })),
  closeModal: () => set(() => ({ activeModal: null })),
})
