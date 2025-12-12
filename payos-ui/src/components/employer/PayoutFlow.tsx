import { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { ArrowLeft, ArrowRight, CheckCircle2, DollarSign } from 'lucide-react';

const allContractors = [
  { id: 1, name: 'Carlos Rodriguez', avatar: 'CR', email: 'carlos@example.com', defaultAmount: 2500 },
  { id: 2, name: 'Maria Silva', avatar: 'MS', email: 'maria@example.com', defaultAmount: 1800 },
  { id: 3, name: 'Juan Martinez', avatar: 'JM', email: 'juan@example.com', defaultAmount: 3200 },
  { id: 4, name: 'Ana Garcia', avatar: 'AG', email: 'ana@example.com', defaultAmount: 2100 },
  { id: 5, name: 'Luis Fernandez', avatar: 'LF', email: 'luis@example.com', defaultAmount: 2800 }
];

type Step = 1 | 2 | 3 | 4;

export function PayoutFlow() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedContractors, setSelectedContractors] = useState<number[]>([1, 2, 3]);
  const [amounts, setAmounts] = useState<Record<number, number>>({
    1: 2500,
    2: 1800,
    3: 3200
  });
  const [memo, setMemo] = useState('Monthly payment - June 2024');

  const toggleContractor = (id: number) => {
    if (selectedContractors.includes(id)) {
      setSelectedContractors(selectedContractors.filter(c => c !== id));
      const newAmounts = { ...amounts };
      delete newAmounts[id];
      setAmounts(newAmounts);
    } else {
      setSelectedContractors([...selectedContractors, id]);
      const contractor = allContractors.find(c => c.id === id);
      if (contractor) {
        setAmounts({ ...amounts, [id]: contractor.defaultAmount });
      }
    }
  };

  const updateAmount = (id: number, amount: number) => {
    setAmounts({ ...amounts, [id]: amount });
  };

  const getTotalAmount = () => {
    return Object.values(amounts).reduce((sum, amount) => sum + amount, 0);
  };

  const getFees = () => {
    return getTotalAmount() * 0.015; // 1.5% fee
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3, 4].map((step, index) => (
        <div key={step} className="flex items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            step === currentStep 
              ? 'bg-primary-600 text-white' 
              : step < currentStep 
                ? 'bg-success-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}>
            {step < currentStep ? <CheckCircle2 className="w-5 h-5" /> : step}
          </div>
          {index < 3 && (
            <div className={`w-24 h-0.5 ${
              step < currentStep ? 'bg-success-600' : 'bg-gray-200 dark:bg-gray-800'
            }`}></div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>

        <Card className="mb-6">
          {renderStepIndicator()}

          {/* Step 1: Select Contractors */}
          {currentStep === 1 && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-gray-900 dark:text-gray-100 mb-2">Select Contractors</h2>
                <p className="text-gray-600 dark:text-gray-400">Choose who you want to pay</p>
              </div>

              <div className="space-y-2">
                {allContractors.map((contractor) => (
                  <button
                    key={contractor.id}
                    onClick={() => toggleContractor(contractor.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                      selectedContractors.includes(contractor.id)
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedContractors.includes(contractor.id)
                        ? 'border-primary-600 bg-primary-600'
                        : 'border-gray-300 dark:border-gray-700'
                    }`}>
                      {selectedContractors.includes(contractor.id) && (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                      <span className="text-white">{contractor.avatar}</span>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-gray-900 dark:text-gray-100">{contractor.name}</div>
                      <div className="text-gray-600 dark:text-gray-400">{contractor.email}</div>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Default: ${contractor.defaultAmount.toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-6 flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-800">
                <div className="text-gray-600 dark:text-gray-400">
                  {selectedContractors.length} contractor{selectedContractors.length !== 1 ? 's' : ''} selected
                </div>
                <Button 
                  variant="primary" 
                  size="md"
                  disabled={selectedContractors.length === 0}
                  onClick={() => setCurrentStep(2)}
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Enter Amounts */}
          {currentStep === 2 && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-gray-900 dark:text-gray-100 mb-2">Enter Amounts</h2>
                <p className="text-gray-600 dark:text-gray-400">Specify payment amounts for each contractor</p>
              </div>

              <div className="space-y-4">
                {selectedContractors.map((contractorId) => {
                  const contractor = allContractors.find(c => c.id === contractorId)!;
                  return (
                    <div key={contractorId} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                        <span className="text-white">{contractor.avatar}</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-gray-900 dark:text-gray-100 mb-1">{contractor.name}</div>
                        <div className="text-gray-600 dark:text-gray-400">{contractor.email}</div>
                      </div>
                      <div className="w-48">
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="number"
                            value={amounts[contractorId]}
                            onChange={(e) => updateAmount(contractorId, parseFloat(e.target.value) || 0)}
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-800">
                <Button variant="ghost" size="md" onClick={() => setCurrentStep(1)}>
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-gray-600 dark:text-gray-400">Total Amount</div>
                    <div className="text-gray-900 dark:text-gray-100">${getTotalAmount().toLocaleString()}</div>
                  </div>
                  <Button variant="primary" size="md" onClick={() => setCurrentStep(3)}>
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Add Memo */}
          {currentStep === 3 && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-gray-900 dark:text-gray-100 mb-2">Add Memo (Optional)</h2>
                <p className="text-gray-600 dark:text-gray-400">Add a note that will be visible to contractors</p>
              </div>

              <div className="mb-6">
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="E.g., Monthly payment - June 2024"
                  className="w-full h-32 px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="mt-6 flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-800">
                <Button variant="ghost" size="md" onClick={() => setCurrentStep(2)}>
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button variant="primary" size="md" onClick={() => setCurrentStep(4)}>
                  Review Payment
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Review & Confirm */}
          {currentStep === 4 && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-gray-900 dark:text-gray-100 mb-2">Review & Confirm</h2>
                <p className="text-gray-600 dark:text-gray-400">Double-check the details before sending</p>
              </div>

              <div className="space-y-6">
                {/* Payment Summary */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h3 className="text-gray-900 dark:text-gray-100 mb-4">Payment Summary</h3>
                  <div className="space-y-3">
                    {selectedContractors.map((contractorId) => {
                      const contractor = allContractors.find(c => c.id === contractorId)!;
                      return (
                        <div key={contractorId} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm">{contractor.avatar}</span>
                            </div>
                            <span className="text-gray-900 dark:text-gray-100">{contractor.name}</span>
                          </div>
                          <span className="text-gray-900 dark:text-gray-100">${amounts[contractorId].toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Memo */}
                {memo && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                    <h3 className="text-gray-900 dark:text-gray-100 mb-2">Memo</h3>
                    <p className="text-gray-600 dark:text-gray-400">{memo}</p>
                  </div>
                )}

                {/* Cost Breakdown */}
                <div className="bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded-lg p-6">
                  <h3 className="text-gray-900 dark:text-gray-100 mb-4">Cost Breakdown</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                      <span className="text-gray-900 dark:text-gray-100">${getTotalAmount().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Platform Fee (1.5%)</span>
                      <span className="text-gray-900 dark:text-gray-100">${getFees().toFixed(2)}</span>
                    </div>
                    <div className="pt-2 border-t border-primary-200 dark:border-primary-800 flex justify-between">
                      <span className="text-gray-900 dark:text-gray-100">Total</span>
                      <span className="text-gray-900 dark:text-gray-100">${(getTotalAmount() + getFees()).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-800">
                <Button variant="ghost" size="md" onClick={() => setCurrentStep(3)}>
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button variant="primary" size="md">
                  Confirm & Send Payment
                  <CheckCircle2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
