import { useState, useEffect } from 'react';

export default function ClanForm({ clan, onSubmit, onClose }) {
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (clan) {
      setName(clan.name || '');
      setTag(clan.tag || '');
      setNotes(clan.notes || '');
    }
  }, [clan]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      await onSubmit({ 
        name: name.trim(), 
        tag: tag.trim() || null, 
        notes: notes.trim() || null 
      });
    } catch (err) {
      setError(err.message || 'Failed to save clan');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{clan ? 'Edit Clan' : 'Add Clan'}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}
          <form id="clanForm" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="clanName">Name *</label>
              <input
                id="clanName"
                className="input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="clanTag">Tag</label>
              <input
                id="clanTag"
                className="input"
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="#ABC123"
                maxLength={20}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="clanNotes">Notes</label>
              <textarea
                id="clanNotes"
                className="textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                maxLength={1000}
              />
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button form="clanForm" type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
