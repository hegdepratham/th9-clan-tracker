import { useEffect, useRef } from 'react';

export default function ClanList({ clans, onVisit, onUnvisit, onEdit, onDelete, highlightId }) {
  const listRef = useRef(null);

  useEffect(() => {
    if (highlightId && listRef.current) {
      const el = document.getElementById(`clan-${highlightId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightId]);

  if (!clans || clans.length === 0) {
    return <div className="empty-state">No clans found. Try adjusting your search or filters.</div>;
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const opts = { day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-GB', opts);
  };

  return (
    <div ref={listRef}>
      <table className="clan-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Tag</th>
            <th>Status</th>
            <th>Last Visited</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {clans.map((clan) => (
            <tr 
              key={clan.id} 
              id={`clan-${clan.id}`}
              className={highlightId === clan.id ? 'highlight-row' : ''}
            >
              <td className="clan-name">{clan.name}</td>
              <td className="clan-tag">{clan.tag || '—'}</td>
              <td>
                <span className={`badge ${clan.visited ? 'badge-visited' : 'badge-not-visited'}`}>
                  {clan.visited ? 'Visited' : 'Not Visited'}
                </span>
              </td>
              <td>{formatDate(clan.last_visited)}</td>
              <td>
                <div className="clan-actions">
                  {clan.visited ? (
                    <button onClick={() => onUnvisit(clan.id)} className="btn btn-ghost btn-sm">Unvisit</button>
                  ) : (
                    <button onClick={() => onVisit(clan.id)} className="btn btn-success btn-sm">Visit</button>
                  )}
                  <button onClick={() => onEdit(clan)} className="btn btn-ghost btn-sm">Edit</button>
                  <button onClick={() => onDelete(clan)} className="btn btn-ghost btn-sm" style={{color: 'var(--danger)'}}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="clan-cards-mobile">
        {clans.map((clan) => (
          <div 
            key={clan.id} 
            id={`clan-card-${clan.id}`}
            className={`clan-card ${highlightId === clan.id ? 'highlight-row' : ''}`}
          >
            <div className="clan-card-header">
              <span className="clan-name">{clan.name}</span>
              <span className={`badge ${clan.visited ? 'badge-visited' : 'badge-not-visited'}`}>
                {clan.visited ? 'Visited' : 'Not Visited'}
              </span>
            </div>
            <div className="clan-card-body">
              <div>Tag: <span className="clan-tag">{clan.tag || '—'}</span></div>
              <div>Last Visited: {formatDate(clan.last_visited)}</div>
            </div>
            <div className="clan-card-actions">
              {clan.visited ? (
                <button onClick={() => onUnvisit(clan.id)} className="btn btn-ghost btn-sm">Unvisit</button>
              ) : (
                <button onClick={() => onVisit(clan.id)} className="btn btn-success btn-sm">Visit</button>
              )}
              <button onClick={() => onEdit(clan)} className="btn btn-ghost btn-sm">Edit</button>
              <button onClick={() => onDelete(clan)} className="btn btn-ghost btn-sm" style={{color: 'var(--danger)'}}>Del</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
