import React from 'react'
import { Logomark } from 'src/components/Logo'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import styled from 'styled-components'
import { WinChance } from '@/lib/hooks/useSocket'
import { SecondsToDuration } from '@/ui/utils'
import { ClockCircleOutlined } from '@ant-design/icons'

const BAR_SIZE = 850
const BAR_HEIGHT_SIZE = 5
const SEPARATOR_SIZE = 30
const ANIMATION = '2s ease-in-out'

const Bar = styled.div<any>`
  opacity: ${(props) => (props.visible ? '1' : '0')};
  position: absolute;
  top: ${(props) => (props.visible ? '200' : '0')}px;
  transition: top 0.2s ease-out;
  left: 0;
  right: 0;
  margin-left: auto;
  margin-right: auto;
  height: ${BAR_HEIGHT_SIZE}px;
  width: 70%;
  max-width: ${BAR_SIZE}px;
  box-shadow: 0 0 3px 5px rgb(0 0 0 / 0.3);
  border-radius: 5px;
`

const SeparatorImg = styled(Logomark)<any>`
  position: relative;
  bottom: ${SEPARATOR_SIZE / 2}px;
  background-color: rgba(0, 0, 0, 1);
  padding: 2px;
  border-radius: 100%;
  left: calc(${(props) => Math.min(props.pos, 98)}% - ${SEPARATOR_SIZE / 2}px);
  height: ${SEPARATOR_SIZE}px;
  width: ${SEPARATOR_SIZE}px;
  pointer-events: none;
  transition: left ${ANIMATION};
`

const BarFill = styled.div`
  display: flex;
  height: ${BAR_HEIGHT_SIZE}px;
`

const AnimatedNumRadiant = styled.span<any>`
  display: block;
  margin-top: 15px;
  position: relative;
  font-size: 1rem;
  z-index: 5;

  @property --radiant {
    syntax: '<integer>';
    initial-value: 0;
    inherits: false;
  }
  transition: --radiant ${ANIMATION};
  counter-set: num var(--radiant);
  --radiant: ${(props) => props.value};

  &::before {
    text-shadow: 1px 1px 1px #000;
    content: counter(num);
  }
`

const AnimatedNumDire = styled.span<any>`
  display: block;
  margin-top: 15px;
  position: relative;
  font-size: 1rem;
  z-index: 5;

  @property --dire {
    syntax: '<integer>';
    initial-value: 0;
    inherits: false;
  }
  transition: --dire ${ANIMATION};
  counter-set: num var(--dire);
  --dire: ${(props) => props.value};

  &::before {
    text-shadow: 1px 1px 1px #000;
    content: counter(num);
  }
`

const FillRadiant = styled.div<any>`
  background: linear-gradient(
    90deg,
    rgba(0, 255, 0, 1) 80%,
    rgba(185, 238, 3, 1) 100%
  );
  width: ${(props) => props.width}%;
  transition: width ${ANIMATION};
  border-bottom-left-radius: 5px;
  border-top-left-radius: 5px;
  color: #00ea00;
  text-align: right;
  padding-right: 3px;
`

const FillDire = styled.div<any>`
  background: linear-gradient(
    90deg,
    rgba(235, 75, 75, 1) 20%,
    rgba(255, 0, 0, 1) 100%
  );
  width: ${(props) => props.width}%;
  transition: width ${ANIMATION};
  border-bottom-right-radius: 5px;
  border-top-right-radius: 5px;
  color: #eb4b4b;
`

const UpperText = styled.div<any>`
  display: flex;
  flex-direction: column;
  position: absolute;
  text-align: center;
  left: ${(props) => Math.min(props.pos, 98)}%;
  white-space: nowrap;
  transform: translateX(-50%);
  bottom: 10px;
  text-shadow: 1px 1px 1px #000;
  color: #cecece;
  transition: left ${ANIMATION};
  font-size: 0.85rem;
`

const TitleText = styled.span`
  font-size: 1rem;
  color: #fff881;
`

function getRandomInt(min, max) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export const WinProbability = ({
  radiantWinChance,
  setRadiantWinChance,
}: {
  radiantWinChance: WinChance
  setRadiantWinChance: any
}) => {
  const { data: isEnabled } = useUpdateSetting(Settings.winProbabilityOverlay)

  if (!isEnabled || !radiantWinChance) {
    return null
  }

  return (
    <div id="win-probability">
      <Bar visible={radiantWinChance.visible}>
        <UpperText pos={radiantWinChance.value}>
          <span>
            {SecondsToDuration(radiantWinChance.time)} <ClockCircleOutlined />
          </span>
          <TitleText>WIN PROBABILITY</TitleText>
        </UpperText>
        <BarFill>
          <FillRadiant width={radiantWinChance.value}>
            <AnimatedNumRadiant value={radiantWinChance.value}>
              %
            </AnimatedNumRadiant>
          </FillRadiant>
          <FillDire width={100 - radiantWinChance.value}>
            <AnimatedNumDire value={100 - radiantWinChance.value}>
              %
            </AnimatedNumDire>
          </FillDire>
        </BarFill>
        <SeparatorImg alt="logo" pos={radiantWinChance.value} />
      </Bar>
    </div>
  )
}
