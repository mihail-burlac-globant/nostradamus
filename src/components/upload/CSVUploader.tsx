import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import { useProjectStore } from '../../stores/projectStore'
import { CSVRow, Task, ProjectData } from '../../types/project.types'
import { parseCSVToProjectData } from '../../utils/csvParser'

const CSVUploader = () => {
  const { setProjectData } = useProjectStore()
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      setError(null)
      setIsProcessing(true)

      Papa.parse<CSVRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const projectData = parseCSVToProjectData(results.data)
            setProjectData(projectData)
            setIsProcessing(false)
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to parse CSV')
            setIsProcessing(false)
          }
        },
        error: (err) => {
          setError(`CSV parsing error: ${err.message}`)
          setIsProcessing(false)
        },
      })
    },
    [setProjectData]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    maxFiles: 1,
  })

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          relative overflow-hidden border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer
          transition-all duration-300 ease-in-out
          ${
            isDragActive
              ? 'border-salmon-500 bg-salmon-50 dark:bg-salmon-900/10 shadow-medium scale-[1.02]'
              : 'border-navy-200 dark:border-navy-700 hover:border-salmon-400 dark:hover:border-salmon-600 bg-white dark:bg-navy-800 shadow-soft hover:shadow-medium'
          }
          ${isProcessing ? 'opacity-60 pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center space-y-6 relative z-10">
          {/* Icon */}
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-salmon-100 to-salmon-200 dark:from-salmon-900/30 dark:to-salmon-800/30 rounded-2xl flex items-center justify-center shadow-soft">
              {isProcessing ? (
                <svg
                  className="animate-spin h-12 w-12 text-salmon-600 dark:text-salmon-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <svg
                  className="w-12 h-12 text-salmon-600 dark:text-salmon-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              )}
            </div>
            {/* Decorative pulse */}
            {!isProcessing && (
              <div className="absolute inset-0 bg-salmon-400 dark:bg-salmon-600 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300 blur-xl" />
            )}
          </div>

          {/* Text */}
          <div className="space-y-2">
            <p className="text-h4 font-serif text-navy-900 dark:text-white">
              {isProcessing
                ? 'Processing your data...'
                : isDragActive
                ? 'Release to upload'
                : 'Upload Project Data'}
            </p>
            <p className="text-body text-navy-600 dark:text-navy-400">
              Drag and drop your CSV file, or click to browse
            </p>
          </div>

          {/* CSV Format Info */}
          <div className="bg-navy-50 dark:bg-navy-900/50 rounded-xl px-6 py-4 max-w-2xl border border-navy-100 dark:border-navy-700">
            <p className="text-sm font-medium text-navy-700 dark:text-navy-300 mb-3">
              Required CSV Columns
            </p>
            <div className="flex flex-wrap gap-2 text-xs mb-3">
              <code className="bg-white dark:bg-navy-800 text-navy-800 dark:text-navy-200 px-3 py-1.5 rounded-lg font-mono border border-navy-200 dark:border-navy-600">
                id
              </code>
              <code className="bg-white dark:bg-navy-800 text-navy-800 dark:text-navy-200 px-3 py-1.5 rounded-lg font-mono border border-navy-200 dark:border-navy-600">
                name
              </code>
              <code className="bg-white dark:bg-navy-800 text-navy-800 dark:text-navy-200 px-3 py-1.5 rounded-lg font-mono border border-navy-200 dark:border-navy-600">
                startDate
              </code>
              <code className="bg-white dark:bg-navy-800 text-navy-800 dark:text-navy-200 px-3 py-1.5 rounded-lg font-mono border border-navy-200 dark:border-navy-600">
                endDate
              </code>
              <code className="bg-white dark:bg-navy-800 text-navy-800 dark:text-navy-200 px-3 py-1.5 rounded-lg font-mono border border-navy-200 dark:border-navy-600">
                progress
              </code>
              <code className="bg-white dark:bg-navy-800 text-navy-800 dark:text-navy-200 px-3 py-1.5 rounded-lg font-mono border border-navy-200 dark:border-navy-600">
                status
              </code>
            </div>
            <p className="text-sm font-medium text-navy-700 dark:text-navy-300 mb-2">
              Optional Columns
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <code className="bg-salmon-50 dark:bg-salmon-900/20 text-salmon-800 dark:text-salmon-400 px-3 py-1.5 rounded-lg font-mono border border-salmon-200 dark:border-salmon-800">
                assignee
              </code>
              <code className="bg-salmon-50 dark:bg-salmon-900/20 text-salmon-800 dark:text-salmon-400 px-3 py-1.5 rounded-lg font-mono border border-salmon-200 dark:border-salmon-800">
                profile_type
              </code>
              <code className="bg-salmon-50 dark:bg-salmon-900/20 text-salmon-800 dark:text-salmon-400 px-3 py-1.5 rounded-lg font-mono border border-salmon-200 dark:border-salmon-800">
                remaining_estimate_hours
              </code>
              <code className="bg-salmon-50 dark:bg-salmon-900/20 text-salmon-800 dark:text-salmon-400 px-3 py-1.5 rounded-lg font-mono border border-salmon-200 dark:border-salmon-800">
                dependency
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-6 p-5 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-700 rounded-r-xl">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-900 dark:text-red-200">
                Upload Error
              </p>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CSVUploader
