import { createSlice, configureStore } from '@reduxjs/toolkit'

const initialState = {
  isTest: false,
  isPreview: false,
  status: null,
  settings: null,
  heroes: null,
  hero_units: null,
  buildings: null,
  creeps: null,
  couriers: null,
}

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
  setTest,
  setPreview,
  setMinimapStatus,
  setMinimapSettings,
  setMinimapDataHeroes,
  setMinimapDataHeroUnits,
  setMinimapDataBuildings,
  setMinimapDataCreeps,
  setMinimapDataCouriers,
} = appSlice.actions

export const selectIsTest = (state) => state.isTest

export const selectIsPreview = (state) => state.isPreview

export const selectStatus = (state) => state.status

export const selectSettings = (state) => state.settings

export const selectMainHero = (state) =>
  state.status ? state.status.hero.replace('npc_dota_hero_', '') : ''

export const selectHeroes = (state) => (state.heroes ? state.heroes : [])

export const selectHeroUnits = (state) =>
  state.hero_units ? state.hero_units : []

export const selectBuildings = (state) =>
  state.buildings ? state.buildings : []

export const selectCreeps = (state) => (state.creeps ? state.creeps : [])

export const selectCouriers = (state) => (state.couriers ? state.couriers : [])

export default store
