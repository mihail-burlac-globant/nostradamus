const Footer = () => {
  return (
    <footer className="bg-white dark:bg-navy-900 border-t border-navy-100 dark:border-navy-700 mt-auto">
      <div className="container-wide">
        <div className="py-8 flex flex-col items-center gap-4">
          {/* Nostradamus Logo */}
          <div className="flex items-center gap-3">
            <img
              src="/icon.svg"
              alt="Nostradamus"
              className="w-8 h-8"
            />
            <span className="text-lg font-serif font-semibold text-navy-900 dark:text-white">
              Nostradamus
            </span>
          </div>

          {/* Copyright */}
          <p className="text-sm text-navy-600 dark:text-navy-400">
            &copy; {new Date().getFullYear()} Mihail Burlac - all rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
