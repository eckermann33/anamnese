import { useCallback, useEffect, useRef, useState } from 'react';
import { produce, type Draft } from 'immer';
import type { Table } from 'dexie';

export type SaveState = 'salvo' | 'salvando' | 'erro';

/**
 * Edita um registro do IndexedDB com salvamento automático:
 * a tela muda na hora e o banco é gravado ~400 ms depois da última
 * alteração; ao ocultar o app, sair da tela ou fechar, grava na hora.
 *
 *   const { record, update, saveState } = useAutosave(db.evolutions, id);
 *   update((d) => { d.plan = 'Manter ATB'; });
 */
export function useAutosave<T extends { id: string; updatedAt: number }, TInsert>(table: Table<T, string, TInsert>, id: string | undefined) {
  const [record, setRecord] = useState<T | null | undefined>(undefined); // undefined = carregando; null = não existe
  const [saveState, setSaveState] = useState<SaveState>('salvo');
  const pending = useRef<T | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    setRecord(undefined);
    if (!id) {
      setRecord(null);
      return;
    }
    table.get(id).then((r) => alive && setRecord(r ?? null));
    return () => {
      alive = false;
    };
  }, [table, id]);

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    const next = pending.current;
    pending.current = null;
    if (!next) return;
    try {
      // o registro completo também é um registro válido para inserção
      await table.put(next as unknown as TInsert);
      setSaveState('salvo');
    } catch {
      setSaveState('erro');
    }
  }, [table]);

  const update = useCallback(
    (fn: (draft: Draft<T>) => void) => {
      setRecord((current) => {
        if (!current) return current;
        const next = produce(current, (d) => {
          fn(d);
          (d as { updatedAt: number }).updatedAt = Date.now();
        });
        pending.current = next;
        return next;
      });
      setSaveState('salvando');
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), 400);
    },
    [flush],
  );

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    const onPageHide = () => void flush();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
      void flush();
    };
  }, [flush]);

  return { record, update, saveState, flush };
}
