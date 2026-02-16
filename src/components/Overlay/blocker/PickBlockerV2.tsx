import React, { useRef } from 'react'
import styled from 'styled-components'
import { useIsDevMode } from '@/lib/hooks/useIsDevMode'
import { useDynamicResizing, useWindowResize } from './hooks'

export const TopHud = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  margin-left: auto;
  margin-right: auto;
  width: 1510px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 4;
`

export const TeamContainer = styled.div`
  display: flex;
  gap: 7px;
`

export const TopHudHero = styled.div<{ $isRadiant: boolean; $isDevMode: boolean }>`
  ${({ $isDevMode }) => ($isDevMode ? 'border: 1px solid red;' : '')}
  cursor: pointer;
  height: 73px;
  width: 115px;
  margin: 0 1px;
  transform-origin: center center;
  position: relative;
  transition: 0.05s background ease-out;
  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transition: 0.1s background ease-out;
  }
  ${({ $isRadiant }) => $isRadiant && 'transform: skew(9deg);'}
  ${({ $isRadiant }) => !$isRadiant && 'transform: skew(-9deg);'}
`

const ContentWrap = styled.div`
  width: 1920px;
  height: 1080px;
  position: absolute;
  z-index: 2;
  left: 50%;
  top: 50%;
  overflow: hidden;
  transform: translate(-50%, -40%);
`

export const Clock = styled.div<{ $isDevMode: boolean }>`
  width: 281px;
  ${({ $isDevMode }) => ($isDevMode ? 'border: 1px solid red;' : '')}
`

export const PickScreenV2 = () => {
  const isDevMode = useIsDevMode()
  const heroIndicesRadiant = [0, 1, 2, 3, 4]
  const heroIndicesDire = [5, 6, 7, 8, 9]

  return (
    <TopHud id='pick-screen-hud'>
      <TeamContainer id='pick-screen-radiant-team'>
        {heroIndicesRadiant.map((heroId) => (
          <React.Fragment key={heroId}>
            <TopHudHero $isRadiant $isDevMode={isDevMode} />
          </React.Fragment>
        ))}
      </TeamContainer>

      <Clock id='pick-screen-clock' $isDevMode={isDevMode} />

      <TeamContainer id='pick-screen-dire-team'>
        {heroIndicesDire.map((heroId) => (
          <React.Fragment key={heroId}>
            <TopHudHero $isRadiant={false} $isDevMode={isDevMode} />
          </React.Fragment>
        ))}
      </TeamContainer>
    </TopHud>
  )
}

export function OverlayV2({ children }: { children: React.ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null)
  const { uiRescale, resizeHandler } = useDynamicResizing(contentRef)

  useWindowResize(resizeHandler)

  return (
    <div
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
      }}
    >
      <ContentWrap
        ref={contentRef}
        id='main_box'
        style={{ transform: `translate(-50%, -50%) scale(${uiRescale})` }}
      >
        {children}
      </ContentWrap>
    </div>
  )
}
