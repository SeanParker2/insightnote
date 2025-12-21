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
          解锁完整分析与估值模型
        </h3>
        <p className="mb-6 text-sm text-slate-500">
          继续阅读即可查看我们的现金流折现（DCF）模型与该行业的「蝴蝶效应图谱」。
        </p>
        
        <div className="space-y-3">
          <Button className="w-full font-bold tracking-wider uppercase bg-brand-900 hover:bg-brand-800">
            开通 Pro（$9.9/月）
          </Button>
          <p className="text-xs text-slate-400">
            已是会员？<a href="#" className="font-bold text-brand-900 hover:underline">登录</a>
          </p>
        </div>
      </div>
    </div>
  );
}
