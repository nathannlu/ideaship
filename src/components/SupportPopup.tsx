import { useState } from "react"

export const SupportPopup = () => {
  const [showHelpPopup, setShowHelpPopup] = useState<boolean>(true)
  return showHelpPopup && (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="relative bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-xs">
        <button
          className="absolute top-1 right-1 text-gray-500 hover:text-gray-700"
          onClick={() => setShowHelpPopup(false)}
          aria-label="Close help popup"
        >
          &times;
        </button>
        <p className="text-sm text-gray-700 mb-2">
          Need help? Click the link below for instant support.
        </p>
        <a
          href="https://discord.gg/qmXWpEmQRU"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-sm font-medium"
        >
          Instant Support
        </a>
      </div>
    </div>
  )
}