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
          border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
          transition-all duration-300 ease-in-out
          ${
            isDragActive
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 scale-105'
              : 'border-slate-300 dark:border-slate-600 hover:border-primary-400 dark:hover:border-primary-500 bg-white dark:bg-slate-800'
          }
          ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center space-y-4">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 rounded-full flex items-center justify-center">
            {isProcessing ? (
              <svg
                className="animate-spin h-10 w-10 text-primary-600 dark:text-primary-400"
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
                className="w-10 h-10 text-primary-600 dark:text-primary-400"
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

          <div>
            <p className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">
              {isProcessing
                ? 'Processing CSV file...'
                : isDragActive
                ? 'Drop your CSV file here'
                : 'Drag & drop your CSV file here'}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              or click to browse files
            </p>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-500 max-w-md">
            <p className="mb-2">Required CSV columns:</p>
            <code className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
              name, startDate, endDate, progress, status
            </code>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-300 font-medium">
            Error: {error}
          </p>
        </div>
      )}
    </div>
  )
}

export default CSVUploader
