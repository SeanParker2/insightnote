export function Footer() {
  return (
    <footer className="border-t bg-brand-900 text-white py-8">
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col gap-2">
          <span className="font-serif text-xl font-bold">InsightNote</span>
          <p className="text-sm text-gray-400">
            Professional Financial Insights & Analysis
          </p>
        </div>
        <div className="flex gap-6 text-sm text-gray-300">
          <a href="#" className="hover:text-brand-gold transition-colors">Privacy</a>
          <a href="#" className="hover:text-brand-gold transition-colors">Terms</a>
          <a href="#" className="hover:text-brand-gold transition-colors">Contact</a>
        </div>
        <div className="text-xs text-gray-500">
          © {new Date().getFullYear()} InsightNote. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
