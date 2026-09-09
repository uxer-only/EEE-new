import { useEffect, useState } from 'react';
import { Trash } from 'phosphor-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export const ConfirmDeleteModal = ({ open, onClose, onConfirm, title, description, confirmWord, confirmLabel = 'Delete permanently', busy = false }) => {
  const [typed, setTyped] = useState('');
  useEffect(() => { if (!open) setTyped(''); }, [open]);
  const matches = typed.trim() === (confirmWord || '').trim() && typed.trim() !== '';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !busy) onClose(); }}>
      <DialogContent className="dashboard-light max-w-md bg-white border-[#B91C1C]/40 text-[#000000]" data-testid="confirm-delete-modal">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full border border-[#B91C1C] flex items-center justify-center shrink-0">
              <Trash size={18} className="text-[#B91C1C]" />
            </div>
            <DialogTitle className="text-xl text-[#B91C1C] font-bold">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-[#000000] leading-relaxed">{description}</DialogDescription>
        </DialogHeader>
        <div className="mt-2">
          <label className="block text-sm text-[#000000] mb-2">
            Type <span className="font-semibold select-all">{confirmWord}</span> to confirm
          </label>
          <input
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && matches && !busy) onConfirm(); }}
            placeholder={confirmWord}
            className="input-premium w-full"
            data-testid="confirm-delete-input"
          />
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button type="button" onClick={onClose} disabled={busy} className="btn-secondary" data-testid="confirm-delete-cancel">Cancel</button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!matches || busy}
            className="px-5 py-3 bg-[#B91C1C] text-white text-sm uppercase tracking-wider hover:bg-[#991B1B] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="confirm-delete-submit"
          >
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmDeleteModal;
