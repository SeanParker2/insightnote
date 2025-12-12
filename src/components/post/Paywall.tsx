import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

export function Paywall() {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-end pb-20 bg-linear-to-b from-transparent via-white/80 to-white backdrop-blur-[2px]">
      <div className="w-full max-w-md p-8 text-center bg-white border shadow-2xl border-brand-gold/20 rounded-xl">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-brand-gold/10">
            <Lock className="w-6 h-6 text-brand-gold" />
          </div>
        </div>
        <h3 className="mb-2 text-xl font-bold font-serif text-brand-900">
          Unlock Full Analysis & Valuation Models
        </h3>
        <p className="mb-6 text-sm text-slate-500">
          Continue reading to see our proprietary Discounted Cash Flow (DCF) models and the &quot;Butterfly Effect&quot; map for this sector.
        </p>
        
        <div className="space-y-3">
          <Button className="w-full font-bold tracking-wider uppercase bg-brand-900 hover:bg-brand-800">
            Start Pro Membership ($9.9/mo)
          </Button>
          <p className="text-xs text-slate-400">
            Already a member? <a href="#" className="font-bold text-brand-900 hover:underline">Sign In</a>
          </p>
        </div>
      </div>
    </div>
  );
}
