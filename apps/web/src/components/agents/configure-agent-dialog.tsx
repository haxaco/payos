'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@sly/ui';
import type { Agent, AgentLimits } from '@sly/api-client';

interface ConfigureAgentDialogProps {
  agent: Agent;
  limits: AgentLimits | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ConfigureAgentDialog({
  agent,
  limits,
  open,
  onOpenChange,
  onSuccess,
}: ConfigureAgentDialogProps) {
  const api = useApiClient();
  const queryClient = useQueryClient();

  const [name, setName] = useState(agent.name || '');
  const [description, setDescription] = useState(agent.description || '');
  const [dailyLimit, setDailyLimit] = useState(
    limits?.limits?.daily?.toString() || ''
  );
  const [monthlyLimit, setMonthlyLimit] = useState(
    limits?.limits?.monthly?.toString() || ''
  );
  const [perTxLimit, setPerTxLimit] = useState(
    limits?.limits?.perTransaction?.toString() || ''
  );

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!api) throw new Error('API client not initialized');

      const updateData: Record<string, any> = {};

      if (name && name !== agent.name) updateData.name = name;
      if (description !== (agent.description || ''))
        updateData.description = description || null;
      if (dailyLimit && Number(dailyLimit) > 0)
        updateData.dailyLimit = Number(dailyLimit);
      if (monthlyLimit && Number(monthlyLimit) > 0)
        updateData.monthlyLimit = Number(monthlyLimit);
      if (perTxLimit && Number(perTxLimit) > 0)
        updateData.perTransactionLimit = Number(perTxLimit);

      return api.agents.update(agent.id, updateData);
    },
    onSuccess: () => {
      toast.success('Agent configuration updated');
      queryClient.invalidateQueries({ queryKey: ['agent', agent.id] });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update agent');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Configure Agent</DialogTitle>
          <DialogDescription>
            Update settings for {agent.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="agent-name" className="text-right">
              Name
            </Label>
            <div className="col-span-3">
              <Input
                id="agent-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Agent name"
                className="w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="agent-desc" className="text-right pt-2">
              Description
            </Label>
            <div className="col-span-3">
              <textarea
                id="agent-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this agent do?"
                rows={2}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>
          <div className="border-t pt-4 mt-1">
            <p className="text-sm font-medium text-muted-foreground mb-3 px-1">Spending Limits</p>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="daily-limit" className="text-right">
              Daily ($)
            </Label>
            <div className="col-span-3">
              <Input
                id="daily-limit"
                type="number"
                min="0"
                step="1"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
                placeholder="e.g. 1000"
                className="w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="monthly-limit" className="text-right">
              Monthly ($)
            </Label>
            <div className="col-span-3">
              <Input
                id="monthly-limit"
                type="number"
                min="0"
                step="1"
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="per-tx-limit" className="text-right">
              Per-Tx ($)
            </Label>
            <div className="col-span-3">
              <Input
                id="per-tx-limit"
                type="number"
                min="0"
                step="0.01"
                value={perTxLimit}
                onChange={(e) => setPerTxLimit(e.target.value)}
                placeholder="e.g. 500"
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum amount per single transaction
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
