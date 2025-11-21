const Footer = () => {
  return (
    <footer className="bg-white dark:bg-navy-900 border-t border-navy-100 dark:border-navy-700 mt-auto">
      <div className="container-wide">
        <div className="py-6 flex items-center justify-center">
          <p className="text-sm text-navy-600 dark:text-navy-400 flex items-center gap-2">
            <span className="font-serif font-semibold">Nostradamus</span>
            <span>&copy; {new Date().getFullYear()} Mihail Burlac - all rights reserved.</span>
            <span className="font-mono text-xs">v{__APP_VERSION__}</span>
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
