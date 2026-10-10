import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Plus } from 'lucide-react';
import { type KeyboardEvent, useState } from 'react';
import { suggestedExcludes } from '../labels';

export function ExcludesField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (excludes: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const add = (pattern: string) => {
    const trimmed = pattern.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      add(draft);
      setDraft('');
    }
  };

  const suggestions = suggestedExcludes.filter((s) => !value.includes(s));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField
        fullWidth
        label="Přidat vzor"
        placeholder="např. *.tmp nebo **/Cache/**"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          add(draft);
          setDraft('');
        }}
        helperText="Enter přidá vzor. * = cokoli v názvu, ** = libovolné podsložky."
      />
      {value.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {value.map((pattern) => (
            <Chip
              key={pattern}
              label={pattern}
              onDelete={() => onChange(value.filter((p) => p !== pattern))}
              sx={{ fontFamily: 'ui-monospace, Consolas, monospace' }}
            />
          ))}
        </Box>
      )}
      {suggestions.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
            Časté:
          </Typography>
          {suggestions.map((pattern) => (
            <Chip
              key={pattern}
              variant="outlined"
              size="small"
              icon={<Plus size={14} />}
              label={pattern}
              onClick={() => add(pattern)}
              sx={{ fontFamily: 'ui-monospace, Consolas, monospace' }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
