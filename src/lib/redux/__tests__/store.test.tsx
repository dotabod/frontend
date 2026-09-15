import { act, cleanup, renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { Provider, useSelector } from 'react-redux'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import store, {
  selectBuildings,
  selectCouriers,
  selectCreeps,
  selectHeroes,
  selectHeroUnits,
  setMinimapDataBuildings,
  setMinimapDataCouriers,
  setMinimapDataCreeps,
  setMinimapDataHeroes,
  setMinimapDataHeroUnits,
  setMinimapStatus,
} from '../store'

const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>

describe('minimap collection subscriptions', () => {
  beforeEach(() => {
    store.dispatch(setMinimapDataBuildings(null))
    store.dispatch(setMinimapDataCouriers(null))
    store.dispatch(setMinimapDataCreeps(null))
    store.dispatch(setMinimapDataHeroes(null))
    store.dispatch(setMinimapDataHeroUnits(null))
    store.dispatch(setMinimapStatus(null))
  })

  afterEach(cleanup)

  it('ignores unrelated updates while collections are absent, then renders arriving entities', () => {
    let renders = 0
    const { result } = renderHook(
      () => {
        renders += 1
        return {
          buildings: useSelector(selectBuildings),
          couriers: useSelector(selectCouriers),
          creeps: useSelector(selectCreeps),
          heroUnits: useSelector(selectHeroUnits),
          heroes: useSelector(selectHeroes),
        }
      },
      { wrapper },
    )
    const initialRenders = renders

    act(() => {
      store.dispatch(setMinimapStatus({ active: true, hero: 'npc_dota_hero_axe' }))
    })

    expect(renders).toBe(initialRenders)
    expect(Object.values(result.current)).toStrictEqual([[], [], [], [], []])

    const hero = {
      image: 'hero',
      name: 'axe',
      teamP: 'radiant',
      unitname: 'npc_dota_hero_axe',
      xposP: 10,
      yaw: 0,
      yposP: 20,
    }
    act(() => {
      store.dispatch(setMinimapDataHeroes([hero]))
    })

    expect(renders).toBe(initialRenders + 1)
    expect(result.current.heroes).toStrictEqual([hero])
  })
})
