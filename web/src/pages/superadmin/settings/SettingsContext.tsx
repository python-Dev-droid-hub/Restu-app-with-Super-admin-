import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import axios from 'axios';
import { superAdminApi } from '../../../services/superAdminApi';
import { SECRET_MASK } from './constants';

function apiErrorMessage(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const msg = (e.response?.data as { message?: string })?.message;
    return msg || e.message || 'Request failed';
  }
  return e instanceof Error ? e.message : 'Request failed';
}

type SectionsState = Record<string, Record<string, unknown>>;

type Ctx = {
  loading: boolean;
  sections: SectionsState;
  drafts: SectionsState;
  dirty: Set<string>;
  saving: string | null;
  toast: { type: 'success' | 'error'; message: string } | null;
  updateDraft: (saveKey: string, patch: Record<string, unknown>) => void;
  saveSection: (saveKey: string) => Promise<void>;
  saveAll: () => Promise<void>;
  discardSection: (saveKey: string) => void;
  clearToast: () => void;
  isDirty: (saveKey: string) => boolean;
};

const SettingsContext = createContext<Ctx | null>(null);

function jsonEqual(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<SectionsState>({});
  const [drafts, setDrafts] = useState<SectionsState>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<Ctx['toast']>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await superAdminApi.get('/settings/all');
      const data = res.data?.sections || {};
      setSections(data);
      setDrafts(JSON.parse(JSON.stringify(data)));
    } catch (e: unknown) {
      setToast({ type: 'error', message: apiErrorMessage(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(() => {
    const set = new Set<string>();
    for (const key of Object.keys(drafts)) {
      if (!jsonEqual(drafts[key], sections[key])) set.add(key);
    }
    return set;
  }, [drafts, sections]);

  const updateDraft = useCallback((saveKey: string, patch: Record<string, unknown>) => {
    setDrafts((prev) => ({
      ...prev,
      [saveKey]: { ...(prev[saveKey] || {}), ...patch },
    }));
  }, []);

  const discardSection = useCallback(
    (saveKey: string) => {
      setDrafts((prev) => ({
        ...prev,
        [saveKey]: JSON.parse(JSON.stringify(sections[saveKey] || {})),
      }));
    },
    [sections]
  );

  const buildPatch = (saveKey: string) => {
    const draft = drafts[saveKey] || {};
    const original = sections[saveKey] || {};
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(draft)) {
      if (jsonEqual(v, original[k])) continue;
      if (v === SECRET_MASK) continue;
      patch[k] = v;
    }
    return patch;
  };

  const saveSection = useCallback(
    async (saveKey: string) => {
      const patch = buildPatch(saveKey);
      if (!Object.keys(patch).length) return;
      setSaving(saveKey);
      try {
        const res: any = await superAdminApi.patch(`/settings/${saveKey}`, patch);
        const updated = res.data?.section || {};
        setSections((prev) => ({ ...prev, [saveKey]: updated }));
        setDrafts((prev) => ({ ...prev, [saveKey]: JSON.parse(JSON.stringify(updated)) }));
        setToast({ type: 'success', message: 'Section saved successfully' });
      } catch (e: unknown) {
        setToast({ type: 'error', message: apiErrorMessage(e) });
      } finally {
        setSaving(null);
      }
    },
    [drafts, sections]
  );

  const saveAll = useCallback(async () => {
    setSaving('all');
    try {
      for (const key of [...dirty]) {
        const patch: Record<string, unknown> = {};
        const draft = drafts[key] || {};
        const original = sections[key] || {};
        for (const [k, v] of Object.entries(draft)) {
          if (jsonEqual(v, original[k])) continue;
          if (v === SECRET_MASK) continue;
          patch[k] = v;
        }
        if (Object.keys(patch).length) {
          const res: any = await superAdminApi.patch(`/settings/${key}`, patch);
          const updated = res.data?.section || {};
          setSections((prev) => ({ ...prev, [key]: updated }));
          setDrafts((prev) => ({ ...prev, [key]: JSON.parse(JSON.stringify(updated)) }));
        }
      }
      setToast({ type: 'success', message: 'All changes saved' });
    } catch (e: unknown) {
      setToast({ type: 'error', message: apiErrorMessage(e) });
    } finally {
      setSaving(null);
    }
  }, [dirty, drafts, sections]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty.size > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const clearToast = useCallback(() => setToast(null), []);

  const value: Ctx = {
    loading,
    sections,
    drafts,
    dirty,
    saving,
    toast,
    updateDraft,
    saveSection,
    saveAll,
    discardSection,
    clearToast,
    isDirty: (k) => dirty.has(k),
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

export function useSectionDraft(saveKey: string) {
  const { drafts, updateDraft, sections } = useSettings();
  const data = drafts[saveKey] || sections[saveKey] || {};
  const set = (patch: Record<string, unknown>) => updateDraft(saveKey, patch);
  const setField = (key: string, value: unknown) => updateDraft(saveKey, { [key]: value });
  return { data, set, setField };
}
