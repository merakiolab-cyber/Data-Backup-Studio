import { History } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { Page } from '@/components/Page';

export function HistoryPage() {
  return (
    <Page title="Historie" description="Proběhlé zálohy, jejich výsledky a chyby.">
      <EmptyState
        icon={<History size={32} />}
        title="Zatím neproběhla žádná záloha"
        description="Po prvním spuštění úlohy tu uvidíš, co se zkopírovalo, aktualizovalo nebo smazalo."
      />
    </Page>
  );
}
