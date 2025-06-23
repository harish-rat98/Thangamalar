export default function TamilLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Diamond-shaped logo with Tamil text */}
      <div className="relative">
        <div className="w-12 h-12 bg-gradient-to-br from-yellow-600 to-yellow-700 transform rotate-45 rounded-lg shadow-lg flex items-center justify-center border-2 border-yellow-800">
          <div className="transform -rotate-45 text-white font-bold text-sm tracking-wide">
            RGR
          </div>
        </div>
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full opacity-90 shadow-sm"></div>
        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-yellow-400 rounded-full opacity-70"></div>
      </div>
      
      {/* Tamil text */}
      <div className="text-jewelry-navy">
        <div className="text-xl font-bold font-tamil">தங்க மலர்</div>
        <div className="text-sm text-jewelry-bronze font-medium">Thanga Malar Jewellery</div>
      </div>
    </div>
  );
}