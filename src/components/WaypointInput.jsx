import { useState, useRef } from 'react';
import { geocode } from '../services/ors';

export default function WaypointInput({ apiKey, value, resolved, onNameChange, onSelect }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef(null);

  const handleChange = (e) => {
    const text = e.target.value;
    onNameChange(text);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (text.length >= 3 && apiKey) {
      timeoutRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const results = await geocode(apiKey, text);
          setSuggestions(results);
          setShowSuggestions(true);
        } catch {
          setSuggestions([]);
        } finally {
          setLoading(false);
        }
      }, 400);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelect = (suggestion) => {
    onSelect(suggestion.name, suggestion.coordinates);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <div className="waypoint-input-wrapper">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        placeholder="Search location..."
        className="input"
      />
      {loading && <span className="input-spinner" />}
      {resolved && !loading && <span className="input-check">&#10003;</span>}
      {showSuggestions && suggestions.length > 0 && (
        <ul className="suggestions-list">
          {suggestions.map((s, i) => (
            <li key={i} onMouseDown={() => handleSelect(s)}>
              {s.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
