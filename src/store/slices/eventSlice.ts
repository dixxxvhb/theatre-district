import type { GameEvent } from '../../types'

export interface EventSlice {
  activeEvents: GameEvent[]
  eventHistory: string[]
  addEvent: (event: GameEvent) => void
  resolveEvent: (eventId: string, optionIndex: number) => void
  clearResolvedEvents: () => void
}

export const createEventSlice = (
  set: (fn: (state: EventSlice) => Partial<EventSlice>) => void
): EventSlice => ({
  activeEvents: [],
  eventHistory: [],

  addEvent: (event) =>
    set((state) => ({ activeEvents: [...state.activeEvents, event] })),

  resolveEvent: (eventId, _optionIndex) =>
    set((state) => {
      const event = state.activeEvents.find((e) => e.id === eventId)
      if (!event) return {}
      return {
        activeEvents: state.activeEvents.map((e) =>
          e.id === eventId ? { ...e, resolved: true } : e
        ),
        eventHistory: [...state.eventHistory, event.templateId],
      }
    }),

  clearResolvedEvents: () =>
    set((state) => ({
      activeEvents: state.activeEvents.filter((e) => !e.resolved),
    })),
})
