'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  sessions: {
    current: number;
    adjusted: number;
  };
  isConverting?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  sessions,
  isConverting = false,
}: ConfirmationModalProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="rounded-lg max-w-[450px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Balance Adjustment</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <div>
                Your balance will be reduced from{" "}
                <span className="font-semibold">{sessions.current} offseason sessions</span> to{" "}
                <span className="font-semibold">{sessions.adjusted} winter sessions</span>.
              </div>
              <div className="font-medium text-destructive">
                Last chance to change your mind!
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={isConverting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isConverting}>
            {isConverting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Converting...
              </>
            ) : (
              'Confirm Adjustment'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}