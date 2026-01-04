import { AccountContext } from '@/types/context';
import { Sparkles, ArrowRight } from 'lucide-react';

interface ActionsBarProps {
    actions: AccountContext['suggested_actions'];
}

export function ActionsBar({ actions }: ActionsBarProps) {
    if (!actions || actions.length === 0) return null;

    return (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 shadow-lg text-white">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                        <Sparkles className="w-5 h-5 text-yellow-300" />
                    </div>
                    <div>
                        <h3 className="font-bold">Suggested Actions</h3>
                        <p className="text-sm text-blue-100">
                            {actions.length} recommended step{actions.length !== 1 ? 's' : ''} for this account
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                    {actions.map((action, idx) => (
                        <button
                            key={idx}
                            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all text-sm font-medium whitespace-nowrap"
                        >
                            {action.description}
                            <ArrowRight className="w-4 h-4 opacity-70" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
