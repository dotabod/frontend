const Header = ({ title, subtitle }: { title: React.ReactNode; subtitle?: React.ReactNode }) => (
  <div className={subtitle ? 'mb-12 space-y-4' : 'mb-12'}>
    <h1 className='text-2xl leading-6 font-bold'>{title}</h1>
    {subtitle ? <div className='text-gray-300'>{subtitle}</div> : null}
  </div>
)

export default Header
