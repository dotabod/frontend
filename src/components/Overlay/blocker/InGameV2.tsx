import React, { useCallback, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { isDev } from '@/lib/devConsts'
import { useDynamicResizing, useWindowResize } from './hooks'
export const TopHud = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  margin-left: auto;
  margin-right: auto;
  width: 1010px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 4;
`

export const TeamContainer = styled.div`
  display: flex;
  gap: 1px;
`

export const TopHudHero = styled.div<{ $isRadiant: boolean }>`
  ${isDev ? 'border: 1px solid red;' : ''}
  cursor: pointer;
  height: 40px;
  width: 60px;
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

const UltrawideContentWrap = styled.div`
  min-width: 1920px;
  height: 1080px;
  position: absolute;
  z-index: 2;
  left: 50%;
  top: 50%;
  overflow: visible;
`

export const Clock = styled.div`
  ${isDev ? 'border: 1px solid red;' : ''}
  width: 205px;
`

export const InGameOutsideCenterV2 = ({ children }: { children: React.ReactNode }) => {
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentWidth, setContentWidth] = useState(1920)
  const { uiRescale, resizeHandler } = useDynamicResizing(contentRef)

  const updateContentWidth = useCallback(() => {
    const aspectRatio = window.innerWidth / window.innerHeight
    const targetWidth = Math.max(1920, 1080 * aspectRatio)
    setContentWidth(targetWidth)
  }, [])

  useEffect(() => {
    updateContentWidth()
    window.addEventListener('resize', updateContentWidth)
    return () => window.removeEventListener('resize', updateContentWidth)
  }, [updateContentWidth])

  useWindowResize(resizeHandler)

  return (
    <div
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <UltrawideContentWrap
        ref={contentRef}
        id='main_box'
        style={{
          transform: `translate(-50%, -50%) scale(${uiRescale})`,
          width: `${contentWidth}px`,
        }}
      >
        {children}
      </UltrawideContentWrap>
    </div>
  )
}

export const InGameV2 = ({ children }: { children: React.ReactNode }) => {
  const contentRef = useRef<HTMLDivElement>(null)
  const { uiRescale, resizeHandler } = useDynamicResizing(contentRef)

  useWindowResize(resizeHandler)

  const heroIndicesRadiant = [0, 1, 2, 3, 4]
  const heroIndicesDire = [5, 6, 7, 8, 9]
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
        <TopHud>
          <TeamContainer>
            {heroIndicesRadiant.map((heroId) => (
              <React.Fragment key={heroId}>
                <TopHudHero $isRadiant />
              </React.Fragment>
            ))}
          </TeamContainer>

          <Clock />

          <TeamContainer>
            {heroIndicesDire.map((heroId) => (
              <React.Fragment key={heroId}>
                <TopHudHero $isRadiant={false} />
              </React.Fragment>
            ))}
          </TeamContainer>
        </TopHud>

        {children}
      </ContentWrap>
    </div>
  )
}
