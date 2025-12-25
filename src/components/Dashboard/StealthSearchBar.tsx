import React, { useState } from 'react';

interface StealthSearchBarProps {
  onSearch: (searchTerm: string) => void;
}

const StealthSearchBar: React.FC<StealthSearchBarProps> = ({ onSearch }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    onSearch(e.target.value);
  };

  const handleSearchClick = () => {
    setIsExpanded(true);
  };

  return (
    <div className="relative flex items-center">
      <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'w-64 pr-2' : 'w-0'}`}>
        <input
          type="text"
          placeholder="Buscar por SKU o Descripción..."
          value={searchTerm}
          onChange={handleInputChange}
          className="px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <button
        onClick={handleSearchClick}
        className="ml-2 p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
};

export default StealthSearchBar;