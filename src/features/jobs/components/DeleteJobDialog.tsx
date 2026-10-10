import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

interface DeleteJobDialogProps {
  open: boolean;
  name: string;
  pending: boolean;
  error: Error | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteJobDialog({
  open,
  name,
  pending,
  error,
  onConfirm,
  onClose,
}: DeleteJobDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Smazat úlohu „{name}“?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Smaže se jen nastavení úlohy. Soubory ve zdroji i v záloze zůstanou beze změny.
        </DialogContentText>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error.message}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Zrušit</Button>
        <Button color="error" variant="contained" onClick={onConfirm} loading={pending}>
          Smazat
        </Button>
      </DialogActions>
    </Dialog>
  );
}
