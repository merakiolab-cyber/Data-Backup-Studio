import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { fmt, useT } from '@/lib/i18n';

interface RemoveVolumeDialogProps {
  open: boolean;
  name: string;
  pending: boolean;
  error: Error | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function RemoveVolumeDialog({
  open,
  name,
  pending,
  error,
  onConfirm,
  onClose,
}: RemoveVolumeDialogProps) {
  const { t } = useT();
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{fmt(t.volumes.removeTitle, { name })}</DialogTitle>
      <DialogContent>
        <DialogContentText>{t.volumes.removeBody}</DialogContentText>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error.message}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{t.common.cancel}</Button>
        <Button color="error" variant="contained" onClick={onConfirm} loading={pending}>
          {t.volumes.removeAction}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
