import { useState, useEffect, useRef } from 'react'
import { HexMapDocument, HexMapLoader, HexMesh, Hex } from '@hexmap/core'
import { HexRenderer } from '@hexmap/renderer'
import { Map as MapIcon, FileCode, Layers, Play, Settings, Save, Download, Plus } from 'lucide-react'

export default function App() {
  const [yaml, setYaml] = useState(`hexmap: "1.0"
metadata:
  title: "Smoketest Map"
layout:
  hex_top: flat
  columns: 12
  rows: 8
  stagger: high
terrain:
  hex:
    clear: { style: { color: "#ffffff" } }
    water: { style: { color: "#4444ff" } }
    forest: { style: { color: "#aaddaa" } }
features:
  - at: "@all"
    terrain: clear
  - at: "0101 0202 0303 0404 0505 0606"
    terrain: water
    label: "River"
  - at: "0801 0802 0902 0901"
    terrain: forest
    label: "Woods"`)
  const [activePanel, setActivePanel] = useState<'source' | 'layout' | 'features'>('source')
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<HexRenderer | null>(null)

  useEffect(() => {
    try {
      if (!containerRef.current) return
      
      const mesh = HexMapLoader.load(yaml)
      if (!rendererRef.current) {
        rendererRef.current = new HexRenderer(mesh, {
          element: containerRef.current,
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
          hexSize: 30
        })
      } else {
        rendererRef.current.update(mesh)
      }
      setError(null)
    } catch (e: any) {
      setError(e.message)
    }
  }, [yaml])

  return (
    <div className="flex h-screen w-full bg-slate-900 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-16 flex flex-col items-center py-4 bg-slate-800 border-r border-slate-700 space-y-8">
        <div 
          className={`p-2 rounded-lg cursor-pointer transition-all ${activePanel === 'features' ? 'bg-blue-600 shadow-lg shadow-blue-900/20 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
          onClick={() => setActivePanel('features')}
          title="Features"
        >
          <MapIcon size={24} />
        </div>
        <div className="cursor-pointer" onClick={() => setActivePanel('source')} title="Source">
          <FileCode 
            size={24} 
            className={`transition-colors ${activePanel === 'source' ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`}
          />
        </div>
        <div className="cursor-pointer" onClick={() => setActivePanel('layout')} title="Layout">
          <Layers 
            size={24} 
            className={`transition-colors ${activePanel === 'layout' ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`}
          />
        </div>
        <div className="cursor-pointer text-slate-400 hover:text-white" title="Preview">
          <Play size={24} />
        </div>
        <div className="flex-grow" />
        <div className="cursor-pointer text-slate-400 hover:text-white" title="Settings">
          <Settings size={24} />
        </div>
      </div>

      {/* Editor Panel */}
      <div className="w-1/3 flex flex-col border-r border-slate-700 bg-slate-900 shadow-xl z-10">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <h2 className="font-semibold flex items-center gap-2 tracking-tight uppercase">
            {activePanel === 'source' && <><FileCode size={18} className="text-blue-400" /> Map Source</>}
            {activePanel === 'layout' && <><Layers size={18} className="text-blue-400" /> Layout</>}
            {activePanel === 'features' && <><MapIcon size={18} className="text-blue-400" /> Features</>}
          </h2>
          <div className="flex gap-2">
            <button className="p-1.5 hover:bg-slate-700 rounded transition-colors" title="Save">
              <Save size={16} />
            </button>
            <button className="p-1.5 hover:bg-slate-700 rounded transition-colors" title="Export">
              <Download size={16} />
            </button>
          </div>
        </div>
        <div className="flex-grow relative group overflow-y-auto">
          {activePanel === 'source' && (
            <textarea
              className="absolute inset-0 w-full h-full p-6 bg-transparent font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all leading-relaxed"
              value={yaml}
              onChange={(e) => setYaml(e.target.value)}
              spellCheck={false}
            />
          )}
          {activePanel === 'layout' && (
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-400 italic">Layout configuration coming soon...</p>
            </div>
          )}
          {activePanel === 'features' && (
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Map Features</h3>
                <button className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-[10px] flex items-center gap-1.5 font-bold transition-all shadow-lg shadow-blue-900/20 active:scale-95">
                  <Plus size={14} /> FEATURE
                </button>
              </div>
              <p className="text-sm text-slate-400 italic">Feature management coming soon...</p>
            </div>
          )}
        </div>
        {error && (
          <div className="p-4 bg-red-950/50 text-red-200 text-xs border-t border-red-900/50 font-mono animate-in fade-in slide-in-from-bottom-2">
            <span className="font-bold mr-2">ERROR:</span>{error}
          </div>
        )}
      </div>

      {/* Viewport */}
      <div className="flex-grow relative bg-slate-950 overflow-hidden group">
        <div className="absolute inset-0 opacity-20 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div ref={containerRef} className="w-full h-full" />
        
        {/* Viewport Overlay */}
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="px-3 py-1.5 bg-slate-800/90 backdrop-blur rounded text-xs border border-slate-700 shadow-2xl flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            LIVE VIEW
          </div>
        </div>
      </div>
    </div>
  )
}
