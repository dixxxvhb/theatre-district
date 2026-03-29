import type { GridCell, Room } from '../../types'

export interface BuildingSlice {
  grids: Record<string, GridCell[]>
  rooms: Room[]
  initGrid: (propertyId: string, width: number, height: number) => void
  placeRoom: (room: Room) => void
  removeRoom: (roomId: string) => void
  tickConstruction: () => void
}

export const createBuildingSlice = (
  set: (fn: (state: BuildingSlice) => Partial<BuildingSlice>) => void
): BuildingSlice => ({
  grids: {},
  rooms: [],

  initGrid: (propertyId, width, height) =>
    set(() => ({
      grids: {
        [propertyId]: Array.from({ length: width * height }, (_, i) => ({
          x: i % width,
          y: Math.floor(i / width),
          roomId: null,
          type: 'empty' as const,
          walkable: true,
        })),
      },
    })),

  placeRoom: (room) =>
    set((state) => {
      const grid = state.grids[room.propertyId]
      if (!grid) return {}
      const updatedGrid = grid.map((cell) => {
        const inRoom =
          cell.x >= room.x &&
          cell.x < room.x + room.width &&
          cell.y >= room.y &&
          cell.y < room.y + room.height
        return inRoom ? { ...cell, roomId: room.id, type: 'room' as const } : cell
      })
      return {
        rooms: [...state.rooms, room],
        grids: { ...state.grids, [room.propertyId]: updatedGrid },
      }
    }),

  removeRoom: (roomId) =>
    set((state) => {
      const room = state.rooms.find((r) => r.id === roomId)
      if (!room) return {}
      const grid = state.grids[room.propertyId]
      if (!grid) return {}
      const updatedGrid = grid.map((cell) =>
        cell.roomId === roomId
          ? { ...cell, roomId: null, type: 'empty' as const }
          : cell
      )
      return {
        rooms: state.rooms.filter((r) => r.id !== roomId),
        grids: { ...state.grids, [room.propertyId]: updatedGrid },
      }
    }),

  tickConstruction: () =>
    set((state) => ({
      rooms: state.rooms.map((room) =>
        room.constructionDaysLeft > 0
          ? { ...room, constructionDaysLeft: room.constructionDaysLeft - 1 }
          : room
      ),
    })),
})
