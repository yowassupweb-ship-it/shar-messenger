'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, X } from 'lucide-react'
import { Region } from '@/types/yandex-wordstat'
import Modal from './Modal'

interface RegionFilterProps {
  regions: Region[]
  selectedRegions: number[]
  onRegionChange: (regions: number[]) => void
  loading?: boolean
}

interface RegionNode extends Region {
  children: RegionNode[]
  expanded?: boolean
}

export default function RegionFilter({ 
  regions, 
  selectedRegions, 
  onRegionChange, 
  loading = false 
}: RegionFilterProps) {
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set())
  const isSearching = searchTerm.trim().length > 0

  // Строим дерево регионов
  const buildRegionTree = (regions: Region[]): RegionNode[] => {
    const regionMap = new Map<number, RegionNode>()
    const rootNodes: RegionNode[] = []

    // Создаем узлы
    regions.forEach(region => {
      regionMap.set(region.regionId, {
        ...region,
        children: [],
        expanded: expandedNodes.has(region.regionId)
      })
    })

    // Строим дерево
    regions.forEach(region => {
      const node = regionMap.get(region.regionId)!
      if (region.parentId && regionMap.has(region.parentId)) {
        const parent = regionMap.get(region.parentId)!
        parent.children.push(node)
      } else {
        rootNodes.push(node)
      }
    })

    return rootNodes
  }

  // Фильтрация с учетом поиска
  const filterRegions = (nodes: RegionNode[], searchTerm: string): RegionNode[] => {
    if (!searchTerm) return nodes

    const filtered: RegionNode[] = []
    
    nodes.forEach(node => {
      const matchesSearch = node.regionName.toLowerCase().includes(searchTerm.toLowerCase())
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

  const regionTree = buildRegionTree(regions)
  const filteredTree = filterRegions(regionTree, searchTerm)

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
      acc.add(n.regionId)
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

  const handleRegionToggle = (regionId: number) => {
    // kept for compatibility if used elsewhere
    if (selectedRegions.includes(regionId)) {
      onRegionChange(selectedRegions.filter(id => id !== regionId))
    } else {
      onRegionChange([...selectedRegions, regionId])
    }
  }

  const getSelectedRegionNames = () => {
    if (selectedRegions.length === 0) return 'Все регионы'
    if (selectedRegions.length === 1) {
      const region = regions.find(r => r.regionId === selectedRegions[0])
      return region?.regionName || 'Неизвестный регион'
    }
    return `Выбрано: ${selectedRegions.length}`
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

  const clearSelection = () => {
    onRegionChange([])
  }

  // Рекурсивный компонент для отображения дерева
  const RegionTreeNode = ({ node, level = 0 }: { node: RegionNode; level?: number }) => {
    const hasChildren = node.children && node.children.length > 0
    const isExpanded = expandedNodes.has(node.regionId) || isSearching
    const isSelected = selectedRegions.includes(node.regionId)
    const indentWidth = level * 20 // 20px на уровень

    return (
      <div>
        <div
          className="flex items-center py-2 px-3 hover:bg-opacity-10 cursor-pointer transition-colors rounded"
          style={{ 
            backgroundColor: isSelected ? 'rgba(137, 180, 250, 0.1)' : 'transparent',
            paddingLeft: `${indentWidth + 12}px`
          }}
          onClick={() => handleRegionToggle(node.regionId)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleNodeExpansion(node.regionId)
              }}
              className="mr-2 p-0.5 hover:bg-white hover:bg-opacity-10 rounded transition-colors"
              style={{ color: 'var(--glass-text-secondary)' }}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          {!hasChildren && <div className="w-6" />}
          
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}}
            onClick={(e) => e.stopPropagation()}
            className="mr-3 accent-blue-500"
          />
          
          <span style={{ 
            color: isSelected ? 'var(--glass-text-primary)' : 'var(--glass-text-secondary)',
            fontSize: level === 0 ? '0.95rem' : level === 1 ? '0.9rem' : '0.85rem',
            fontWeight: level === 0 ? 600 : level === 1 ? 500 : 400
          }}>
            {highlightText(node.regionName, searchTerm)}
          </span>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => (
              <RegionTreeNode key={child.regionId} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }
  if (loading) {
    return (
      <div className="glass-dropdown-button opacity-50">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent"></div>
          <span>Загрузка...</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="glass-dropdown-button"
      >
        <span>{getSelectedRegionNames()}</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {/* Modal */}
    <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
      <div className="glass-card p-6 max-h-[80vh] flex flex-col" style={{ width: '400px' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--glass-text-primary)' }}>
                Выбор регионов
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1 rounded hover:bg-gray-500/20 transition-colors"
                style={{ color: 'var(--glass-text-secondary)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search input */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Поиск региона..."
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

            {/* Clear button */}
            {selectedRegions.length > 0 && (
              <div className="mb-4">
                <button
                  onClick={clearSelection}
                  className="text-sm px-3 py-1 rounded transition-colors"
                  style={{ 
                    color: 'var(--glass-blue)',
                    backgroundColor: 'var(--glass-bg-tertiary)'
                  }}
                >
                  Очистить выбор ({selectedRegions.length})
                </button>
              </div>
            )}

            {/* Hierarchical region tree */}
            <div className="flex-1 overflow-y-auto border rounded-lg p-2" style={{ borderColor: 'var(--glass-border)' }}>
              {filteredTree.length > 0 ? (
                filteredTree.map(node => (
                  <RegionTreeNode key={node.regionId} node={node} />
                ))
              ) : (
                <div className="p-3 text-center" style={{ color: 'var(--glass-text-tertiary)' }}>
                  {searchTerm ? 'Регионы не найдены' : 'Загрузка регионов...'}
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="glass-button px-4 py-2"
              >
                Готово
              </button>
            </div>
          </div>
      </Modal>
    </>
  )
}