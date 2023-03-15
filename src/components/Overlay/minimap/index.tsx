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
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Settings } from '@/lib/defaultSettings'
import { blockType } from '@/lib/devConsts'

function Minimap({ block }: { block: blockType }) {
  const { data: isSimple } = useUpdateSetting(Settings['minimap-simple'])
  const { data: isXL } = useUpdateSetting(Settings['minimap-xl'])
  const { data: isRight } = useUpdateSetting(Settings.minimapRight)

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
        isXL ? xl : '',
        isPreview ? preview : '',
        isRight ? right : '',
      ].join(' ')}
    >
      <div
        className={[
          container,
          isXL ? xl : '',
          isSimple ? simple : '',
          settings?.bg_hidden ? hidden : '',
          isRight ? right : '',
          isPreview ? preview : '',
        ].join(' ')}
      >
        <div className={fog} />

        {buildings.map((building, index) => (
          <Building
            team={block?.team}
            data={building}
            key={`minimap-building-${index}`}
          />
        ))}
        {creeps.map((creep, index) => (
          <Creep
            team={block?.team}
            data={creep}
            key={`minimap-creep-${index}`}
          />
        ))}
        {heroes.map((hero, index) => (
          <Hero team={block?.team} data={hero} key={`${hero.name}-${index}`} />
        ))}
        {heroUnits.map((unit, index) => (
          <HeroUnit
            team={block?.team}
            data={unit}
            key={`${unit.unitname}-${index}`}
          />
        ))}
        {couriers.map((courier, index) => (
          <Courier team={block?.team} data={courier} key={`courier-${index}`} />
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
