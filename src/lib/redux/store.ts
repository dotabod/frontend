import { configureStore, createSlice } from '@reduxjs/toolkit'

const initialState = {
  isTest: false,
  isPreview: false,
  status: null as null | { active?: boolean; hero: string },
  settings: null as null | Record<string, unknown>,
  heroes: null as null | Array<{ name: string }>,
  hero_units: null as null | Array<{ unitname: string }>,
  buildings: null as null | Array<Record<string, unknown>>,
  creeps: null as null | Array<Record<string, unknown>>,
  couriers: null as null | Array<Record<string, unknown>>,
}

type AppState = typeof initialState

const appSlice = createSlice({
  name: 'app',
  initialState: initialState,
  reducers: {
    setTest: (state, action) => {
      state.isTest = action.payload
    },
    setPreview: (state, action) => {
      state.isPreview = action.payload
    },
    setMinimapStatus: (state, action) => {
      state.status = action.payload
    },
    setMinimapSettings: (state, action) => {
      state.settings = action.payload
    },
    setMinimapDataHeroes: (state, action) => {
      state.heroes = action.payload
    },
    setMinimapDataHeroUnits: (state, action) => {
      state.hero_units = action.payload
    },
    setMinimapDataBuildings: (state, action) => {
      state.buildings = action.payload
    },
    setMinimapDataCreeps: (state, action) => {
      state.creeps = action.payload
    },
    setMinimapDataCouriers: (state, action) => {
      state.couriers = action.payload
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
