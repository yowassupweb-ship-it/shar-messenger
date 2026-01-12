'use client';

import { useState } from 'react';
import { useStore } from '@/store/store';

export default function ClusterTree() {
  const { clusters, selectedCluster, selectedType, setSelectedCluster, setSelectedType } = useStore();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="py-2">
      <div className="px-4 py-2 text-xs text-dark-muted uppercase tracking-wider">
        Кластеры
      </div>
      
      {clusters.length === 0 ? (
        <div className="px-4 py-2 text-dark-muted text-sm">
          Нет данных
        </div>
      ) : (
        clusters.map((cluster) => (
          <div key={cluster.id}>
            {/* Cluster header */}
            <div
              className={`tree-node flex items-center px-4 py-1.5 ${
                selectedCluster === cluster.id ? 'tree-node-selected' : ''
              }`}
              onClick={() => {
                toggleExpand(cluster.id);
                setSelectedCluster(cluster.id);
              }}
            >
              <span className="w-4 text-center mr-1 text-dark-muted">
                {expanded[cluster.id] ? '-' : '+'}
              </span>
              <span className="truncate">{cluster.name}</span>
              <span className="ml-auto text-dark-muted text-xs">
                {cluster.types.length}
              </span>
            </div>
            
            {/* Cluster types */}
            {expanded[cluster.id] && (
              <div className="ml-5">
                {cluster.types.map((type) => (
                  <div
                    key={type.id}
                    className={`tree-node px-4 py-1 text-sm ${
                      selectedType === type.id ? 'tree-node-selected' : ''
                    }`}
                    onClick={() => setSelectedType(type.id)}
                  >
                    {type.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
