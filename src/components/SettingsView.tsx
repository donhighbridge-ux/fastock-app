import React, { useState, useEffect, useMemo } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase-config';
import type { NormalizedRow } from '../types';

interface SettingsViewProps {
  data: NormalizedRow[];
}

const SettingsView: React.FC<SettingsViewProps> = ({ data }) => {
  const [thresholds, setThresholds] = useState<Record<string, number | null>>({});
  const [expandedArea, setExpandedArea] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

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
        const docRef = doc(db, 'config', 'ra_thresholds');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setThresholds(docSnap.data() as Record<string, number | null>);
        }
      } catch (error) {
        console.error("Error leyendo configuración:", error);
      }
    };
    fetchSettings();
  }, []);

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
      const docRef = doc(db, 'config', 'ra_thresholds');
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
      <div className="p-6 border-b border-gray-200 bg-white">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          ⚙️ Centro de Comando (Leyes RA)
        </h2>
        <p className="text-gray-500 mt-1">
          Define la Reposición Automática mínima exigida por categoría. El sistema propondrá subir la RA a este nivel.
        </p>
      </div>

      {/* ÁREA DE ACORDEONES (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-32">
        {Object.keys(hierarchy).sort().map(area => (
          <div key={area} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            {/* Cabecera del Acordeón */}
            <button 
              onClick={() => setExpandedArea(expandedArea === area ? null : area)}
              className="w-full flex justify-between items-center p-4 bg-gray-100 hover:bg-gray-200 transition font-bold text-gray-700"
            >
              <span>{area} ({hierarchy[area].size} Categorías)</span>
              <span>{expandedArea === area ? '▲' : '▼'}</span>
            </button>
            
            {/* Contenido del Acordeón (Categorías) */}
            {expandedArea === area && (
              <div className="divide-y divide-gray-100">
                {Array.from(hierarchy[area]).sort().map(cat => {
                  const key = `${area}_${cat}`;
                  const val = thresholds[key];
                  const isNCA = val === null || val === undefined;

                  return (
                    <div key={cat} className="flex justify-between items-center p-4 hover:bg-gray-50">
                      <span className="font-medium text-gray-600">{cat}</span>
                      
                      {/* El Stepper NCA */}
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleDecrease(key)}
                          disabled={isNCA || val <= 1}
                          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg bg-gray-200 text-gray-600 hover:bg-gray-300 disabled:opacity-30 transition"
                        >-</button>
                        
                        <div className={`w-12 text-center font-bold text-lg ${isNCA ? 'text-gray-400 text-sm' : 'text-purple-700'}`}>
                          {isNCA ? 'NCA' : val}
                        </div>
                        
                        <button 
                          onClick={() => handleIncrease(key)}
                          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg bg-gray-200 text-gray-600 hover:bg-gray-300 transition"
                        >+</button>

                        <button 
                          onClick={() => handleClear(key)}
                          disabled={isNCA}
                          className="ml-2 text-red-400 hover:text-red-600 disabled:opacity-0 transition"
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

      {/* 🟢 PANEL DE GUARDADO (Fijo en la zona inferior) */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 px-6 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div>
          {saveMessage && (
            <span className={`font-medium animate-fade-in ${saveMessage.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
              {saveMessage}
            </span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-purple-700 hover:bg-purple-800 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {isSaving ? 'Guardando...' : '💾 Guardar Leyes de RA'}
        </button>
      </div>
    </div>
  );
};

export default SettingsView;
