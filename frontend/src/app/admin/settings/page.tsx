'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Settings2, Bell, Database, Bot } from 'lucide-react';

type SettingsForm = {
  siteName: string;
  siteUrl: string;
  siteDescription: string;
  defaultCurrency: string;
  metricaToken: string;
  yandexMetrikaCounterId: string;
  wordstatToken: string;
  telegramBotToken: string;
  telegramChatId: string;
  telegramNotifications: boolean;
  feedUpdateNotification: boolean;
  errorNotification: boolean;
  autoSyncInterval: number;
  deepseekApiKey: string;
  deepseekModel: string;
};

const INITIAL_FORM: SettingsForm = {
  siteName: '',
  siteUrl: '',
  siteDescription: '',
  defaultCurrency: 'RUR',
  metricaToken: '',
  yandexMetrikaCounterId: '',
  wordstatToken: '',
  telegramBotToken: '',
  telegramChatId: '',
  telegramNotifications: false,
  feedUpdateNotification: true,
  errorNotification: true,
  autoSyncInterval: 3600,
  deepseekApiKey: '',
  deepseekModel: 'deepseek-reasoner',
};

function Block({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[22px] border border-[var(--border-color)] bg-[var(--bg-secondary)]/70 backdrop-blur-sm p-4 sm:p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-white/15 to-white/5 border border-white/20 flex items-center justify-center text-[var(--text-primary)]">
          {icon}
        </span>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex w-[48px] h-[28px] rounded-full transition-colors ${checked ? 'bg-blue-500/70' : 'bg-white/20'}`}
    >
      <span className={`absolute top-[2px] left-[2px] w-6 h-6 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );
}

const inputClass = 'w-full h-11 rounded-[14px] border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/40';

export default function AdminSettingsPage() {
  const router = useRouter();
  const [form, setForm] = useState<SettingsForm>(INITIAL_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string>('');

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (role !== 'admin') {
      router.push('/');
      return;
    }

    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' });
        if (!res.ok) throw new Error(`Settings load failed: ${res.status}`);
        const data = await res.json();

        setForm({
          siteName: String(data.siteName || ''),
          siteUrl: String(data.siteUrl || ''),
          siteDescription: String(data.siteDescription || ''),
          defaultCurrency: String(data.defaultCurrency || 'RUR'),
          metricaToken: String(data.metricaToken || data.yandexMetrikaToken || ''),
          yandexMetrikaCounterId: String(data.yandexMetrikaCounterId || ''),
          wordstatToken: String(data.wordstatToken || ''),
          telegramBotToken: String(data.telegramBotToken || ''),
          telegramChatId: String(data.telegramChatId || ''),
          telegramNotifications: Boolean(data.telegramNotifications),
          feedUpdateNotification: data.feedUpdateNotification !== false,
          errorNotification: data.errorNotification !== false,
          autoSyncInterval: Number(data.autoSyncInterval || 3600),
          deepseekApiKey: String(data.deepseekApiKey || ''),
          deepseekModel: String(data.deepseekModel || 'deepseek-reasoner'),
        });
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadSettings();
  }, [router]);

  const hasTelegramConfigured = useMemo(() => Boolean(form.telegramBotToken && form.telegramChatId), [form.telegramBotToken, form.telegramChatId]);

  const setField = <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      const payload = {
        ...form,
        yandexMetrikaToken: form.metricaToken,
      };

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Save failed: ${res.status}`);
      }

      setSaveMessage('Сохранено в PostgreSQL');
      setTimeout(() => setSaveMessage(''), 2500);
    } catch (error) {
      console.error(error);
      setSaveMessage('Ошибка сохранения');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bg-primary)] text-[var(--text-secondary)]">
        Загрузка системных настроек...
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="sticky top-0 z-20 h-14 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/85 backdrop-blur-xl px-3 sm:px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/admin')}
            className="w-9 h-9 rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold">Админка · Системные настройки</span>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="h-9 px-3 rounded-xl bg-blue-500/80 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-60 inline-flex items-center gap-1.5"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto pb-24">
        <main className="max-w-[1200px] mx-auto p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <Block title="Основные" icon={<Settings2 className="w-4 h-4" />}>
            <Field label="Название сайта">
              <input className={inputClass} value={form.siteName} onChange={(e) => setField('siteName', e.target.value)} />
            </Field>
            <Field label="URL сайта">
              <input className={inputClass} value={form.siteUrl} onChange={(e) => setField('siteUrl', e.target.value)} placeholder="https://example.com" />
            </Field>
            <Field label="Описание">
              <textarea className={`${inputClass} h-24 py-2.5`} value={form.siteDescription} onChange={(e) => setField('siteDescription', e.target.value)} />
            </Field>
            <Field label="Валюта по умолчанию">
              <input className={inputClass} value={form.defaultCurrency} onChange={(e) => setField('defaultCurrency', e.target.value)} />
            </Field>
            <Field label="Интервал автосинхронизации (сек)">
              <input
                className={inputClass}
                type="number"
                min={60}
                value={form.autoSyncInterval}
                onChange={(e) => setField('autoSyncInterval', Math.max(60, Number(e.target.value || 60)))}
              />
            </Field>
          </Block>

          <Block title="Интеграции" icon={<Database className="w-4 h-4" />}>
            <Field label="Metrika token">
              <input className={inputClass} value={form.metricaToken} onChange={(e) => setField('metricaToken', e.target.value)} />
            </Field>
            <Field label="Metrika counter ID">
              <input className={inputClass} value={form.yandexMetrikaCounterId} onChange={(e) => setField('yandexMetrikaCounterId', e.target.value)} />
            </Field>
            <Field label="Wordstat token">
              <input className={inputClass} value={form.wordstatToken} onChange={(e) => setField('wordstatToken', e.target.value)} />
            </Field>
          </Block>

          <Block title="Telegram" icon={<Bell className="w-4 h-4" />}>
            <Field label="Bot token">
              <input className={inputClass} value={form.telegramBotToken} onChange={(e) => setField('telegramBotToken', e.target.value)} />
            </Field>
            <Field label="Chat ID">
              <input className={inputClass} value={form.telegramChatId} onChange={(e) => setField('telegramChatId', e.target.value)} />
            </Field>

            <div className="rounded-[14px] border border-[var(--border-color)] bg-[var(--bg-primary)] p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Уведомления Telegram</span>
                <Toggle checked={form.telegramNotifications} onChange={(v) => setField('telegramNotifications', v)} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Уведомлять об обновлении фидов</span>
                <Toggle checked={form.feedUpdateNotification} onChange={(v) => setField('feedUpdateNotification', v)} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Уведомлять об ошибках</span>
                <Toggle checked={form.errorNotification} onChange={(v) => setField('errorNotification', v)} />
              </div>
            </div>

            <p className={`text-xs ${hasTelegramConfigured ? 'text-green-500' : 'text-amber-500'}`}>
              {hasTelegramConfigured ? 'Telegram настроен' : 'Для Telegram нужны bot token и chat id'}
            </p>
          </Block>

          <Block title="AI" icon={<Bot className="w-4 h-4" />}>
            <Field label="DeepSeek API key">
              <input className={inputClass} value={form.deepseekApiKey} onChange={(e) => setField('deepseekApiKey', e.target.value)} />
            </Field>
            <Field label="Модель">
              <input className={inputClass} value={form.deepseekModel} onChange={(e) => setField('deepseekModel', e.target.value)} />
            </Field>
          </Block>
        </main>
      </div>

      {saveMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-sm shadow-lg">
          {saveMessage}
        </div>
      )}
    </div>
  );
}
