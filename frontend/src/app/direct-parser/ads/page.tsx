'use client'
import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/api'
import { showToast } from '@/components/Toast'
import * as XLSX from 'xlsx'

interface DirectAd {
  id: string
  platform: string
  type: string
  query: string
  title: string
  description: string
  url: string
  display_url: string
  timestamp: string
  position?: number
  page?: number
  serp_position?: number
  image_url?: string
}

export default function AdsPage() {
  const [ads, setAds] = useState<DirectAd[]>([])
  const [totalAds, setTotalAds] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [domainFilter, setDomainFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const [sortBy, setSortBy] = useState<'position' | 'date' | 'query'>('position')
  const [selectedAd, setSelectedAd] = useState<DirectAd | null>(null)
  const [uniqueDomains, setUniqueDomains] = useState<string[]>([])
  const limit = 50

  const loadAds = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('query', searchQuery)
      if (domainFilter) params.set('domain', domainFilter)
      params.set('limit', limit.toString())
      params.set('offset', (currentPage * limit).toString())
      const response = await apiFetch('/api/direct-parser/ads?' + params.toString())
      if (response.ok) {
        const data = await response.json()
        setAds(data.ads || [])
        setTotalAds(data.total || 0)
        const domains = new Set<string>()
        ;(data.ads || []).forEach((ad: DirectAd) => {
          if (ad.display_url) {
            const d = ad.display_url.split(String.fromCharCode(8250))[0].trim()
            if (d) domains.add(d)
          }
        })
        setUniqueDomains(Array.from(domains).sort())
      }
    } catch (error) { console.error('Error:', error) }
    finally { setIsLoading(false) }
  }, [searchQuery, domainFilter, currentPage])

  useEffect(() => { loadAds() }, [loadAds])

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setCurrentPage(0); loadAds() }

  const handleDeleteAd = async (adId: string) => {
    if (!confirm('Delete?')) return
    try {
      const response = await apiFetch('/api/direct-parser/ads/' + adId, { method: 'DELETE' })
      if (response.ok) { showToast('Deleted', 'success'); loadAds(); setSelectedAd(null) }
    } catch { showToast('Error', 'error') }
  }

  const handleClearAll = async () => {
    if (!confirm('Delete ALL?')) return
    try {
      const response = await apiFetch('/api/direct-parser/ads', { method: 'DELETE' })
      if (response.ok) { showToast('Cleared', 'success'); loadAds() }
    } catch { showToast('Error', 'error') }
  }

  const removeDuplicates = async () => {
    if (!confirm('Remove duplicates?')) return
    try {
      const response = await apiFetch('/api/direct-parser/ads/remove-duplicates', { method: 'POST' })
      if (response.ok) {
        const data = await response.json()
        showToast('Removed ' + (data.removed || 0) + ' duplicates', 'success')
        loadAds()
      }
    } catch { showToast('Error', 'error') }
  }

  const exportToXlsx = async () => {
    try {
      showToast('Preparing...', 'info')
      const params = new URLSearchParams()
      if (searchQuery) params.set('query', searchQuery)
      if (domainFilter) params.set('domain', domainFilter)
      params.set('limit', '10000')
      params.set('offset', '0')
      const response = await apiFetch('/api/direct-parser/ads?' + params.toString())
      if (!response.ok) { showToast('Error', 'error'); return }
      const data = await response.json()
      const allAds: DirectAd[] = data.ads || []
      if (allAds.length === 0) { showToast('No data', 'error'); return }
      const adsByQuery: Record<string, DirectAd[]> = {}
      allAds.forEach(ad => {
        const q = ad.query || 'No query'
        if (!adsByQuery[q]) adsByQuery[q] = []
        adsByQuery[q].push(ad)
      })
      const wb = XLSX.utils.book_new()
      Object.entries(adsByQuery).forEach(([query, queryAds]) => {
        queryAds.sort((a, b) => {
          if ((a.page || 0) !== (b.page || 0)) return (a.page || 0) - (b.page || 0)
          return (a.position || 0) - (b.position || 0)
        })
        const wsData: (string | number)[][] = [['Pos', 'Page', 'SERP', 'Type', 'Title', 'Description', 'URL', 'Display URL', 'Domain', 'Date']]
        queryAds.forEach(ad => {
          const domain = ad.display_url ? ad.display_url.split(String.fromCharCode(8250))[0].trim() : ''
          wsData.push([ad.position || 0, ad.page || 0, ad.serp_position || 0, ad.type || '', ad.title || '', ad.description || '', ad.url || '', ad.display_url || '', domain, ad.timestamp || ''])
        })
        const ws = XLSX.utils.aoa_to_sheet(wsData)
        ws['!cols'] = [{wch:5},{wch:5},{wch:5},{wch:15},{wch:50},{wch:60},{wch:50},{wch:40},{wch:25},{wch:18}]
        const sheetName = query.substring(0, 31).replace(/[\\\/*?:\[\]]/g, '_')
        XLSX.utils.book_append_sheet(wb, ws, sheetName)
      })
      const filename = 'direct_ads_' + new Date().toISOString().split('T')[0] + '.xlsx'
      XLSX.writeFile(wb, filename)
      showToast('Export: ' + allAds.length + ' in ' + Object.keys(adsByQuery).length + ' sheets', 'success')
    } catch (error) { console.error(error); showToast('Export error', 'error') }
  }

  const sortedAds = [...ads].sort((a, b) => {
    if (sortBy === 'position') {
      if ((a.page || 0) !== (b.page || 0)) return (a.page || 0) - (b.page || 0)
      return (a.position || 0) - (b.position || 0)
    }
    if (sortBy === 'date') return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    if (sortBy === 'query') return (a.query || '').localeCompare(b.query || '')
    return 0
  })

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleString('ru-RU', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) }
    catch { return d }
  }

  const totalPages = Math.ceil(totalAds / limit)
  const TypeBadge = ({t}: {t: string}) => <span className={t === 'Banner' ? 'text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400' : 'text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400'}>{t === 'Banner' ? 'Banner' : 'Context'}</span>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ads</h1>
          <p className="text-sm opacity-60 mt-1">Ads from Yandex.Direct</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {totalAds > 0 && (<>
            <button onClick={exportToXlsx} className="px-4 py-2 bg-green-500/10 text-green-500 border border-green-500/30 rounded-lg hover:bg-green-500/20 text-sm flex items-center gap-2">Excel</button>
            <button onClick={removeDuplicates} className="px-4 py-2 bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 rounded-lg hover:bg-yellow-500/20 text-sm">Remove Duplicates</button>
          </>)}
          <button onClick={loadAds} className="px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg hover:border-[var(--button)] text-sm flex items-center gap-2">Refresh</button>
          {totalAds > 0 && <button onClick={handleClearAll} className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/30 rounded-lg hover:bg-red-500/20 text-sm">Clear All</button>}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[250px]">
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="flex-1 px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg focus:border-[var(--button)] focus:outline-none" />
          <button type="submit" className="px-6 py-2 bg-[var(--button)] text-white rounded-lg hover:opacity-90">Find</button>
        </form>
        <select value={domainFilter} onChange={(e) => { setDomainFilter(e.target.value); setCurrentPage(0) }} className="px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg focus:outline-none min-w-[180px]">
          <option value="">All domains</option>
          {uniqueDomains.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg focus:outline-none">
          <option value="position">By position</option>
          <option value="date">By date</option>
          <option value="query">By query</option>
        </select>
      </div>

      {isLoading ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--button)] border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-sm opacity-60">Loading...</p>
        </div>
      ) : sortedAds.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center opacity-50">
          {searchQuery || domainFilter ? 'Nothing found' : 'No ads. Create a task.'}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm opacity-60">Found: {totalAds}</div>
          {sortedAds.map((ad) => (
            <div key={ad.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 cursor-pointer hover:border-[var(--button)] transition-colors" onClick={() => setSelectedAd(ad)}>
              <div className="flex gap-4">
                <div className="flex flex-col items-center min-w-[50px] text-center">
                  {ad.page && ad.position ? (<><span className="text-lg font-bold text-[var(--button)]">#{ad.position}</span><span className="text-xs opacity-50">p.{ad.page}</span></>) : <span className="text-xs opacity-30">-</span>}
                </div>
                {ad.image_url && (
                  <div className="w-20 h-20 flex-shrink-0 rounded overflow-hidden bg-[var(--border)]">
                    <img src={ad.image_url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <TypeBadge t={ad.type === 'Баннерная реклама' ? 'Banner' : 'Context'} />
                    {ad.serp_position && ad.serp_position > 0 && <span className="text-xs opacity-40">SERP: {ad.serp_position}</span>}
                  </div>
                  <div className="text-[var(--button)] font-medium truncate">{ad.title || '(no title)'}</div>
                  <p className="text-sm opacity-70 mt-1 line-clamp-1">{ad.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs opacity-50 flex-wrap">
                    <span className="text-green-400">{ad.display_url}</span>
                    <span className="bg-[var(--border)] px-2 py-0.5 rounded">{ad.query}</span>
                    <span>{formatDate(ad.timestamp)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} className="px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg disabled:opacity-50">Prev</button>
              <span className="px-4 py-2">{currentPage + 1} / {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1} className="px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg disabled:opacity-50">Next</button>
            </div>
          )}
        </div>
      )}

      {selectedAd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedAd(null)}>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  {selectedAd.page && selectedAd.position && (<div className="text-center"><div className="text-2xl font-bold text-[var(--button)]">#{selectedAd.position}</div><div className="text-xs opacity-50">p. {selectedAd.page}</div></div>)}
                  <TypeBadge t={selectedAd.type === 'Баннерная реклама' ? 'Banner' : 'Context'} />
                </div>
                <button onClick={() => setSelectedAd(null)} className="p-2 hover:bg-[var(--border)] rounded">X</button>
              </div>
              {selectedAd.image_url && (<div className="mb-4 rounded-lg overflow-hidden bg-[var(--border)]"><img src={selectedAd.image_url} alt="Banner" className="w-full max-h-64 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} /></div>)}
              <h2 className="text-xl font-bold mb-2">{selectedAd.title || '(no title)'}</h2>
              {selectedAd.description && <p className="opacity-70 mb-4">{selectedAd.description}</p>}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-[var(--border)]"><span className="opacity-50">Query:</span><span className="font-medium">{selectedAd.query}</span></div>
                <div className="flex justify-between py-2 border-b border-[var(--border)]"><span className="opacity-50">Display URL:</span><span className="text-green-400">{selectedAd.display_url}</span></div>
                {selectedAd.serp_position && selectedAd.serp_position > 0 && <div className="flex justify-between py-2 border-b border-[var(--border)]"><span className="opacity-50">SERP:</span><span>{selectedAd.serp_position}</span></div>}
                <div className="flex justify-between py-2 border-b border-[var(--border)]"><span className="opacity-50">Date:</span><span>{formatDate(selectedAd.timestamp)}</span></div>
              </div>
              <div className="flex gap-3 mt-6">
                <a href={selectedAd.url} target="_blank" rel="noopener noreferrer" className="flex-1 px-4 py-3 bg-[var(--button)] text-white rounded-lg text-center hover:opacity-90">Open site</a>
                <button onClick={() => handleDeleteAd(selectedAd.id)} className="px-4 py-3 bg-red-500/10 text-red-500 border border-red-500/30 rounded-lg hover:bg-red-500/20">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}