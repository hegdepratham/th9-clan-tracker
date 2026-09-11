import { useState, useEffect } from 'react';
import * as api from '../api';

export default function ImportModal({ onClose, onImportComplete }) {
  const [tab, setTab] = useState('csv'); // 'csv' or 'paste'
  const [pasteData, setPasteData] = useState('');
  const [file, setFile] = useState(null);
  
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const getImportData = async () => {
    if (tab === 'csv') {
      if (!file) throw new Error('Please select a file');
      return { data: await file.text(), format: 'csv' };
    } else {
      if (!pasteData.trim()) throw new Error('Please paste some data');
      return { data: pasteData, format: 'pipe' };
    }
  };

  const handlePreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, format } = await getImportData();
      const result = await api.importClans(data, format, false);
      setPreview(result);
    } catch (err) {
      setError(err.message || 'Failed to generate preview');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview || preview.valid.length === 0) return;
    
    setLoading(true);
    setError(null);
    try {
      const { data, format } = await getImportData();
      await api.importClans(data, format, true);
      onImportComplete();
    } catch (err) {
      setError(err.message || 'Import failed');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h2>Import Clans</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}
          
          {!preview ? (
            <>
              <div className="import-tabs">
                <button 
                  className={`import-tab ${tab === 'csv' ? 'active' : ''}`}
                  onClick={() => setTab('csv')}
                >
                  CSV Upload
                </button>
                <button 
                  className={`import-tab ${tab === 'paste' ? 'active' : ''}`}
                  onClick={() => setTab('paste')}
                >
                  Paste Data
                </button>
              </div>

              {tab === 'csv' ? (
                <div className="form-group">
                  <label className="form-label">Select CSV File</label>
                  <input 
                    type="file" 
                    accept=".csv" 
                    className="input" 
                    onChange={(e) => setFile(e.target.files[0])} 
                  />
                  <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem'}}>
                    Format: name,tag,notes
                  </p>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Paste Pipe-Delimited Data</label>
                  <textarea 
                    className="textarea" 
                    rows={8}
                    value={pasteData}
                    onChange={(e) => setPasteData(e.target.value)}
                    placeholder={"Clan Name 1 | #ABC123 | Some notes\nClan Name 2 | #DEF456\nClan Name 3 | #GHI789 | More notes"}
                  />
                  <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem'}}>
                    Format: Name | Tag | Notes (one clan per line)
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <h3>Import Preview</h3>
              <div className="import-stats">
                <div>Total detected: <strong>{preview.totalDetected}</strong></div>
                <div style={{color: 'var(--success)'}}>Valid: <strong>{preview.valid.length}</strong></div>
                {preview.invalid.length > 0 && <div style={{color: 'var(--danger)'}}>Invalid: <strong>{preview.invalid.length}</strong></div>}
                {preview.duplicates.length > 0 && <div style={{color: 'var(--warning)'}}>Duplicates: <strong>{preview.duplicates.length}</strong></div>}
              </div>
              
              <div className="import-preview">
                <table>
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Name</th>
                      <th>Tag</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.valid.map((item, i) => (
                      <tr key={`v-${i}`}>
                        <td style={{color: 'var(--success)'}}>✓ Valid</td>
                        <td>{item.name}</td>
                        <td>{item.tag || '—'}</td>
                        <td style={{color: 'var(--text-muted)'}}>{item.notes || '—'}</td>
                      </tr>
                    ))}
                    {preview.duplicates.map((item, i) => (
                      <tr key={`d-${i}`}>
                        <td style={{color: 'var(--warning)'}}>⚠ Duplicate</td>
                        <td>{item.row?.name || '—'}</td>
                        <td>{item.row?.tag || '—'}</td>
                        <td style={{color: 'var(--text-muted)'}}>{item.reason}</td>
                      </tr>
                    ))}
                    {preview.invalid.map((item, i) => (
                      <tr key={`i-${i}`}>
                        <td style={{color: 'var(--danger)'}}>✗ Invalid</td>
                        <td>{item.row?.name || '—'}</td>
                        <td>{item.row?.tag || '—'}</td>
                        <td style={{color: 'var(--text-muted)'}}>{item.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={() => preview ? setPreview(null) : onClose()} disabled={loading}>
            {preview ? 'Back' : 'Cancel'}
          </button>
          {!preview ? (
            <button className="btn btn-primary" onClick={handlePreview} disabled={loading || (tab==='csv' ? !file : !pasteData.trim())}>
              {loading ? 'Processing...' : 'Preview Import'}
            </button>
          ) : (
            <button className="btn btn-success" onClick={handleConfirm} disabled={loading || preview.valid.length === 0}>
              {loading ? 'Importing...' : `Import ${preview.valid.length} Clans`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
