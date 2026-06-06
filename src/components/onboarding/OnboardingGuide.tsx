'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Briefcase, 
  FileText, 
  Brain, 
  Sparkles,
  CheckCircle,
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: {
    label: string;
    url: string;
  };
  completed?: boolean;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: '欢迎使用 InsightNote',
    description: 'AI 驱动的投资决策辅助平台，帮助你做出更明智的投资决策。',
    icon: <Sparkles className="w-8 h-8 text-brand" />,
  },
  {
    id: 'portfolio',
    title: '添加你的持仓',
    description: '添加你关注的股票，系统将基于持仓为你生成个性化的晨报和分析。',
    icon: <Briefcase className="w-8 h-8 text-teal-400" />,
    action: {
      label: '去添加持仓',
      url: '/portfolio',
    },
  },
  {
    id: 'research',
    title: '浏览深度研究',
    description: 'AI 生成的金融分析报告，包含情绪判断、因果传导链路和投资建议。',
    icon: <FileText className="w-8 h-8 text-blue-400" />,
    action: {
      label: '查看研究报告',
      url: '/posts',
    },
  },
  {
    id: 'agents',
    title: 'AI 分析团队',
    description: '四位 AI 分析师（基本面、情绪、技术、风控）协作完成全面分析。',
    icon: <Brain className="w-8 h-8 text-purple-400" />,
    action: {
      label: '体验 AI 分析',
      url: '/agents',
    },
  },
];

const STORAGE_KEY = 'insightnote_onboarding_completed';

export function OnboardingGuide() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    // Check if onboarding was completed
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // Show onboarding after a short delay
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsVisible(false);
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsVisible(false);
  };

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleAction = (url: string) => {
    setCompletedSteps(prev => [...prev, ONBOARDING_STEPS[currentStep].id]);
    router.push(url);
    // Don't close onboarding, let user return
  };

  if (!isVisible) return null;

  const step = ONBOARDING_STEPS[currentStep];
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4 bg-surface-1 border border-border-default rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Progress Bar */}
        <div className="h-1 bg-surface-2">
          <div 
            className="h-full bg-brand transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Close Button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-2 text-text-tertiary hover:text-text-secondary transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="p-8">
          {/* Step Indicator */}
          <div className="flex items-center gap-2 mb-6">
            {ONBOARDING_STEPS.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all ${
                  index === currentStep 
                    ? 'w-8 bg-brand' 
                    : index < currentStep 
                      ? 'w-4 bg-brand/50' 
                      : 'w-4 bg-surface-3'
                }`}
              />
            ))}
            <span className="ml-auto text-xs text-text-tertiary">
              {currentStep + 1}/{ONBOARDING_STEPS.length}
            </span>
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-2xl bg-surface-2">
              {step.icon}
            </div>
          </div>

          {/* Title & Description */}
          <h2 className="text-xl font-bold text-text-primary text-center mb-3">
            {step.title}
          </h2>
          <p className="text-sm text-text-secondary text-center mb-8 max-w-md mx-auto">
            {step.description}
          </p>

          {/* Action Button */}
          {step.action && (
            <div className="flex justify-center mb-6">
              <button
                onClick={() => handleAction(step.action!.url)}
                className="flex items-center gap-2 px-6 py-3 bg-brand text-white text-sm font-medium rounded-xl hover:bg-brand-dark transition-colors"
              >
                {step.action.label}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Completed Indicator */}
          {completedSteps.includes(step.id) && (
            <div className="flex items-center justify-center gap-2 text-sm text-signal-down mb-4">
              <CheckCircle className="w-4 h-4" />
              <span>已完成</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-8 py-4 border-t border-border-default bg-surface-2">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            上一步
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-sm text-text-tertiary hover:text-text-secondary transition-colors"
            >
              跳过引导
            </button>
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors"
            >
              {currentStep === ONBOARDING_STEPS.length - 1 ? '开始使用' : '下一步'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
