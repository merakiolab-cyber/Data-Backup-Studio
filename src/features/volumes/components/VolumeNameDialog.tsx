import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import { type FormEvent, type ReactNode, useState } from 'react';
import { useT } from '@/lib/i18n';

const MAX_NAME_LENGTH = 64;

interface VolumeNameDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  initialName: string;
  submitLabel: string;
  pending: boolean;
  error: Error | null;
  onSubmit: (name: string) => void;
  onClose: () => void;
}

export function VolumeNameDialog(props: VolumeNameDialogProps) {
  return (
    <Dialog open={props.open} onClose={props.onClose} fullWidth maxWidth="xs">
      {props.open && <VolumeNameForm {...props} />}
    </Dialog>
  );
}

function VolumeNameForm({
  title,
  description,
  initialName,
  submitLabel,
  pending,
  error,
  onSubmit,
  onClose,
}: VolumeNameDialogProps) {
  const { t } = useT();
  const [name, setName] = useState(initialName);
  const trimmed = name.trim();
  const valid = trimmed.length > 0 && trimmed.length <= MAX_NAME_LENGTH;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (valid && !pending) {
      onSubmit(trimmed);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>{description}</DialogContentText>
        <TextField
          autoFocus
          fullWidth
          label={t.volumes.volumeName}
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={name.length > 0 && !valid}
          helperText={`${trimmed.length}/${MAX_NAME_LENGTH} ${t.common.characters}`}
          slotProps={{ htmlInput: { maxLength: MAX_NAME_LENGTH + 10 } }}
        />
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error.message}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{t.common.cancel}</Button>
        <Button type="submit" variant="contained" disabled={!valid} loading={pending}>
          {submitLabel}
        </Button>
      </DialogActions>
    </form>
  );
}
