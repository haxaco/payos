'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Rocket, ShoppingBag, Bot, Repeat, X, PartyPopper } from 'lucide-react';
import { cn } from '@sly/ui';
import { useApiConfig } from '@/lib/api-client';
import { useWizardProgress } from '@/hooks/useWizardProgress';
import { WizardSidebar } from '@/components/onboarding/wizard-sidebar';
import { WizardStep } from '@/components/onboarding/wizard-step';
import {
  CreateWalletStep,
  ConnectHandlerStep,
  ConfigurePricingStep,
  ConfigureLimitsStep,
  RegisterAgentStep,
  CreateMandateStep,
  TestPaymentStep,
} from '@/components/onboarding/steps';
import { WIZARD_TEMPLATES, type TemplateId } from '@/types/wizard';

const TEMPLATE_ICONS: Record<string, typeof Rocket> = {
  'zap': Rocket,
  'shopping-cart': ShoppingBag,
  'bot': Bot,
  'repeat': Repeat,
};

export default function WizardPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.templateId as TemplateId;
  const { isConfigured, isLoading: isAuthLoading } = useApiConfig();

  const wizard = useWizardProgress({ templateId });
  const [stepData, setStepData] = useState<Record<string, unknown>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Get template config
  const templateConfig = WIZARD_TEMPLATES[templateId];

  // Handle case where template doesn't exist
  useEffect(() => {
    if (!templateConfig && !isAuthLoading) {
      router.push('/dashboard/onboarding');
    }
  }, [templateConfig, isAuthLoading, router]);

  // Current step
  const currentStepDef = wizard.steps[wizard.currentStep];

  // Step completion handlers
  const handleStepComplete = useCallback((data?: unknown) => {
    if (data !== undefined) {
      setStepData(prev => ({ ...prev, [currentStepDef?.id]: data }));
    }
    wizard.completeStep(data);
  }, [wizard, currentStepDef]);

  const handleStepSkip = useCallback(() => {
    wizard.skipStep();
  }, [wizard]);

  const handlePrevious = useCallback(() => {
    wizard.previousStep();
  }, [wizard]);

  const handleWizardComplete = useCallback(() => {
    wizard.completeWizard();
  }, [wizard]);

  // Loading state
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  // Not configured
  if (!isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <Rocket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Authentication Required
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Please log in to continue with setup.
          </p>
          <Link
            href="/login"
            className="inline-flex mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            Log In
          </Link>
        </div>
      </div>
    );
  }

  // Template not found
  if (!templateConfig) {
    return null;
  }

  // Check if wizard is complete
  const isWizardComplete = wizard.currentStep >= wizard.totalSteps - 1 &&
    wizard.completedSteps.has(wizard.steps[wizard.totalSteps - 1]?.id);

  // Completion screen
  if (isWizardComplete) {
    const IconComponent = TEMPLATE_ICONS[templateConfig.icon] || Rocket;

    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-lg text-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <PartyPopper className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {templateConfig.name} Setup Complete!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Your {templateConfig.name.toLowerCase()} configuration is ready.
            You can now start using the features.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/dashboard/onboarding"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
            >
              View All Templates
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Render step content based on template and step
  const renderStepContent = () => {
    if (!currentStepDef) return null;

    // API Monetization Template
    if (templateId === 'api-monetization') {
      switch (currentStepDef.id) {
        case 'create-wallet':
          return (
            <CreateWalletStep
              purpose="Receiving payments from x402 API calls"
              recommendedNetwork="base"
              helpText="Your wallet will receive micropayments from x402 API calls. We recommend Base for lowest fees."
              onWalletCreated={(walletId) => handleStepComplete({ walletId })}
            />
          );
        case 'register-endpoint':
          // For now, show a placeholder - this would be a full endpoint registration form
          return (
            <div className="max-w-xl mx-auto">
              <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                  Register Your API Endpoint
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      API Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Weather API"
                      className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Base URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://api.example.com"
                      className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                  Your x402 endpoint will be: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">payos.dev/x402/your-endpoint-slug</code>
                </p>
              </div>
            </div>
          );
        case 'configure-pricing':
          return (
            <ConfigurePricingStep
              onPricingConfigured={(pricing) => handleStepComplete(pricing)}
            />
          );
        case 'test-payment':
          return (
            <TestPaymentStep
              testType="x402"
              onTestComplete={() => handleStepComplete()}
            />
          );
      }
    }

    // E-Commerce Template
    if (templateId === 'e-commerce') {
      switch (currentStepDef.id) {
        case 'connect-handler':
          return (
            <ConnectHandlerStep
              helpText="Connect your payment processor to handle customer payments."
              onHandlerConnected={(handlerId) => handleStepComplete({ handlerId })}
            />
          );
        case 'create-checkout':
          // Placeholder for checkout configuration
          return (
            <div className="max-w-xl mx-auto">
              <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                  Configure Your Checkout
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Store Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., My Awesome Store"
                      className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Default Currency
                    </label>
                    <select className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>USD</option>
                      <option>EUR</option>
                      <option>GBP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Checkout Style
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Modal', 'Redirect', 'Embedded'].map((style) => (
                        <button
                          key={style}
                          type="button"
                          className="p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 text-sm font-medium"
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        case 'customize-branding':
          // Placeholder for branding
          return (
            <div className="max-w-xl mx-auto">
              <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                  Customize Branding
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Logo
                    </label>
                    <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
                      <p className="text-sm text-gray-500">Drag & drop or click to upload</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Primary Color
                    </label>
                    <input
                      type="color"
                      defaultValue="#3B82F6"
                      className="w-full h-12 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        case 'test-purchase':
          return (
            <TestPaymentStep
              testType="checkout"
              onTestComplete={() => handleStepComplete()}
            />
          );
      }
    }

    // Agent Commerce Template
    if (templateId === 'agent-commerce') {
      switch (currentStepDef.id) {
        case 'connect-handler':
          return (
            <ConnectHandlerStep
              helpText="Agents will use this to complete purchases."
              onHandlerConnected={(handlerId) => handleStepComplete({ handlerId })}
            />
          );
        case 'create-agent-wallet':
          return (
            <CreateWalletStep
              purpose="Agent spending wallet"
              recommendedNetwork="base"
              helpText="Create a dedicated wallet for agent spending. Fund it with USDC."
              onWalletCreated={(walletId) => handleStepComplete({ walletId })}
            />
          );
        case 'configure-limits':
          return (
            <ConfigureLimitsStep
              helpText="Set per-transaction limits, daily spending limits, and approval thresholds."
              onLimitsConfigured={(limits) => handleStepComplete(limits)}
            />
          );
        case 'test-agent-purchase':
          return (
            <TestPaymentStep
              testType="agent"
              onTestComplete={() => handleStepComplete()}
            />
          );
      }
    }

    // Recurring Payments Template
    if (templateId === 'recurring-payments') {
      switch (currentStepDef.id) {
        case 'create-wallet':
          return (
            <CreateWalletStep
              purpose="Receiving recurring payments"
              recommendedNetwork="base"
              helpText="This wallet will receive all recurring payment deposits."
              onWalletCreated={(walletId) => handleStepComplete({ walletId })}
            />
          );
        case 'register-agent':
          return (
            <RegisterAgentStep
              helpText="Agents need identity to create mandates. Set KYA tier based on risk."
              onAgentRegistered={(agentId, token) => handleStepComplete({ agentId, token })}
            />
          );
        case 'create-mandate':
          return (
            <CreateMandateStep
              agentId={(stepData['register-agent'] as any)?.agentId}
              helpText="Mandates authorize the agent to make recurring payments within defined rules."
              onMandateCreated={(mandateId) => handleStepComplete({ mandateId })}
            />
          );
        case 'test-execution':
          return (
            <TestPaymentStep
              testType="mandate"
              onTestComplete={() => handleStepComplete()}
            />
          );
      }
    }

    // Fallback placeholder
    return (
      <div className="text-center text-gray-500 py-12">
        Step content coming soon...
      </div>
    );
  };

  const IconComponent = TEMPLATE_ICONS[templateConfig.icon] || Rocket;

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
      {/* Header */}
      <header className="flex-shrink-0 h-16 border-b border-gray-200 dark:border-gray-800 px-6 flex items-center justify-between bg-white dark:bg-gray-950">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/onboarding"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Link>
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              'bg-gray-100 dark:bg-gray-800'
            )}>
              <IconComponent className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900 dark:text-white">
                {templateConfig.name} Setup
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {templateConfig.estimatedTime}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Step {wizard.currentStep + 1} of {wizard.totalSteps}
          </span>
          <Link
            href="/dashboard/onboarding"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Exit wizard"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Link>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <WizardSidebar
          steps={wizard.steps}
          currentStep={wizard.currentStep}
          completedSteps={wizard.completedSteps}
          skippedSteps={wizard.skippedSteps}
          estimatedTimeRemaining={wizard.estimatedTimeRemaining}
          onStepClick={wizard.goToStep}
        />

        {/* Step content */}
        <main className="flex-1 overflow-hidden">
          {currentStepDef && (
            <WizardStep
              step={currentStepDef}
              stepIndex={wizard.currentStep}
              totalSteps={wizard.totalSteps}
              isFirstStep={wizard.currentStep === 0}
              isLastStep={wizard.currentStep === wizard.totalSteps - 1}
              isLoading={isProcessing}
              onComplete={() => {
                // If it's the last step and already complete, finish the wizard
                if (wizard.currentStep === wizard.totalSteps - 1 && wizard.isCurrentStepComplete) {
                  handleWizardComplete();
                }
              }}
              onSkip={handleStepSkip}
              onPrevious={handlePrevious}
            >
              {renderStepContent()}
            </WizardStep>
          )}
        </main>
      </div>
    </div>
  );
}
