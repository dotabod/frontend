const Header = ({ title, subtitle }) => (
  <div className="mb-12 space-y-4">
    <h1 className="text-2xl font-bold leading-6 text-white">{title}</h1>
    <div className="text-dark-300">{subtitle}</div>
  </div>
)

export default Header
