'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/store/store';
import MainLayout from '@/components/MainLayout';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface CompetitorSnapshot {
  date: string;
  subclusterResults: {
    subclusterId: string;
    subclusterName: string;
    queriesCount: number;
    filteredCount: number;
    totalImpressions: number;
  }[];
}

interface CompetitorGroup {
  id: string;
  name: string;
  subclusters: string[];
  snapshots: CompetitorSnapshot[];
  lastUpdated: string | null;
}

export default function CompetitorsPage() {
  const { clusters } = useStore();
  const [groups, setGroups] = useState<CompetitorGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedSubclusters, setSelectedSubclusters] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  // Получить все подкластеры
  const allSubclusters = clusters.flatMap(cluster =>
    cluster.types.map(type => ({
      id: type.id,
      name: type.name,
      clusterName: cluster.name,
    }))
  );

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    // Автоматически выбираем первую группу если она есть
    if (groups.length > 0 && !selectedGroup) {
      setSelectedGroup(groups[0].id);
    }
  }, [groups, selectedGroup]);

  const loadGroups = async () => {
    try {
      const response = await fetch('/api/competitors');
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error('Error loading competitor groups:', error);
    }
  };

  const createGroup = async () => {
    if (!newGroupName.trim() || selectedSubclusters.length === 0) {
      alert('Укажите название группы и выберите подкластеры');
      return;
    }

    try {
      const response = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: newGroupName.trim(),
          subclusters: selectedSubclusters,
        }),
      });

      if (response.ok) {
        await loadGroups();
        setNewGroupName('');
        setSelectedSubclusters([]);
        setIsCreating(false);
      }
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Ошибка при создании группы');
    }
  };

  const updateGroup = async (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    if (!confirm(`Обновить подкластеры группы "${group.name}"?\nЭто обновит данные моделей для ${group.subclusters.length} подкластер(ов).`)) {
      return;
    }

    setIsUpdating(true);
    try {
      // Получить конфигурации подкластеров из localStorage
      const saved = localStorage.getItem('subclusterConfigs');
      if (!saved) {
        alert('Нет настроенных моделей для подкластеров');
        setIsUpdating(false);
        return;
      }

      const allConfigs = JSON.parse(saved);
      
      // Фильтруем только подкластеры из этой группы
      const groupConfigs = allConfigs.filter((c: any) => 
        group.subclusters.includes(c.subclusterId) && c.models && c.models.length > 0
      );

      if (groupConfigs.length === 0) {
        alert('Нет настроенных моделей для подкластеров этой группы');
        setIsUpdating(false);
        return;
      }

      // Вызываем batch-update для обновления данных моделей
      const updateResponse = await fetch('/api/batch-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configs: groupConfigs,
          clusters,
        }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json().catch(() => ({}));
        console.error('Batch update failed:', errorData);
        throw new Error(errorData.message || 'Ошибка при обновлении подкластеров');
      }

      const updateData = await updateResponse.json();
      console.log('Batch update results:', updateData);

      // Проверяем что хотя бы один подкластер обновился успешно
      const successCount = updateData.results?.filter((r: any) => r.status === 'success').length || 0;
      if (successCount === 0) {
        const errors = updateData.results?.map((r: any) => `${r.subclusterName}: ${r.error || 'неизвестная ошибка'}`).join('\n');
        throw new Error(`Не удалось обновить ни один подкластер:\n${errors}`);
      }

      // Даём время на сохранение файлов (batch-update пишет в subcluster-results.json)
      await new Promise(resolve => setTimeout(resolve, 500));

      // Теперь получаем обновленные данные из subcluster-results.json
      const statsResponse = await fetch('/api/subcluster-stats');
      if (!statsResponse.ok) throw new Error('Failed to fetch stats');
      
      const stats = await statsResponse.json();
      console.log('Stats after update:', stats);

      // Собрать данные по подкластерам группы
      const snapshotData = group.subclusters.map(subId => {
        const subcluster = allSubclusters.find(s => s.id === subId);
        const stat = stats[subId];
        return {
          subclusterId: subId,
          subclusterName: subcluster?.name || subId,
          queriesCount: stat?.queriesCount || 0,
          filteredCount: stat?.filteredCount || 0,
          totalImpressions: stat?.totalImpressions || 0,
        };
      });

      // Сохранить снимок
      const snapshotResponse = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          groupId,
          snapshotData,
        }),
      });

      if (snapshotResponse.ok) {
        await loadGroups();
        alert('Данные успешно обновлены!');
      }
    } catch (error) {
      console.error('Error updating group:', error);
      alert('Ошибка при обновлении группы: ' + (error instanceof Error ? error.message : 'Unknown'));
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteGroup = async (groupId: string) => {
    if (!confirm('Удалить группу конкурентов?')) return;

    try {
      const response = await fetch(`/api/competitors?id=${groupId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadGroups();
        if (selectedGroup === groupId) {
          setSelectedGroup(null);
        }
      }
    } catch (error) {
      console.error('Error deleting group:', error);
      alert('Ошибка при удалении группы');
    }
  };

  const toggleSubcluster = (subId: string) => {
    setSelectedSubclusters(prev =>
      prev.includes(subId)
        ? prev.filter(id => id !== subId)
        : [...prev, subId]
    );
  };

  const getDaysSinceUpdate = (lastUpdated: string | null) => {
    if (!lastUpdated) return null;
    const days = Math.floor((Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getChartData = (group: CompetitorGroup) => {
    const labels = group.snapshots.map(s => 
      new Date(s.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
    );

    const datasets = group.subclusters.map((subId, index) => {
      const subcluster = allSubclusters.find(s => s.id === subId);
      const colors = [
        '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
        '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'
      ];
      const color = colors[index % colors.length];

      const dataPoints = group.snapshots.map(snapshot => {
        const result = snapshot.subclusterResults.find(r => r.subclusterId === subId);
        return result?.filteredCount || 0;
      });

      return {
        label: subcluster?.name || subId,
        data: dataPoints,
        borderColor: color,
        backgroundColor: color + '20',
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7,
        borderWidth: 2,
      };
    });

    return { labels, datasets };
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        left: 10,
        right: 20,
        top: 10,
        bottom: 10,
      },
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: 'rgba(255, 255, 255, 0.9)',
          font: { size: 12 },
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: 'rgba(255, 255, 255, 1)',
        bodyColor: 'rgba(255, 255, 255, 0.9)',
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
        padding: 12,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        callbacks: {
          label: (context) => {
            const value = context.parsed.y ?? 0;
            const formatted = value >= 1000000 
              ? (value / 1000000).toFixed(1) + 'M'
              : value >= 1000
              ? (value / 1000).toFixed(0) + 'K'
              : value.toLocaleString('ru-RU');
            return `${context.dataset.label}: ${formatted} показов`;
          },
        },
      },
    },
    scales: {
      x: {
        offset: true,
        ticks: { 
          color: 'rgba(255, 255, 255, 0.7)',
          font: { size: 11 },
          padding: 8,
        },
        grid: { 
          color: 'rgba(255, 255, 255, 0.05)',
          offset: true,
        },
      },
      y: {
        beginAtZero: true,
        ticks: { 
          color: 'rgba(255, 255, 255, 0.7)',
          font: { size: 11 },
          padding: 8,
          callback: (value) => {
            const num = Number(value);
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
            return num.toLocaleString('ru-RU');
          },
        },
        grid: { 
          color: 'rgba(255, 255, 255, 0.05)',
        },
      },
    },
  };

  const selectedGroupData = groups.find(g => g.id === selectedGroup);

  return (
    <MainLayout>
      <div className="h-full overflow-auto p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-end mb-4">
            <button
              onClick={() => setIsCreating(true)}
              className="px-3 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
            >
              + Новая группа
            </button>
          </div>

          {/* График */}
          {selectedGroupData ? (
            <div className="bg-black/20 border border-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">{selectedGroupData.name}</h2>
                  <p className="text-xs text-white/40 mt-1">По охвату</p>
                </div>
                <button
                  onClick={() => updateGroup(selectedGroupData.id)}
                  disabled={isUpdating}
                  className="px-3 py-1.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors text-sm disabled:opacity-50"
                >
                  {isUpdating ? 'Обновление...' : 'Обновить данные'}
                </button>
              </div>

                  {selectedGroupData.snapshots.length > 0 ? (
                    <>
                      <div className="h-[450px]">
                        <Line data={getChartData(selectedGroupData)} options={chartOptions} />
                      </div>
                      {selectedGroupData.snapshots.length === 1 && (
                        <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                          <p className="text-xs text-yellow-400">
                            💡 Добавьте больше снимков данных, чтобы увидеть динамику изменений. Нажмите "Обновить данные" в разные дни.
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="h-[450px] flex items-center justify-center">
                      <p className="text-white/30 text-sm">Нет данных для отображения. Нажмите "Обновить данные".</p>
                    </div>
                  )}

                  {/* Подкластеры в группе */}
                  <div className="mt-4">
                    <h3 className="text-xs font-medium text-white/40 mb-2">Подкластеры:</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedGroupData.subclusters.map(subId => {
                        const sub = allSubclusters.find(s => s.id === subId);
                        return (
                          <div
                            key={subId}
                            className="px-2 py-1 bg-white/5 border border-white/5 rounded-lg text-[10px] text-white/60"
                          >
                            {sub?.name || subId}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-black/20 border border-white/5 rounded-xl p-6 h-full flex items-center justify-center min-h-[500px]">
                  <p className="text-white/30 text-sm">Создайте группу конкурентов</p>
                </div>
              )}
        </div>

        {/* Модальное окно создания группы */}
        {isCreating && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <h2 className="text-lg font-semibold text-white mb-4">Новая группа конкурентов</h2>
              
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Название группы"
                className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-blue-500/50 mb-4"
              />

              <div className="mb-4">
                <h3 className="text-xs font-medium text-white/40 mb-2">
                  Выберите подкластеры ({selectedSubclusters.length}):
                </h3>
                <div className="space-y-1 max-h-[400px] overflow-y-auto">
                  {allSubclusters.map(sub => (
                    <label
                      key={sub.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        selectedSubclusters.includes(sub.id)
                          ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
                          : 'bg-black/20 border border-white/5 hover:bg-black/30 text-white/60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSubclusters.includes(sub.id)}
                        onChange={() => toggleSubcluster(sub.id)}
                        className="accent-blue-500 w-3.5 h-3.5"
                      />
                      <span className="text-xs">{sub.name}</span>
                      <span className="text-[10px] text-white/30 ml-auto">{sub.clusterName}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={createGroup}
                  className="flex-1 px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
                >
                  Создать
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewGroupName('');
                    setSelectedSubclusters([]);
                  }}
                  className="px-4 py-2 bg-white/5 border border-white/10 text-white/60 rounded-lg hover:bg-white/10 transition-colors text-sm"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
