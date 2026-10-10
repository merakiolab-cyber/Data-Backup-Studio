import HistoryRounded from '@mui/icons-material/HistoryRounded';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';

export function HistoryPage() {
  return (
    <>
      <PageHeader title="Historie" description="Proběhlé zálohy, jejich výsledky a chyby." />
      <EmptyState
        icon={<HistoryRounded />}
        title="Zatím neproběhla žádná záloha"
        description="Po prvním spuštění úlohy tu uvidíš, co se zkopírovalo, aktualizovalo nebo smazalo."
      />
    </>
  );
}
