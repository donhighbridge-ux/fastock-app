import React, { useState, useRef, useEffect } from 'react';

interface NotificationBellProps {
  count: number | null;
  onClick: () => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ count, onClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  if (!count || count === 0) return null;

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-blue-600 transition-colors rounded-full hover:bg-gray-100 focus:outline-none"
      >
        {/* Icono Campana */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {/* Badge Rojo */}
        <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full border-2 border-white shadow-sm">
          {count}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-fade-in origin-top-right">
          <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
            <h3 className="text-sm font-bold text-blue-800">Novedades en Seguimiento</h3>
          </div>
          <div className="p-4">
            <p className="text-gray-600 text-sm mb-4 leading-relaxed">
              Tienes <span className="font-bold text-gray-900">{count} productos</span> en tu lista de seguimiento con nuevas oportunidades de stock (CD o Tránsito).
            </p>
            <button
              onClick={() => {
                setIsOpen(false);
                onClick();
              }}
              className="w-full bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <span>👁️</span> Ir a Seguimiento
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;