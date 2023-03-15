import React from 'react'
import Creep from './Creep'
import { useSelector } from 'react-redux'
import {
  selectBuildings,
  selectCouriers,
  selectCreeps,
  selectHeroes,
  selectHeroUnits,
  selectIsPreview,
  selectSettings,
} from '@/lib/redux/store'
import Building from './Building'
import Courier from './Courier'
import Hero from './Hero'
import HeroUnit from './HeroUnit'

function Minimap() {
  const isPreview = useSelector(selectIsPreview)
  const settings = useSelector(selectSettings)
  const heroes = useSelector(selectHeroes)
  const heroUnits = useSelector(selectHeroUnits)
  const creeps = useSelector(selectCreeps)
  const buildings = useSelector(selectBuildings)
  const couriers = useSelector(selectCouriers)

  return (
    <div
      className={[
        wrapper,
        settings?.size_xl ? xl : '',
        isPreview ? preview : '',
        settings?.position_right ? right : '',
      ].join(' ')}
    >
      <div
        className={[
          container,
          settings?.size_xl ? xl : '',
          settings?.bg_simple ? simple : '',
          settings?.bg_hidden ? hidden : '',
          settings?.position_right ? right : '',
          isPreview ? preview : '',
        ].join(' ')}
      >
        <div className={fog}></div>

        {buildings.map((building, index) => (
          <Building data={building} key={`minimap-building-${index}`} />
        ))}
        {creeps.map((creep, index) => (
          <Creep data={creep} key={`minimap-creep-${index}`} />
        ))}
        {heroes.map((hero, index) => (
          <Hero data={hero} key={`${hero.name}-${index}`} />
        ))}
        {heroUnits.map((unit, index) => (
          <HeroUnit data={unit} key={`${unit.unitname}-${index}`} />
        ))}
        {couriers.map((courier, index) => (
          <Courier data={courier} key={`courier-${index}`} />
        ))}
      </div>
    </div>
  )
}

const wrapper = 'wrapper-minimap'
const xl = 'xl'
const preview = 'preview'
const right = 'right'
const container = 'container-minimap'
const simple = 'simple'
const hidden = 'hidden'
const fog = 'fog'

export default Minimap
