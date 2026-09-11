import { useState, useEffect } from 'react';

export default function SearchBar({ value, onChange }) {
  const [localVal, setLocalVal] = useState(value);

  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localVal !== value) {
        onChange(localVal);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localVal, value, onChange]);

  return (
    <div className="search-container">
      <span className="search-icon">🔍</span>
      <input
        type="text"
        className="input search-input"
        placeholder="Search clans by name or tag..."
        value={localVal}
        onChange={(e) => setLocalVal(e.target.value)}
      />
      {localVal && (
        <button className="search-clear" onClick={() => setLocalVal('')}>
          &times;
        </button>
      )}
    </div>
  );
}
