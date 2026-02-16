import { useSelector } from 'react-redux'
import { selectHeroUnits, selectMainHero, selectSettings } from '@/lib/redux/store'

function Hero({ data, team }) {
  const heroUnits = useSelector(selectHeroUnits)
  // default, custom, or icon
  const displayType = useSelector(selectSettings)?.hero_display || 'icon'
  const mainHero = useSelector(selectMainHero)

  const position = {
    bottom: data.yposP,
    left: data.xposP,
  }

  const isEnemy = data.teamP !== team
  const isIllusion = data.image === 'heroimage' || data.image === 'enemyimage'
  const isBrewmaster = data.name === 'brewmaster'

  const brewlingCount = heroUnits.filter((unit) => unit.unitname.includes('brewmaster')).length
  const hasBrewlings = brewlingCount >= 3

  const rotation = {
    transform: `rotate(${data.yaw * -1}deg)`,
  }

  const pointerIcon = isEnemy
    ? '/images/overlay/minimap/blocker/icons/arrows/enemy-pointer.png'
    : '/images/overlay/minimap/blocker/icons/arrows/hero-pointer.png'

  let heroIcon
  if (displayType === 'default') {
    if (isEnemy) {
      heroIcon = '/images/overlay/minimap/blocker/icons/arrows/enemy.png'
    } else if (data.name === mainHero) {
      heroIcon = '/images/overlay/minimap/blocker/icons/arrows/hero-main.png'
    } else {
      heroIcon = '/images/overlay/minimap/blocker/icons/arrows/hero.png'
    }
  } else {
    heroIcon = `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/icons/${data.name}.png`
  }

  return (
    <div className={['container-hero', displayType].join(' ')} style={position}>
      {!(isBrewmaster && hasBrewlings) && (
        <>
          {displayType === 'custom' && (
            // biome-ignore lint/performance/noImgElement: Overlay rendered in OBS browser source, not optimizable by next/image
            <img
              title={data.name}
              alt='hero icon'
              className={['pointer', isEnemy ? 'enemy' : '', isIllusion ? 'illusion' : ''].join(
                ' ',
              )}
              style={rotation}
              src={pointerIcon}
            />
          )}
          {/* biome-ignore lint/performance/noImgElement: Overlay rendered in OBS browser source, not optimizable by next/image */}
          <img
            title={data.name}
            alt='hero icon'
            className={['icon', isEnemy ? 'enemy' : '', isIllusion ? 'illusion' : ''].join(' ')}
            style={displayType === 'default' ? rotation : {}}
            src={heroIcon}
          />
        </>
      )}
    </div>
  )
}

export default Hero
