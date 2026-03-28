import './WelcomeScreen.css';

interface WelcomeScreenProps {
  onNewMap: () => void;
  onOpenMap: () => void;
}

export const WelcomeScreen = ({ onNewMap, onOpenMap }: WelcomeScreenProps) => (
  <div className="welcome-screen">
    <div className="welcome-content">
      <h1 className="welcome-title">hexerei</h1>
      <p className="welcome-subtitle">Spatial IDE for hex maps</p>
      <div className="welcome-actions">
        <button className="welcome-btn" onClick={onNewMap}>
          Create New Map
          <span className="welcome-shortcut">Cmd+N</span>
        </button>
        <button className="welcome-btn" onClick={onOpenMap}>
          Open Existing Map
          <span className="welcome-shortcut">Cmd+O</span>
        </button>
      </div>
      <div className="welcome-hints">
        <span>Cmd+K Command Bar</span>
        <span>Cmd+S Save</span>
        <span>Cmd+Z Undo</span>
      </div>
    </div>
  </div>
);
