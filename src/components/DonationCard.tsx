export default function DonationCard() {
  return (
    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl p-6 border-2 border-yellow-200 dark:border-yellow-800 shadow-lg">
      <div className="text-center">
        <div className="text-3xl mb-3">💰</div>
        <h3 className="text-xl font-bold text-yellow-700 dark:text-yellow-300 mb-2">
          Support This Project
        </h3>
        <p className="text-gray-700 dark:text-gray-300 text-sm mb-4 leading-relaxed">
          This tool is completely free and open source! If it helps you optimize your weapon builds, 
          consider supporting the project with a small Tibia Coins donation.
        </p>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-yellow-300 dark:border-yellow-700 mb-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Send donations to:</div>
          <div className="font-bold text-lg text-blue-600 dark:text-blue-400 font-mono">
            Zwykly Parcel
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Any amount appreciated! 🙏
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          <span>💡</span>
          <span>Helps keep the servers running & adds new features</span>
        </div>
      </div>
    </div>
  )
} 