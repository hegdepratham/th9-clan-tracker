export default function Toast({ toasts, onRemove }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <span>{toast.message}</span>
          <button 
            onClick={() => onRemove(toast.id)} 
            style={{background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.25rem'}}
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
