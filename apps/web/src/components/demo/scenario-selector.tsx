'use client';

import { useRouter } from 'next/navigation';
import { useDemoMode } from './demo-mode-context';
import { DEMO_SCENARIOS } from './demo-scenarios';
import { X } from 'lucide-react';

interface ScenarioSelectorProps {
  onClose: () => void;
}

export function ScenarioSelector({ onClose }: ScenarioSelectorProps) {
  const router = useRouter();
  const { setScenarioId } = useDemoMode();

  const tierA = DEMO_SCENARIOS.filter(s => s.tier === 'A');
  const tierB = DEMO_SCENARIOS.filter(s => s.tier === 'B');

  const handleSelect = (id: number) => {
    const scenario = DEMO_SCENARIOS.find(s => s.id === id);
    if (!scenario) return;
    setScenarioId(id);
    router.push(scenario.steps[0].href);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose} />
      <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl z-50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Select Scenario</span>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {/* Tier A */}
          <div className="px-3 pt-3 pb-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Tier A — Core Flows
            </span>
          </div>
          {tierA.map(scenario => (
            <ScenarioRow key={scenario.id} scenario={scenario} onSelect={handleSelect} />
          ))}

          {/* Tier B */}
          <div className="px-3 pt-3 pb-1 border-t border-gray-100 dark:border-gray-800">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Tier B — Extended Flows
            </span>
          </div>
          {tierB.map(scenario => (
            <ScenarioRow key={scenario.id} scenario={scenario} onSelect={handleSelect} />
          ))}
        </div>

        {/* Exit Demo */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-2">
          <ExitDemoButton />
        </div>
      </div>
    </>
  );
}

function ScenarioRow({ scenario, onSelect }: { scenario: typeof DEMO_SCENARIOS[number]; onSelect: (id: number) => void }) {
  return (
    <button
      onClick={() => onSelect(scenario.id)}
      className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
    >
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 text-xs font-bold flex items-center justify-center mt-0.5">
          {scenario.id}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-white">{scenario.name}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            {scenario.protocols.map(p => (
              <span
                key={p}
                className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
              >
                {p}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{scenario.description}</p>
        </div>
      </div>
    </button>
  );
}

function ExitDemoButton() {
  const { setActive } = useDemoMode();
  return (
    <button
      onClick={() => setActive(false)}
      className="w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors text-center font-medium"
    >
      Exit Demo Mode
    </button>
  );
}
