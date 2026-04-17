import React, { useState, useEffect, useMemo } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase-config';
import type { NormalizedRow } from '../types';

interface SettingsViewProps {
  data: NormalizedRow[];
  currentStore?: string | null;
  currentSeason: string;
  setCurrentSeason: (s: string) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ data, currentStore, currentSeason, setCurrentSeason }) => {
  const isStoreSelected = currentStore && currentStore !== 'all' && currentStore !== 'Todas las Tiendas';
  const [thresholds, setThresholds] = useState<Record<string, number | null>>({});
  const [expandedArea, setExpandedArea] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ra' | 'season' | 'measures'>('ra');

  // 🟢 INYECCIÓN FASE 2: Extraer temporadas únicas para el selector manual
  const availableSeasons = useMemo(() => {
    const unique = new Set<string>();
    data.forEach(r => {
      const t = r.temporada?.trim().toUpperCase();
      if (t && t !== 'BÁSICO' && t !== 'SIN TEMPORADA') unique.add(t);
    });
    return Array.from(unique).sort();
  }, [data]);

  // 🟢 MOTOR DINÁMICO: Extrae Áreas y Categorías reales del Excel
  const hierarchy = useMemo(() => {
    const tree: Record<string, Set<string>> = {};
    data.forEach(row => {
      const area = row.area?.trim().toUpperCase() || 'SIN ÁREA';
      const cat = row.categoria?.trim().toUpperCase() || 'SIN CATEGORÍA';
      if (!tree[area]) tree[area] = new Set();
      tree[area].add(cat);
    });
    return tree;
  }, [data]);

  // 🟢 LECTURA INICIAL DE FIREBASE
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'config', `ra_thresholds_${currentStore}`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setThresholds(docSnap.data() as Record<string, number | null>);
        }
      } catch (error) {
        console.error("Error leyendo configuración:", error);
      }
    };
    fetchSettings();
  }, [currentStore]);

  // 🟢 CONTROLES DEL STEPPER
  const handleIncrease = (key: string) => {
    setThresholds(prev => ({
      ...prev,
      [key]: prev[key] === undefined || prev[key] === null ? 1 : prev[key]! + 1
    }));
  };

  const handleDecrease = (key: string) => {
    setThresholds(prev => {
      const current = prev[key];
      if (!current || current <= 1) return prev;
      return { ...prev, [key]: current - 1 };
    });
  };

  const handleClear = (key: string) => {
    setThresholds(prev => ({ ...prev, [key]: null }));
  };

  // 🟢 GUARDADO EN FIREBASE
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const docRef = doc(db, 'config', `ra_thresholds_${currentStore}`);
      await setDoc(docRef, thresholds);
      setSaveMessage('✅ Leyes de RA guardadas con éxito en la nube.');
    } catch (error) {
      console.error("Error guardando:", error);
      setSaveMessage('❌ Error al guardar.');
    }
    setIsSaving(false);
    setTimeout(() => setSaveMessage(null), 4000);
  };

  return (
    <div className="relative h-[calc(100vh-6rem)] flex flex-col bg-gray-50 rounded-xl overflow-hidden shadow-inner">
      {/* CABECERA */}
      <div className="bg-white border-b border-gray-200">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            ⚙️ Centro de Comando
          </h2>
        </div>
        
        {/* Barra de Sub-Navegación */}
        <div className="flex px-6 gap-6">
          <button
            onClick={() => setActiveTab('ra')}
            className={`pb-4 px-2 text-sm font-bold transition-all border-b-2 ${
              activeTab === 'ra' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Configurar Parámetros RA
          </button>
          <button
            onClick={() => setActiveTab('season')}
            className={`pb-4 px-2 text-sm font-bold transition-all border-b-2 ${
              activeTab === 'season' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Configurar Temporada Actual
          </button>
          <button
            onClick={() => setActiveTab('measures')}
            className={`pb-4 px-2 text-sm font-bold transition-all border-b-2 ${
              activeTab === 'measures' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Configurar Medidas Inmueble
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
        {/* ⚠️ SECCIÓN DE ADVERTENCIA */}
        {!isStoreSelected && (
          <div className="m-6 bg-amber-50 border-l-4 border-amber-400 text-amber-700 p-4 shadow-sm rounded-md">
            <p className="font-bold text-sm">⚠️ Tienda no seleccionada</p>
            <p className="text-xs">Selecciona una tienda en el Dashboard para gestionar sus leyes y medidas.</p>
          </div>
        )}

        {/* 🟢 SUB-MÓDULO: TEMPORADA ACTUAL */}
        {activeTab === 'season' && (
          <div className="p-8 bg-white m-6 rounded-xl border border-gray-200 shadow-sm animate-fade-in">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">⏱️ Motor de Tiempo</h3>
            <p className="text-sm text-gray-500 mb-6">Define la temporada operativa. Esto afecta qué productos se consideran "Temporada Actual" o "Carryover".</p>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700 bg-purple-50 px-4 py-2 rounded-lg border border-purple-100">
                Activa: <strong>{currentSeason}</strong>
              </span>
              <select
                value={currentSeason}
                onChange={(e) => setCurrentSeason(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white shadow-sm outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value={currentSeason}>{currentSeason}</option>
                {availableSeasons.map(s => s !== currentSeason && <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* 🟢 SUB-MÓDULO: PARÁMETROS RA */}
        {activeTab === 'ra' && (
          <div className="flex-1 flex flex-col min-h-0 animate-fade-in">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {Object.keys(hierarchy).sort().map((area) => (
                <div key={area} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  <button 
                    onClick={() => setExpandedArea(expandedArea === area ? null : area)}
                    className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors font-bold text-gray-700"
                  >
                    <span>{area} ({hierarchy[area].size} Categorías)</span>
                    <span>{expandedArea === area ? '▲' : '▼'}</span>
                  </button>
                  
                  {expandedArea === area && (
                    <div className="divide-y divide-gray-100">
                      {Array.from(hierarchy[area]).sort().map(cat => {
                        const key = `${area}_${cat}`;
                        const val = thresholds[key];
                        const isNCA = val === null || val === undefined;
                        return (
                          <div key={cat} className="flex justify-between items-center p-4 hover:bg-gray-50 transition-colors">
                            <span className="font-medium text-gray-600">{cat}</span>
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={() => handleDecrease(key)} 
                                disabled={!isStoreSelected || isNCA || val <= 1} 
                                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors flex items-center justify-center font-bold disabled:opacity-30"
                              >-</button>
                              
                              <div className={`w-12 text-center font-bold ${isNCA ? 'text-gray-300 text-sm' : 'text-purple-700 text-lg'}`}>
                                {isNCA ? 'NCA' : val}
                              </div>

                              <button 
                                onClick={() => handleIncrease(key)} 
                                disabled={!isStoreSelected} 
                                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors flex items-center justify-center font-bold disabled:opacity-30"
                              >+</button>

                              {/* 🟢 AQUÍ SE USA HANDLE_CLEAR - ELIMINA EL ERROR DE COMPILACIÓN */}
                              <button 
                                onClick={() => handleClear(key)} 
                                disabled={!isStoreSelected || isNCA} 
                                className="ml-2 text-red-300 hover:text-red-600 transition-colors disabled:opacity-0"
                                title="Restablecer a NCA"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* BOTÓN DE GUARDADO LOCAL RA */}
            <div className="p-6 bg-white border-t border-gray-200 flex justify-between items-center sticky bottom-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 font-bold">
                  {saveMessage || "* Los cambios afectan la Alerta RA en el Carrito."}
                </span>
              </div>
              <button
                onClick={handleSave}
                disabled={!isStoreSelected || isSaving}
                className="bg-purple-700 hover:bg-purple-800 text-white font-bold py-2 px-8 rounded-lg transition-all disabled:opacity-50 shadow-md active:scale-95"
              >
                {isSaving ? 'Guardando...' : '💾 Guardar Parámetros RA'}
              </button>
            </div>
          </div>
        )}

        {/* 🟢 SUB-MÓDULO: MEDIDAS INMUEBLE */}
        {activeTab === 'measures' && (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-12 animate-fade-in">
            <span className="text-6xl mb-4 opacity-20">📐</span>
            <h3 className="text-xl font-bold text-gray-800">Configurar Medidas Inmueble</h3>
            <p className="max-w-md text-center mt-2 text-sm italic">
              Preparando entorno para carga de Excel geométrico y AutoCAD...
            </p>
            <div className="mt-8">
               <button disabled={true} className="bg-gray-100 text-gray-400 border border-gray-200 font-bold py-2 px-8 rounded-lg cursor-not-allowed">
                 💾 Guardar Medidas Inmueble
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsView;
