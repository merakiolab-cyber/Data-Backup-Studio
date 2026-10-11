import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import { type FormEvent, useEffect, useState } from 'react';
import { useT } from '@/lib/i18n';
import { MAX_NAME_LENGTH } from '../jobForm';

export function GroupNameDialog({
  open,
  title,
  initial = '',
  confirmLabel,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  initial?: string;
  confirmLabel: string;
  pending: boolean;
  error: Error | null;
  onConfirm: (name: string) => void;
  onClose: () => void;
}) {
  const { t } = useT();
  const [name, setName] = useState(initial);

  useEffect(() => {
    if (open) {
      setName(initial);
    }
  }, [open, initial]);

  const trimmed = name.trim();
  const invalid = trimmed.length === 0 || trimmed.length > MAX_NAME_LENGTH;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!invalid) {
      onConfirm(trimmed);
    }
  };

  return (
    <Dialog open={open} onClose={pending ? undefined : onClose} fullWidth maxWidth="xs">
      <form onSubmit={submit}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error.message}</Alert>}
          <TextField
            autoFocus
            fullWidth
            label={t.jobs.groupName}
            value={name}
            onChange={(event) => setName(event.target.value)}
            helperText={t.jobs.groupNameHint}
            error={name.trim().length > MAX_NAME_LENGTH}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={pending}>
            {t.common.cancel}
          </Button>
          <Button type="submit" variant="contained" disabled={invalid || pending}>
            {confirmLabel}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
