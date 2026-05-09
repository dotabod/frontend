const Header = ({ title, subtitle }: { title: React.ReactNode; subtitle?: React.ReactNode }) => (
  <div className='mb-12 space-y-4'>
    <h1 className='text-2xl font-bold leading-6'>{title}</h1>
    <div className='text-gray-300'>{subtitle}</div>
  </div>
)

export default Header
