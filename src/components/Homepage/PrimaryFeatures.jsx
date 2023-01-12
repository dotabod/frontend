import { Fragment, useEffect, useRef, useState } from 'react'
import { Tab } from '@headlessui/react'
import clsx from 'clsx'
import { motion } from 'framer-motion'
import { useDebouncedCallback } from 'use-debounce'

import { AppScreen } from 'src/components/Homepage/AppScreen'
import { CircleBackground } from 'src/components/CircleBackground'
import { Container } from 'src/components/Container'
import { PhoneFrame } from 'src/components/Homepage/PhoneFrame'
import Image from 'next/image'
import { Display } from '@geist-ui/core'

const MotionAppScreenHeader = motion(AppScreen.Header)
const MotionAppScreenBody = motion(AppScreen.Body)

const features = [
  {
    name: 'Twitch predictions creator',
    description: (
      <span>
        Let your chatters bet with their native Twitch channel points whether
        you win or lose the game. After the match ends, the bets will close and
        points go to the winners!
      </span>
    ),
    icon: () => (
      <Image
        className="ml-1 inline"
        alt="peepogamba emote"
        height={32}
        width={32}
        src="/images/emotes/peepogamba.webp"
      />
    ),
    screen: BetsScreen,
  },
  {
    name: 'Active chatting',
    description:
      'Help keep your stream lively and engaging for your viewers, while also providing useful information about the current game. Dotabod can see your current game conditions so the messages will always be relevant, not random!',
    icon: () => (
      <Image
        className="ml-1 inline"
        alt="chatting emote"
        height={40}
        width={40}
        src="https://cdn.betterttv.net/emote/618c77311f8ff7628e6d5b8f/3x"
      />
    ),
    screen: OBSScreen,
  },
  {
    name: 'Minimap and hero picks blocker',
    description: (
      <span>
        Stream snipers ruining your games? Tired of getting your picks banned?
        Your wards will be protected by our minimap blocker, and our picks
        blocker will make it impossible to see what hero you picked. Hides and
        shows when it needs to, automatically!
      </span>
    ),
    icon: () => (
      <Image
        className="ml-1 inline"
        alt="ttours emote"
        height={32}
        width={32}
        src="/images/emotes/ttours.png"
      />
    ),
    screen: BlockScreen,
  },
]

const headerAnimation = {
  initial: { opacity: 0, transition: { duration: 0.3 } },
  animate: { opacity: 1, transition: { duration: 0.3, delay: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.3 } },
}

const maxZIndex = 2147483647

const bodyVariantBackwards = {
  opacity: 0.4,
  scale: 0.8,
  filter: 'blur(4px)',
  zIndex: 0,
  transition: { duration: 0.4 },
}

const bodyVariantForwards = (custom) => ({
  y: '100%',
  zIndex: maxZIndex - custom.changeCount,
  transition: { duration: 0.4 },
})

const bodyAnimation = {
  initial: 'initial',
  animate: 'animate',
  exit: 'exit',
  variants: {
    initial: (custom) =>
      custom.isForwards ? bodyVariantForwards(custom) : bodyVariantBackwards,
    animate: (custom) => ({
      y: '0%',
      opacity: 1,
      scale: 1,
      zIndex: maxZIndex / 2 - custom.changeCount,
      filter: 'blur(0px)',
      transition: { duration: 0.4 },
    }),
    exit: (custom) =>
      custom.isForwards ? bodyVariantBackwards : bodyVariantForwards(custom),
  },
}

function BlockScreen({ custom, animated = false }) {
  return (
    <AppScreen className="w-full">
      <MotionAppScreenHeader {...(animated ? headerAnimation : {})}>
        <AppScreen.Title>Custom covers</AppScreen.Title>
        <AppScreen.Subtitle>
          Semi-transparent blocker that auto places itself over your minimap.
          Works with <span className="text-white">extra large</span> minimaps,
          and also <span className="text-white">simple</span> minimaps
          backgrounds.
        </AppScreen.Subtitle>
      </MotionAppScreenHeader>
      <MotionAppScreenBody
        className="z-50 bg-transparent"
        {...(animated ? { ...bodyAnimation, custom } : {})}
      >
        <Display>
          <Image
            alt="minimap blocker"
            height={280}
            width={280}
            className="rounded-xl"
            src={`/images/overlay/minimap/731-Complex-Large-AntiStreamSnipeMap.png`}
            style={{
              backgroundImage:
                "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUAQMAAAC3R49OAAAABlBMVEX////09PQtDxrOAAAAE0lEQVQI12P4f4CBKMxg/4EYDAAFkR1NiYvv7QAAAABJRU5ErkJggg==')",
            }}
          />
        </Display>
      </MotionAppScreenBody>
    </AppScreen>
  )
}

function BetsScreen({ custom, animated = false }) {
  return (
    <AppScreen className="w-full">
      <MotionAppScreenHeader {...(animated ? headerAnimation : {})}>
        <AppScreen.Title>Give gamba</AppScreen.Title>
        <AppScreen.Subtitle>
          Create and close bets{' '}
          <span className="text-white">automatically</span> for every match.
        </AppScreen.Subtitle>
      </MotionAppScreenHeader>
      <MotionAppScreenBody
        className="z-50 bg-transparent"
        {...(animated ? { ...bodyAnimation, custom } : {})}
      >
        <Display>
          <Image
            className="rounded-xl"
            src="/images/dashboard/bets.png"
            alt="bets screen"
            unoptimized={true}
            width={600}
            height={840}
          />
        </Display>
      </MotionAppScreenBody>
    </AppScreen>
  )
}

function OBSScreen({ custom, animated = false }) {
  return (
    <AppScreen className="w-full">
      <MotionAppScreenHeader {...(animated ? headerAnimation : {})}>
        <AppScreen.Title>Dotabod has things to say</AppScreen.Title>
        <AppScreen.Subtitle>
          So many chatter options to choose from, why not just{' '}
          <span className="text-white">enable them all</span>?
        </AppScreen.Subtitle>
      </MotionAppScreenHeader>
      <MotionAppScreenBody
        className="z-50 bg-transparent"
        {...(animated ? { ...bodyAnimation, custom } : {})}
      >
        <Display>
          <Image
            className="rounded-xl"
            src="https://i.imgur.com/NgczeXd.png"
            alt="chatter toggles"
            unoptimized={true}
            width={738}
            height={1126}
          />
        </Display>
      </MotionAppScreenBody>
    </AppScreen>
  )
}

function usePrevious(value) {
  let ref = useRef()

  useEffect(() => {
    ref.current = value
  }, [value])

  return ref.current
}

function FeaturesDesktop() {
  let [changeCount, setChangeCount] = useState(0)
  let [selectedIndex, setSelectedIndex] = useState(0)
  let prevIndex = usePrevious(selectedIndex)
  let isForwards = prevIndex === undefined ? true : selectedIndex > prevIndex

  let onChange = useDebouncedCallback(
    (selectedIndex) => {
      setSelectedIndex(selectedIndex)
      setChangeCount((changeCount) => changeCount + 1)
    },
    100,
    { leading: true }
  )

  return (
    <Tab.Group
      as="div"
      className="grid grid-cols-12 items-center gap-8 lg:gap-16 xl:gap-24"
      selectedIndex={selectedIndex}
      onChange={onChange}
      vertical
    >
      <Tab.List className="relative z-10 order-last col-span-6 space-y-6">
        {features.map((feature, featureIndex) => (
          <div
            key={feature.name}
            className="relative rounded-2xl transition-colors hover:bg-gray-800/30"
          >
            {featureIndex === selectedIndex && (
              <motion.div
                layoutId="activeBackground"
                className="absolute inset-0 bg-gray-800"
                initial={{ borderRadius: 16 }}
              />
            )}
            <div className="relative z-10 p-8">
              <feature.icon className="h-8 w-8" />
              <h3 className="mt-6 text-lg font-semibold text-white">
                <Tab className="text-left [&:not(:focus-visible)]:focus:outline-none">
                  <span className="absolute inset-0 rounded-2xl" />
                  {feature.name}
                </Tab>
              </h3>
              <p className="mt-2 text-sm text-gray-400">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </Tab.List>
      <div className="relative col-span-6">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <CircleBackground color="#13B5C8" className="animate-spin-slower" />
        </div>
        <PhoneFrame className="z-10 mx-auto w-full max-w-[366px]">
          <Tab.Panels as={Fragment}>
            {features.map((feature, featureIndex) =>
              selectedIndex === featureIndex ? (
                <Tab.Panel
                  static
                  key={feature.name + changeCount}
                  className="col-start-1 row-start-1 flex focus:outline-offset-[32px] [&:not(:focus-visible)]:focus:outline-none"
                >
                  <feature.screen
                    animated
                    custom={{ isForwards, changeCount }}
                  />
                </Tab.Panel>
              ) : null
            )}
          </Tab.Panels>
        </PhoneFrame>
      </div>
    </Tab.Group>
  )
}

function FeaturesMobile() {
  let [activeIndex, setActiveIndex] = useState(0)
  let slideContainerRef = useRef()
  let slideRefs = useRef([])

  useEffect(() => {
    let observer = new window.IntersectionObserver(
      (entries) => {
        for (let entry of entries) {
          if (entry.isIntersecting) {
            setActiveIndex(slideRefs.current.indexOf(entry.target))
            break
          }
        }
      },
      {
        root: slideContainerRef.current,
        threshold: 0.6,
      }
    )

    for (let slide of slideRefs.current) {
      if (slide) {
        observer.observe(slide)
      }
    }

    return () => {
      observer.disconnect()
    }
  }, [slideContainerRef, slideRefs])

  return (
    <>
      <div
        ref={slideContainerRef}
        className="-mb-4 flex snap-x snap-mandatory -space-x-4 overflow-x-auto overscroll-x-contain scroll-smooth pb-4 [scrollbar-width:none] sm:-space-x-6 [&::-webkit-scrollbar]:hidden"
      >
        {features.map((feature, featureIndex) => (
          <div
            key={featureIndex}
            ref={(ref) => (slideRefs.current[featureIndex] = ref)}
            className="w-full flex-none snap-center px-4 sm:px-6"
          >
            <div className="relative transform overflow-hidden rounded-2xl bg-gray-800 px-5 py-6">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <CircleBackground
                  color="#13B5C8"
                  className={featureIndex % 2 === 1 ? 'rotate-180' : undefined}
                />
              </div>
              <PhoneFrame className="relative mx-auto w-full max-w-[366px]">
                <feature.screen />
              </PhoneFrame>
              <div className="absolute inset-x-0 bottom-0 bg-gray-800/95 p-6 backdrop-blur sm:p-10">
                <feature.icon />
                <h3 className="mt-6 text-sm font-semibold text-white sm:text-lg">
                  {feature.name}
                </h3>
                <p className="mt-2 text-sm text-gray-400">
                  {feature.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-center gap-3">
        {features.map((_, featureIndex) => (
          <button
            type="button"
            key={featureIndex}
            className={clsx(
              'relative h-0.5 w-4 rounded-full',
              featureIndex === activeIndex ? 'bg-gray-300' : 'bg-gray-500'
            )}
            aria-label={`Go to slide ${featureIndex + 1}`}
            onClick={() => {
              slideRefs.current[featureIndex].scrollIntoView({
                block: 'nearest',
                inline: 'nearest',
              })
            }}
          >
            <span className="absolute -inset-x-1.5 -inset-y-3" />
          </button>
        ))}
      </div>
    </>
  )
}

export function PrimaryFeatures() {
  return (
    <section
      id="features"
      aria-label="Features for streaing all your Dota"
      className="bg-gray-900 py-20 sm:py-32"
    >
      <Container>
        <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-3xl">
          <h2 className="text-3xl font-medium tracking-tight text-white">
            Best features you need to stream. Try it for yourself.
          </h2>
          <p className="mt-2 text-lg text-gray-400">
            Dotabod was built for streamers like you who play by their own rules
            and aren’t going to let anything get in the way of their dreams. If
            other streaming tools are afraid to build it, Dotabod has it.
          </p>
        </div>
      </Container>
      <div className="mt-16 md:hidden">
        <FeaturesMobile />
      </div>
      <Container className="hidden md:mt-20 md:block">
        <FeaturesDesktop />
      </Container>
    </section>
  )
}
