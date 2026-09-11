import { useState, useEffect } from 'react';
import { useClans } from '../hooks/useClans';
import * as api from '../api';
import SearchBar from './SearchBar';
import FilterBar from './FilterBar';
import ClanList from './ClanList';
import ClanForm from './ClanForm';
import ImportModal from './ImportModal';
import ConfirmDialog from './ConfirmDialog';

export default function Dashboard({ logout, addToast }) {
  const clansHook = useClans();
  const {
    clans, stats, loading, search, setSearch, filter, setFilter, sort, setSort,
    addClan, updateClan, removeClan, visit, unvisit, getNextUnvisited, refresh
  } = clansHook;

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingClan, setEditingClan] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [deletingClan, setDeletingClan] = useState(null);
  
  const [highlightId, setHighlightId] = useState(null);
  const [undoState, setUndoState] = useState(null); // { id, timerId }

  const handleVisit = async (id) => {
    try {
      await visit(id);
      addToast('Clan marked as visited', 'success');
      
      const timer = setTimeout(() => {
        setUndoState(null);
      }, 5000);
      
      if (undoState?.timerId) clearTimeout(undoState.timerId);
      setUndoState({ id, timerId: timer });
    } catch (err) {
      addToast('Failed to mark visited', 'error');
    }
  };

  const handleUndo = async () => {
    if (!undoState) return;
    clearTimeout(undoState.timerId);
    try {
      await unvisit(undoState.id);
      setUndoState(null);
      addToast('Visit undone', 'info');
    } catch (err) {
      addToast('Failed to undo', 'error');
    }
  };

  const handleUnvisit = async (id) => {
    try {
      await unvisit(id);
      addToast('Clan marked as not visited', 'info');
    } catch (err) {
      addToast('Failed to unvisit', 'error');
    }
  };

  const handleNextUnvisited = async () => {
    try {
      const next = await getNextUnvisited();
      if (next) {
        setHighlightId(next.id);
        // Scroll logic could be here, but handled in ClanList if ID matches
        setTimeout(() => setHighlightId(null), 2000);
        addToast(`Found next: ${next.name}`, 'info');
      } else {
        addToast('No unvisited clans found', 'info');
      }
    } catch (err) {
      addToast('Error finding next clan', 'error');
    }
  };

  const handleExport = async () => {
    try {
      await api.exportClans();
      addToast('Export successful', 'success');
    } catch (err) {
      addToast('Export failed', 'error');
    }
  };

  const progressPercent = stats.total > 0 ? (stats.visited / stats.total) * 100 : 0;

  return (
    <div className="container">
      <header className="header">
        <h1>TH9 Clan Tracker</h1>
        <button onClick={logout} className="btn btn-ghost btn-sm">Logout</button>
      </header>

      <div className="stats-grid">
        <div className="stat-card card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>Total Clans</h3>
            <p>{stats.total}</p>
          </div>
        </div>
        <div className="stat-card card visited">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>Visited</h3>
            <p>{stats.visited}</p>
          </div>
        </div>
        <div className="stat-card card remaining">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <h3>Remaining</h3>
            <p>{stats.remaining}</p>
          </div>
        </div>
      </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <SearchBar value={search} onChange={setSearch} />
          <FilterBar active={filter} onChange={setFilter} stats={stats} />
          <select 
            className="sort-select" 
            value={sort} 
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="default">Default Sort</option>
            <option value="name">Name (A-Z)</option>
            <option value="recent">Recently Added</option>
            <option value="lastVisited">Last Visited</option>
          </select>
        </div>
        <div className="toolbar-right">
          <button onClick={handleNextUnvisited} className="btn btn-primary">
            Next Unvisited
          </button>
          <button onClick={() => setShowAddForm(true)} className="btn btn-ghost">
            + Add Clan
          </button>
          <button onClick={() => setShowImport(true)} className="btn btn-ghost">
            Import
          </button>
          <button onClick={handleExport} className="btn btn-ghost">
            Export
          </button>
        </div>
      </div>

      <ClanList 
        clans={clans} 
        onVisit={handleVisit} 
        onUnvisit={handleUnvisit}
        onEdit={setEditingClan}
        onDelete={setDeletingClan}
        highlightId={highlightId}
      />

      {(showAddForm || editingClan) && (
        <ClanForm
          clan={editingClan}
          onSubmit={async (data) => {
            if (editingClan) {
              await updateClan(editingClan.id, data);
              addToast('Clan updated', 'success');
            } else {
              await addClan(data);
              addToast('Clan added', 'success');
            }
            setShowAddForm(false);
            setEditingClan(null);
          }}
          onClose={() => {
            setShowAddForm(false);
            setEditingClan(null);
          }}
        />
      )}

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImportComplete={() => {
            setShowImport(false);
            refresh();
            addToast('Import successful', 'success');
          }}
        />
      )}

      {deletingClan && (
        <ConfirmDialog
          title="Delete Clan"
          message={`Are you sure you want to delete ${deletingClan.name}? This cannot be undone.`}
          confirmText="Delete"
          onConfirm={async () => {
            try {
              await removeClan(deletingClan.id);
              addToast('Clan deleted', 'info');
            } catch {
              addToast('Failed to delete', 'error');
            }
            setDeletingClan(null);
          }}
          onCancel={() => setDeletingClan(null)}
        />
      )}

      {undoState && (
        <div className="undo-bar">
          <span>Marked as visited</span>
          <button onClick={handleUndo} className="btn btn-ghost btn-sm">Undo</button>
        </div>
      )}
    </div>
  );
}
