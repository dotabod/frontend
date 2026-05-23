import { configureStore, createSlice } from '@reduxjs/toolkit'
import type { blockType } from '@/lib/devConsts'

interface MinimapEntity {
  teamP: string
  image: string
  unitname: string
  name: string
  yaw: number
  xposP: number
  yposP: number
}

export interface MinimapUnitProps {
  data: MinimapEntity
  team: blockType['team']
}

const initialState = {
  buildings: null as null | MinimapEntity[],
  couriers: null as null | MinimapEntity[],
  creeps: null as null | MinimapEntity[],
  hero_units: null as null | MinimapEntity[],
  heroes: null as null | MinimapEntity[],
  isPreview: false,
  isTest: false,
  settings: null as null | Record<string, unknown>,
  status: null as null | { active?: boolean; hero: string },
}

type AppState = typeof initialState

const appSlice = createSlice({
  initialState,
  name: 'app',
  reducers: {
    setMinimapDataBuildings: (state, action) => {
      state.buildings = action.payload
    },
    setMinimapDataCouriers: (state, action) => {
      state.couriers = action.payload
    },
    setMinimapDataCreeps: (state, action) => {
      state.creeps = action.payload
    },
    setMinimapDataHeroUnits: (state, action) => {
      state.hero_units = action.payload
    },
    setMinimapDataHeroes: (state, action) => {
      state.heroes = action.payload
    },
    setMinimapSettings: (state, action) => {
      state.settings = action.payload
    },
    setMinimapStatus: (state, action) => {
      state.status = action.payload
    },
    setPreview: (state, action) => {
      state.isPreview = action.payload
    },
    setTest: (state, action) => {
      state.isTest = action.payload
    },
  },
})

// Create the store
const store = configureStore({
  reducer: appSlice.reducer,
})

// Export actions separately for easy access
export const {
  setMinimapStatus,

  setMinimapDataHeroes,
  setMinimapDataHeroUnits,
  setMinimapDataBuildings,
  setMinimapDataCreeps,
  setMinimapDataCouriers,
} = appSlice.actions

export const selectIsPreview = (state: AppState) => state.isPreview

export const selectStatus = (state: AppState) => state.status

export const selectSettings = (state: AppState) => state.settings

export const selectMainHero = (state: AppState) =>
  state.status ? state.status.hero.replace('npc_dota_hero_', '') : ''

export const selectHeroes = (state: AppState) => (state.heroes ? state.heroes : [])

export const selectHeroUnits = (state: AppState) => (state.hero_units ? state.hero_units : [])

export const selectBuildings = (state: AppState) => (state.buildings ? state.buildings : [])

export const selectCreeps = (state: AppState) => (state.creeps ? state.creeps : [])

export const selectCouriers = (state: AppState) => (state.couriers ? state.couriers : [])

export default store
