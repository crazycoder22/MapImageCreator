import { useState, useRef } from 'react';
import { getRoute } from './services/ors';
import { renderRoute, downloadCanvas } from './utils/canvasRenderer';
import WaypointInput from './components/WaypointInput';
import './App.css';

let nextId = 3;

function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('ors_api_key') || '');
  const [waypoints, setWaypoints] = useState([
    { id: 1, name: '', coordinates: null },
    { id: 2, name: '', coordinates: null },
  ]);
  const [title, setTitle] = useState('');
  const [clubName, setClubName] = useState('');
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canvasRef = useRef(null);

  const handleApiKeyChange = (e) => {
    const key = e.target.value;
    setApiKey(key);
    localStorage.setItem('ors_api_key', key);
  };

  const updateWaypoint = (id, updates) => {
    setWaypoints((prev) => prev.map((w) => (w.id === id ? { ...w, ...updates } : w)));
  };

  const addWaypoint = () => {
    setWaypoints((prev) => [...prev, { id: nextId++, name: '', coordinates: null }]);
  };

  const removeWaypoint = (id) => {
    if (waypoints.length <= 2) return;
    setWaypoints((prev) => prev.filter((w) => w.id !== id));
  };

  const handleGenerate = async () => {
    setError('');

    if (!apiKey.trim()) {
      setError('Please enter your OpenRouteService API key.');
      return;
    }

    const validWaypoints = waypoints.filter((w) => w.coordinates);
    if (validWaypoints.length < 2) {
      setError('Please select at least 2 locations from the dropdown suggestions.');
      return;
    }

    setLoading(true);
    try {
      const coords = validWaypoints.map((w) => w.coordinates);
      const route = await getRoute(apiKey, coords);
      setRouteData(route);

      renderRoute(canvasRef.current, route, validWaypoints, {
        title: title || 'Cycling Route',
        clubName,
      });
    } catch (err) {
      setError(err.message || 'Failed to generate route. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const filename = (title || 'cycling-route').toLowerCase().replace(/\s+/g, '-') + '.png';
    downloadCanvas(canvasRef.current, filename);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Cycling Route Map Creator</h1>
        <p>Create beautiful minimal route posters for your cycling club</p>
      </header>

      <div className="app-main">
        <aside className="sidebar">
          <div className="panel">
            <h3>API Key</h3>
            <input
              type="password"
              value={apiKey}
              onChange={handleApiKeyChange}
              placeholder="Your OpenRouteService API key"
              className="input"
            />
            <a
              href="https://openrouteservice.org/dev/#/signup"
              target="_blank"
              rel="noopener noreferrer"
              className="help-link"
            >
              Get a free API key
            </a>
          </div>

          <div className="panel">
            <h3>Route Details</h3>
            <input
              type="text"
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              placeholder="Club name (optional)"
              className="input"
            />
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Route title"
              className="input"
              style={{ marginTop: 8 }}
            />
          </div>

          <div className="panel">
            <h3>Waypoints</h3>
            {waypoints.map((wp, i) => (
              <div key={wp.id} className="waypoint-row">
                <span className="waypoint-label">
                  {i === 0 ? 'Start' : i === waypoints.length - 1 ? 'End' : `Stop ${i}`}
                </span>
                <div className="waypoint-controls">
                  <WaypointInput
                    apiKey={apiKey}
                    value={wp.name}
                    resolved={!!wp.coordinates}
                    onNameChange={(name) => updateWaypoint(wp.id, { name, coordinates: null })}
                    onSelect={(name, coordinates) => updateWaypoint(wp.id, { name, coordinates })}
                  />
                  {waypoints.length > 2 && (
                    <button
                      className="btn-icon"
                      onClick={() => removeWaypoint(wp.id)}
                      title="Remove waypoint"
                    >
                      &times;
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button className="btn-secondary" onClick={addWaypoint}>
              + Add Stop
            </button>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
            {loading ? 'Generating...' : 'Generate Route Map'}
          </button>

          {routeData && (
            <button className="btn-download" onClick={handleDownload}>
              Download PNG
            </button>
          )}
        </aside>

        <main className="preview">
          <canvas
            ref={canvasRef}
            className="route-canvas"
            style={{ display: routeData ? 'block' : 'none' }}
          />
          {!routeData && (
            <div className="canvas-placeholder">
              <p>Your route map will appear here</p>
              <p className="hint">Add waypoints and click Generate Route Map</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
