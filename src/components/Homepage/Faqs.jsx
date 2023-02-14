import Link from 'next/link'
import Image from 'next/image'

import { Container } from 'src/components/Container'

const faqs = [
  [
    {
      question: 'Why the name Dotabod?',
      answer: (
        <div>
          Because we all have a little dota bod in us{' '}
          <Image
            className="inline align-bottom"
            src="/images/emotes/peepofat.gif"
            height={28}
            width={28}
            alt="peepofat"
          />
          . But also because dotabot was taken.
        </div>
      ),
    },
    {
      question:
        'How do I explain to my wife the money I withdraw from our joint bank account to use Dotabod?',
      answer:
        'This feels like one-hundred percent a you problem. Dotabod is not responsible in any way for your marital grievances. But you could also just tell her Dotabod was free.',
    },
    {
      question: 'How do I get started?',
      answer:
        'Login with your Twitch account and you can begin using it right away. There will be a setup screen to guide you through the process.',
    },
  ],
  [
    {
      question: 'Will my viewers like this?',
      answer:
        "People make their own choices. Some viewers won't like a minimap blocker. But your viewers will choose to like you more for it.",
    },
    {
      question: 'Why is Dotabod based?',
      answer: 'Let’s just say it’s because stream snipers will never find us.',
    },
    {
      question: 'Is there any age limit to using Dotabod?',
      answer:
        'You can use Dotabod even if you’re 9 years old. Or a dog. But there might be age limits to streaming on Twitch. So ask a parent first.',
    },
  ],
  [
    {
      question: 'How does it work?',
      answer:
        'We use the Dota 2 gamestate integration API, and give you a browser source overlay to use with OBS.',
    },
    {
      question: 'Isn’t this against TOS?',
      answer:
        'Not at all. In fact, Valve themselves sanction and allow this practice officially. Valve provides Gamestate Integration for Dota 2 so that any thirdparty apps, like Dotabod, can receive live data.',
    },
    {
      question: 'Will this make me a better streamer?',
      answer: 'Here’s the thing: yes.',
    },
  ],
]

export function Faqs() {
  return (
    <section
      id="faqs"
      aria-labelledby="faqs-title"
      className="border-t border-gray-500 py-20 sm:py-32"
    >
      <Container>
        <div className="mx-auto max-w-2xl lg:mx-0">
          <h2
            id="faqs-title"
            className="text-3xl font-medium tracking-tight text-gray-200"
          >
            Frequently asked questions
          </h2>
          <p className="mt-2 text-lg text-gray-300">
            If you have anything else you want to ask,{' '}
            <Link
              href="https://discord.dotabod.com"
              className="text-gray-200 underline"
            >
              reach out to us on discord
            </Link>
            .
          </p>
        </div>
        <ul
          role="list"
          className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:max-w-none lg:grid-cols-3"
        >
          {faqs.map((column, columnIndex) => (
            <li key={columnIndex}>
              <ul role="list" className="space-y-10">
                {column.map((faq, faqIndex) => (
                  <li key={faqIndex}>
                    <h3 className="text-lg font-semibold leading-6 text-gray-200">
                      {faq.question}
                    </h3>
                    <div className="mt-4 text-sm text-gray-300">
                      {faq.answer}
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
