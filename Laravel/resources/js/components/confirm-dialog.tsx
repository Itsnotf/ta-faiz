import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { type ReactNode } from 'react';

interface ConfirmDialogProps {
    title?: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => void;
    trigger?: ReactNode;
    disabled?: boolean;
}

export function ConfirmDialog({
    title = 'Yakin ingin menghapus?',
    description,
    confirmLabel = 'Ya, Hapus',
    onConfirm,
    trigger,
    disabled = false,
}: ConfirmDialogProps) {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                {trigger ?? (
                    <Button
                        variant="outline"
                        size="sm"
                        className="hover:bg-red-50 hover:text-red-600"
                        disabled={disabled}
                    >
                        <Trash2 className="size-3.5" />
                    </Button>
                )}
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
                    >
                        {confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
