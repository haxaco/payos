import { CreditCard, Plus } from 'lucide-react';

// Similar to Pending Items, Payment Methods seem to be missing from the core AccountContext interface I defined based on backend code.
// I'll define a mock prop type here or optional prop.

export function PaymentMethodsCard() {
    // Mock data for display
    const methods = [
        { id: '1', type: 'US Bank Account', last4: '4092', status: 'Active' },
        { id: '2', type: 'Card', last4: '8837', status: 'Expired' },
    ];

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Methods</h3>
                <button className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-3">
                {methods.map((method) => (
                    <div key={method.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-8 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center text-gray-500">
                                <CreditCard className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{method.type}</div>
                                <div className="text-xs text-gray-500">**** {method.last4}</div>
                            </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${method.status === 'Active'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                            {method.status}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
