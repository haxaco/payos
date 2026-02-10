'use client';

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import { useApiClient } from "@/lib/api-client";
import { toast } from "sonner";
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
} from "@sly/ui";
import { Mandate } from "@sly/api-client";

interface EditMandateDialogProps {
    mandate: Mandate;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function EditMandateDialog({
    mandate,
    open,
    onOpenChange,
    onSuccess
}: EditMandateDialogProps) {
    const api = useApiClient();
    const queryClient = useQueryClient();

    // Initialize date from mandate or default to empty
    const initialDate = mandate.expiresAt
        ? new Date(mandate.expiresAt).toISOString().split('T')[0]
        : '';

    const [expiresAt, setExpiresAt] = useState(initialDate);
    const [authorizedAmount, setAuthorizedAmount] = useState(
        mandate.amount?.authorized?.toString() || ''
    );

    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!api) throw new Error("API client not initialized");

            const updateData: any = {
                metadata: mandate.metadata, // Keep existing metadata
            };

            if (expiresAt) {
                updateData.expiresAt = new Date(expiresAt).toISOString();
            }

            if (authorizedAmount && Number(authorizedAmount) > 0) {
                updateData.authorizedAmount = Number(authorizedAmount);
            }

            return api.ap2.update(mandate.id, updateData);
        },
        onSuccess: () => {
            toast.success("Mandate updated successfully");
            queryClient.invalidateQueries({ queryKey: ["mandate", mandate.id] });
            queryClient.invalidateQueries({ queryKey: ["ap2-mandates"] });
            onOpenChange(false);
            onSuccess?.();
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to update mandate");
        }
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Mandate</DialogTitle>
                    <DialogDescription>
                        Update the details for mandate {mandate.mandateId}.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="authorized-amount" className="text-right">
                            Limit ({mandate.amount?.currency || 'USDC'})
                        </Label>
                        <div className="col-span-3">
                            <Input
                                id="authorized-amount"
                                type="number"
                                min="0"
                                step="0.01"
                                value={authorizedAmount}
                                onChange={(e) => setAuthorizedAmount(e.target.value)}
                                placeholder="e.g. 500.00"
                                className="w-full"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Maximum amount the agent can spend
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="expires-at" className="text-right">
                            Expires At
                        </Label>
                        <div className="col-span-3">
                            <div className="relative">
                                <Input
                                    id="expires-at"
                                    type="date"
                                    value={expiresAt}
                                    onChange={(e) => setExpiresAt(e.target.value)}
                                    className="w-full"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Leave empty for no expiration
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
                        {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
