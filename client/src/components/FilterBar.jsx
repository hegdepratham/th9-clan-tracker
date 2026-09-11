export default function FilterBar({ active, onChange, stats }) {
  return (
    <div className="filter-group">
      <button 
        className={`filter-btn ${active === 'all' ? 'active' : ''}`}
        onClick={() => onChange('all')}
      >
        All {stats?.total ? `(${stats.total})` : ''}
      </button>
      <button 
        className={`filter-btn ${active === 'unvisited' ? 'active' : ''}`}
        onClick={() => onChange('unvisited')}
      >
        Not Visited {stats?.remaining ? `(${stats.remaining})` : ''}
      </button>
      <button 
        className={`filter-btn ${active === 'visited' ? 'active' : ''}`}
        onClick={() => onChange('visited')}
      >
        Visited {stats?.visited ? `(${stats.visited})` : ''}
      </button>
    </div>
  );
}
