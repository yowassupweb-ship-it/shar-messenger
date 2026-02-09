'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { KeywordSearch, SearchOptions } from './KeywordSearch'
import { loadRegionsTree, getRegionNameById } from '@/lib/regions-utils'
import { Region } from '@/types/yandex-wordstat'

interface RegionData {
  region_id: number
  region_name: string
  search_volume: number
  competition?: number
  parent_id?: number
}

interface RegionNode extends RegionData {
  children: RegionNode[]
  expanded?: boolean
}

interface RegionsPanelProps {
  currentPhrase?: string
  onSearch?: (phrase: string, options: SearchOptions) => void
  onLoadRegions?: (phrase: string) => void
  loading?: boolean
  regionsData?: RegionData[]
}

export default function RegionsPanel({ 
  currentPhrase, 
  onSearch,
  onLoadRegions,
  loading = false,
  regionsData = []
}: RegionsPanelProps) {
  const [regions, setRegions] = useState<Region[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set())
  const isSearching = searchTerm.trim().length > 0

  // Загружаем дерево регионов при монтировании
  useEffect(() => {
    let mounted = true
    loadRegionsTree().then(data => {
      if (mounted) setRegions(data)
    })
    return () => { mounted = false }
  }, [])

  // Автозагрузка регионов при наличии фразы
  useEffect(() => {
    if (currentPhrase && !regionsData?.length && !loading && onLoadRegions) {
      console.log('Автозагрузка регионов для фразы:', currentPhrase)
      onLoadRegions(currentPhrase)
    }
  }, [currentPhrase, regionsData, loading, onLoadRegions])

  // Обогащаем данные названиями регионов с помощью useMemo
  const enrichedData = useMemo(() => {
    if (!regionsData || regionsData.length === 0) return []
    if (regions.length === 0) return regionsData

    return regionsData.map(region => {
      const regionInfo = regions.find(r => r.regionId === region.region_id)
      return {
        ...region,
        region_name: regionInfo?.regionName || getRegionNameById(region.region_id, regions),
        parent_id: regionInfo?.parentId
      }
    })
  }, [regionsData, regions])

  // Строим дерево регионов на основе enrichedData
  const buildRegionTree = (data: RegionData[]): RegionNode[] => {
    const regionMap = new Map<number, RegionNode>()
    const rootNodes: RegionNode[] = []

    // Создаем узлы
    data.forEach(region => {
      regionMap.set(region.region_id, {
        ...region,
        children: [],
        expanded: expandedNodes.has(region.region_id)
      })
    })

    // Строим дерево
    data.forEach(region => {
      const node = regionMap.get(region.region_id)!
      if (region.parent_id && regionMap.has(region.parent_id)) {
        const parent = regionMap.get(region.parent_id)!
        parent.children.push(node)
      } else {
        rootNodes.push(node)
      }
    })

    // Сортируем корневые узлы по объёму поиска (от большего к меньшему)
    rootNodes.sort((a, b) => b.search_volume - a.search_volume)
    
    // Рекурсивно сортируем детей
    const sortChildren = (node: RegionNode) => {
      if (node.children && node.children.length > 0) {
        node.children.sort((a, b) => b.search_volume - a.search_volume)
        node.children.forEach(sortChildren)
      }
    }
    rootNodes.forEach(sortChildren)

    return rootNodes
  }

  // Фильтрация с учетом поиска
  const filterRegions = (nodes: RegionNode[], searchTerm: string): RegionNode[] => {
    if (!searchTerm) return nodes

    const filtered: RegionNode[] = []
    
    nodes.forEach(node => {
      const matchesSearch = node.region_name.toLowerCase().includes(searchTerm.toLowerCase())
      const filteredChildren = filterRegions(node.children, searchTerm)
      
      if (matchesSearch || filteredChildren.length > 0) {
        filtered.push({
          ...node,
          children: filteredChildren
        })
      }
    })

    return filtered
  }

  const regionTree = buildRegionTree(enrichedData)
  const filteredTree = filterRegions(regionTree, searchTerm)
  const totalVolume = enrichedData.reduce((sum, r) => sum + r.search_volume, 0)

  // Подсветка совпадений
  const highlightText = (text: string, term: string) => {
    if (!term) return <>{text}</>
    const parts = text.split(new RegExp(`(${term})`, 'ig'))
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === term.toLowerCase() ? (
            <span key={i} style={{ background: 'rgba(250, 179, 135, 0.25)', color: 'var(--glass-yellow)', borderRadius: 4, padding: '0 2px' }}>{part}</span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    )
  }

  // Сервисы для массового разворачивания/сворачивания
  const collectAllIds = (nodes: RegionNode[], acc: Set<number> = new Set()): Set<number> => {
    nodes.forEach(n => {
      acc.add(n.region_id)
      if (n.children?.length) collectAllIds(n.children, acc)
    })
    return acc
  }

  const expandAll = () => {
    const allIds = collectAllIds(regionTree)
    setExpandedNodes(allIds)
  }

  const collapseAll = () => {
    setExpandedNodes(new Set())
  }

  const toggleNodeExpansion = (nodeId: number) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  // Рекурсивный компонент для отображения дерева
  const RegionTreeNode = ({ node, level = 0 }: { node: RegionNode; level?: number }) => {
    const hasChildren = node.children && node.children.length > 0
    const isExpanded = expandedNodes.has(node.region_id) || isSearching
    const indentWidth = level * 20
    const percentage = totalVolume > 0 ? (node.search_volume / totalVolume * 100) : 0

    return (
      <div>
        <div
          className="flex items-center py-2 px-3 hover:bg-opacity-10 cursor-pointer transition-colors rounded border-b"
          style={{ 
            backgroundColor: 'transparent',
            borderColor: 'var(--glass-border)',
            paddingLeft: `${indentWidth + 12}px`
          }}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleNodeExpansion(node.region_id)
              }}
              className="mr-2 p-0.5 hover:bg-white hover:bg-opacity-10 rounded transition-colors"
              style={{ color: 'var(--glass-text-secondary)' }}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          {!hasChildren && <div className="w-6" />}
          
          <div className="flex-1 flex items-center justify-between">
            <span style={{ 
              color: 'var(--glass-text-primary)',
              fontSize: level === 0 ? '0.95rem' : level === 1 ? '0.9rem' : '0.85rem',
              fontWeight: level === 0 ? 600 : level === 1 ? 500 : 400
            }}>
              {highlightText(node.region_name, searchTerm)}
            </span>
            
            <div className="flex items-center gap-6">
              <span className="font-mono text-sm" style={{ color: 'var(--glass-text-primary)' }}>
                {node.search_volume.toLocaleString('ru-RU')}
              </span>
              <span className="font-mono text-sm w-16 text-right" style={{ color: 'var(--glass-text-secondary)' }}>
                {percentage.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => (
              <RegionTreeNode key={child.region_id} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Search Interface */}
        {onSearch && (
          <KeywordSearch 
            onSearch={onSearch} 
            loading={loading} 
          />
        )}
        
        {/* Regions Results */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--glass-text-primary)' }}>
              Анализ по регионам
            </h2>
            
            <div className="flex items-center gap-3">
              {currentPhrase && (
                <div className="text-sm" style={{ color: 'var(--glass-text-secondary)' }}>
                  Фраза: <span style={{ color: 'var(--glass-text-primary)' }}>"{currentPhrase}"</span>
                </div>
              )}
              
              {currentPhrase && onLoadRegions && (
                <button
                  onClick={() => onLoadRegions(currentPhrase)}
                  disabled={loading}
                  className="glass-button px-3 py-1.5 text-sm"
                  style={{ opacity: loading ? 0.5 : 1 }}
                >
                  {loading ? 'Загрузка...' : 'Обновить'}
                </button>
              )}
            </div>
          </div>

          {regionsData && regionsData.length > 0 ? (
            <div>
              {/* Search input */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Поиск по регионам..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="glass-input w-full"
                />
              </div>

              {/* Expand/Collapse controls */}
              <div className="mb-3 flex gap-2">
                <button
                  className="glass-button px-3 py-1 text-sm"
                  onClick={expandAll}
                  disabled={isSearching}
                  title={isSearching ? 'Доступно при пустом поиске' : 'Развернуть всё'}
                >
                  Развернуть всё
                </button>
                <button
                  className="glass-button px-3 py-1 text-sm"
                  onClick={collapseAll}
                  disabled={isSearching}
                  title={isSearching ? 'Доступно при пустом поиске' : 'Свернуть всё'}
                >
                  Свернуть всё
                </button>
              </div>

              {/* Hierarchical region tree */}
              <div className="border rounded-lg overflow-y-auto" style={{ borderColor: 'var(--glass-border)', maxHeight: '600px' }}>
                <div className="flex items-center py-2 px-3 border-b sticky top-0 z-10" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'var(--glass-bg-card)' }}>
                  <div className="w-6"></div>
                  <div className="flex-1 flex items-center justify-between">
                    <span className="font-semibold text-sm" style={{ color: 'var(--glass-text-primary)' }}>Регион</span>
                    <div className="flex items-center gap-6">
                      <span className="font-semibold text-sm" style={{ color: 'var(--glass-text-primary)' }}>Объем поиска</span>
                      <span className="font-semibold text-sm w-16 text-right" style={{ color: 'var(--glass-text-primary)' }}>Доля, %</span>
                    </div>
                  </div>
                </div>
                
                {filteredTree.length > 0 ? (
                  filteredTree.map(node => (
                    <RegionTreeNode key={node.region_id} node={node} />
                  ))
                ) : (
                  <div className="p-3 text-center" style={{ color: 'var(--glass-text-tertiary)' }}>
                    {searchTerm ? 'Регионы не найдены' : 'Нет данных'}
                  </div>
                )}
              </div>
              
              {/* Summary */}
              <div className="mt-4 pt-4 border-t flex justify-between" style={{ borderColor: 'var(--glass-border)' }}>
                <span style={{ color: 'var(--glass-text-secondary)' }}>
                  Всего регионов: {enrichedData.length}
                </span>
                <span style={{ color: 'var(--glass-text-primary)' }}>
                  Общий объем: {totalVolume.toLocaleString('ru-RU')}
                </span>
              </div>
            </div>
          ) : currentPhrase ? (
            <div className="text-center py-12" style={{ color: 'var(--glass-text-secondary)' }}>
              {loading ? (
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p>Загружаем данные по регионам...</p>
                </div>
              ) : (
                <div>
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  <p>Данные по регионам недоступны для данного запроса</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12" style={{ color: 'var(--glass-text-secondary)' }}>
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p>Сначала выполните поиск</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}