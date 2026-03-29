import { GameSpeed } from '../../types/enums'

export interface TimeSlice {
  day: number
  speed: GameSpeed
  paused: boolean
  setSpeed: (speed: GameSpeed) => void
  setPaused: (paused: boolean) => void
  advanceDay: () => void
}

export const createTimeSlice = (
  set: (fn: (state: TimeSlice) => Partial<TimeSlice>) => void
): TimeSlice => ({
  day: 1,
  speed: GameSpeed.NORMAL,
  paused: false,

  setSpeed: (speed) => set(() => ({ speed })),
  setPaused: (paused) => set(() => ({ paused })),
  advanceDay: () => set((state) => ({ day: state.day + 1 })),
})
