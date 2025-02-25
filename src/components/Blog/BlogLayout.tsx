import { Container } from '@/components/Container'
import { formatDate } from '@/utils/formatDate'
import Link from 'next/link'

interface BlogLayoutProps {
  children: React.ReactNode
  meta: {
    title: string
    description: string
    date: string
    author?: string
  }
}

export default function BlogLayout({ children, meta }: BlogLayoutProps) {
  return (
    <Container>
      <div className='xl:relative'>
        <div className='mx-auto max-w-2xl'>
          <Link
            href='/blog'
            className='group mb-8 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md shadow-zinc-800/5 ring-1 ring-zinc-900/5 transition dark:border dark:border-zinc-700/50 dark:bg-zinc-800 dark:ring-0 dark:ring-white/10 dark:hover:border-zinc-700 dark:hover:ring-white/20'
          >
            <svg
              viewBox='0 0 16 16'
              fill='none'
              aria-hidden='true'
              className='h-4 w-4 stroke-zinc-500 transition group-hover:stroke-zinc-700 dark:stroke-zinc-500 dark:group-hover:stroke-zinc-400'
            >
              <path
                d='M7.25 11.25 3.75 8m0 0 3.5-3.25M3.75 8h8.5'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
          </Link>
          <article>
            <header className='flex flex-col'>
              <h1 className='mt-6 text-4xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100 sm:text-5xl'>
                {meta.title}
              </h1>
              <time
                dateTime={meta.date}
                className='order-first flex items-center text-base text-zinc-400 dark:text-zinc-500'
              >
                <span className='h-4 w-0.5 rounded-full bg-zinc-200 dark:bg-zinc-500' />
                <span className='ml-3'>{formatDate(meta.date)}</span>
              </time>
              {meta.author && (
                <p className='text-sm text-zinc-500 dark:text-zinc-400 mt-2'>By {meta.author}</p>
              )}
            </header>
            <div className='mt-8 prose dark:prose-invert'>{children}</div>
          </article>
        </div>
      </div>
    </Container>
  )
}
