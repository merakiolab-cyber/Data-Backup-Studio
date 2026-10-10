import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { ArrowLeft, Folder, FolderOpen, FolderSearch, HardDrive, Save } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { stagger } from '@/app/theme/motion';
import { EmptyState } from '@/components/EmptyState';
import { IconBubble } from '@/components/IconBubble';
import { Page } from '@/components/Page';
import { useVolumes } from '@/features/volumes/api';
import type { JobId, LocatedFolder, RegisteredVolumeView } from '@/lib/bindings';
import { driveLabel } from '@/lib/format';
import { pickFolder, useJobs, useSaveJob } from './api';
import { ExcludesField } from './components/ExcludesField';
import { FormBlock } from './components/FormBlock';
import { ModePicker } from './components/ModePicker';
import {
  emptyForm,
  formFromJob,
  type JobForm,
  MAX_NAME_LENGTH,
  toInput,
  withSource,
} from './jobForm';
import { displayLocation } from './labels';

export function JobEditorPage() {
  const { id } = useParams();
  const jobs = useJobs();
  const navigate = useNavigate();
  const back = (
    <Tooltip title="Zpět na úlohy">
      <IconButton aria-label="Zpět na úlohy" onClick={() => navigate('/ulohy')}>
        <ArrowLeft size={20} />
      </IconButton>
    </Tooltip>
  );

  if (!id) {
    return (
      <Page title="Nová úloha" description="Nastav jednou, pak už jen spouštěj." actions={back}>
        <JobEditor jobId={null} initial={emptyForm()} />
      </Page>
    );
  }

  const view = jobs.data?.find((v) => v.job.id === id);
  return (
    <Page
      title={view?.job.name ?? 'Úprava úlohy'}
      description="Změny se projeví při příštím spuštění."
      actions={back}
    >
      {jobs.isPending ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress aria-label="Načítám úlohu" />
        </Box>
      ) : view ? (
        <JobEditor key={id} jobId={id} initial={formFromJob(view)} />
      ) : (
        <EmptyState
          icon={<FolderSearch size={32} />}
          title="Úloha neexistuje"
          description="Mohla být mezitím smazaná."
          action={
            <Button component={Link} to="/ulohy" variant="contained">
              Zpět na úlohy
            </Button>
          }
        />
      )}
    </Page>
  );
}

function JobEditor({ jobId, initial }: { jobId: JobId | null; initial: JobForm }) {
  const navigate = useNavigate();
  const volumes = useVolumes();
  const save = useSaveJob();
  const [form, setForm] = useState(initial);
  const [pickError, setPickError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const targets = volumes.data?.registered ?? [];
  const target = targets.find((t) => t.volume.id === form.targetVolumeId);
  const input = toInput(form);

  const pick = async (apply: (folder: LocatedFolder) => void, defaultPath?: string) => {
    setPickError(null);
    setPicking(true);
    try {
      const folder = await pickFolder(defaultPath);
      if (folder) {
        apply(folder);
      }
    } catch (error) {
      setPickError(error instanceof Error ? error.message : String(error));
    } finally {
      setPicking(false);
    }
  };

  const pickSource = () => pick((folder) => setForm((f) => withSource(f, folder)));

  const pickTarget = () =>
    target?.live &&
    pick((folder) => {
      if (folder.targetId !== target.volume.id) {
        setPickError(`Vybraná složka není na disku „${target.volume.name}“.`);
      } else {
        setForm((f) => ({ ...f, targetRelPath: folder.relPath }));
      }
    }, target.live.mountPoint);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (input && !save.isPending) {
      save.mutate({ id: jobId, input }, { onSuccess: () => navigate('/ulohy') });
    }
  };

  return (
    <Box
      component="form"
      noValidate
      onSubmit={handleSubmit}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 820, ...stagger(60) }}
    >
      <FormBlock step={1} title="Co zálohovat" description="Složka, kterou chceš mít zálohovanou.">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <IconBubble size={56} tone="muted">
            {form.source ? <Folder size={24} /> : <FolderOpen size={24} />}
          </IconBubble>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            {form.source ? (
              <>
                <Typography variant="caption" color="text.secondary" component="p">
                  {form.source.volumeName}
                </Typography>
                <Typography variant="subtitle1" sx={{ wordBreak: 'break-all' }}>
                  {displayLocation(form.source.relPath, form.source.path)}
                </Typography>
              </>
            ) : (
              <Typography color="text.secondary">Zatím není vybraná žádná složka.</Typography>
            )}
          </Box>
          <Button
            variant={form.source ? 'outlined' : 'contained'}
            startIcon={<FolderSearch size={18} />}
            onClick={pickSource}
            disabled={picking}
          >
            {form.source ? 'Změnit' : 'Vybrat složku'}
          </Button>
        </Box>
      </FormBlock>

      <FormBlock
        step={2}
        title="Kam"
        description="Registrovaný disk a složka na něm. Písmeno disku si aplikace dohledá sama."
      >
        {targets.length === 0 && !volumes.isPending ? (
          <Alert
            severity="info"
            action={
              <Button component={Link} to="/disky" size="small">
                Disky
              </Button>
            }
          >
            Nejdřív zaregistruj cílový disk.
          </Alert>
        ) : (
          <Box
            sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '280px 1fr' }, gap: 2 }}
          >
            <TextField
              select
              label="Disk"
              value={form.targetVolumeId ?? ''}
              onChange={(event) => setForm((f) => ({ ...f, targetVolumeId: event.target.value }))}
            >
              {targets.map((t) => (
                <MenuItem key={t.volume.id} value={t.volume.id}>
                  <HardDrive size={16} style={{ marginRight: 8, flexShrink: 0 }} />
                  {t.volume.name}
                  <Typography
                    component="span"
                    variant="body2"
                    color="text.secondary"
                    sx={{ ml: 1 }}
                  >
                    {targetState(t)}
                  </Typography>
                </MenuItem>
              ))}
            </TextField>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <TextField
                fullWidth
                label="Složka na disku"
                value={form.targetRelPath}
                onChange={(event) => setForm((f) => ({ ...f, targetRelPath: event.target.value }))}
                slotProps={{
                  input: {
                    startAdornment: target?.live ? (
                      <InputAdornment position="start">
                        {driveLabel(target.live.mountPoint)}\
                      </InputAdornment>
                    ) : undefined,
                  },
                }}
                helperText="Složka se při první záloze vytvoří."
              />
              <Tooltip title={target?.live ? 'Vybrat existující složku' : 'Disk není připojený'}>
                <span>
                  <IconButton
                    aria-label="Vybrat složku na cílovém disku"
                    onClick={pickTarget}
                    disabled={!target?.live || picking}
                    sx={{ mt: '6px' }}
                  >
                    <FolderSearch size={20} />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Box>
        )}
      </FormBlock>

      <FormBlock step={3} title="Jak" description="Režim můžeš kdykoli změnit.">
        <ModePicker value={form.mode} onChange={(mode) => setForm((f) => ({ ...f, mode }))} />
      </FormBlock>

      <FormBlock
        step={4}
        title="Co vynechat"
        description="Soubory a složky, které se zálohovat nemají. Nepovinné."
      >
        <ExcludesField
          value={form.excludes}
          onChange={(excludes) => setForm((f) => ({ ...f, excludes }))}
        />
      </FormBlock>

      <FormBlock
        step={5}
        title="Název"
        description="Podle názvu úlohu poznáš v přehledu a historii."
      >
        <TextField
          fullWidth
          label="Název úlohy"
          value={form.name}
          onChange={(event) =>
            setForm((f) => ({ ...f, name: event.target.value, nameTouched: true }))
          }
          error={form.name.trim().length > MAX_NAME_LENGTH}
          helperText={`${form.name.trim().length}/${MAX_NAME_LENGTH} znaků`}
        />
      </FormBlock>

      {(pickError ?? save.error) && (
        <Alert severity="error">{pickError ?? save.error?.message}</Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, pt: 1 }}>
        <Button onClick={() => navigate('/ulohy')}>Zrušit</Button>
        <Button
          type="submit"
          variant="contained"
          startIcon={<Save size={18} />}
          disabled={!input}
          loading={save.isPending}
        >
          {jobId ? 'Uložit změny' : 'Vytvořit úlohu'}
        </Button>
      </Box>
    </Box>
  );
}

function targetState({ status, live }: RegisteredVolumeView): string {
  if (status.state === 'connected' && live) {
    return driveLabel(live.mountPoint);
  }
  return status.state === 'needsConfirmation' ? 'potřebuje ověřit' : 'nepřipojený';
}
