'use client';

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    MoreHorizontal,
    Eye,
    Copy,
    Edit,
    Ban,
    MoreVertical,
    ChevronDown
} from "lucide-react";
import { useApiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@sly/ui";
import { Mandate } from "@sly/api-client";
import { EditMandateDialog } from "./edit-mandate-dialog";

interface MandateActionsMenuProps {
    mandate: Mandate;
    variant?: 'icon' | 'button' | 'row';
    showViewDetails?: boolean;
}

export function MandateActionsMenu({
    mandate,
    variant = 'icon',
    showViewDetails = true
}: MandateActionsMenuProps) {
    const router = useRouter();
    const api = useApiClient();
    const queryClient = useQueryClient();
    const [showEditDialog, setShowEditDialog] = useState(false);

    const cancelMutation = useMutation({
        mutationFn: async () => {
            if (!api) throw new Error("API client not initialized");
            return api.ap2.cancel(mandate.id);
        },
        onSuccess: () => {
            toast.success("Mandate cancelled");
            queryClient.invalidateQueries({ queryKey: ["mandate", mandate.id] });
            queryClient.invalidateQueries({ queryKey: ["ap2-mandates"] });
        },
        onError: () => {
            toast.error("Failed to cancel mandate");
        }
    });

    const isActive = mandate.status === 'active';

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    {variant === 'button' ? (
                        <Button variant="outline">
                            Actions
                            <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                        </Button>
                    )}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>

                    {showViewDetails && (
                        <DropdownMenuItem asChild>
                            <Link href={`/dashboard/agentic-payments/ap2/mandates/${mandate.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                            </Link>
                        </DropdownMenuItem>
                    )}

                    <DropdownMenuItem onClick={() => {
                        navigator.clipboard.writeText(mandate.id);
                        toast.success("Copied ID to clipboard");
                    }}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy ID
                    </DropdownMenuItem>

                    {isActive && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Mandate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => cancelMutation.mutate()}
                                className="text-destructive focus:text-destructive"
                            >
                                <Ban className="mr-2 h-4 w-4" />
                                Cancel Mandate
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <EditMandateDialog
                mandate={mandate}
                open={showEditDialog}
                onOpenChange={setShowEditDialog}
            />
        </>
    );
}
