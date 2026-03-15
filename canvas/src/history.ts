import { executeCommand, type MapCommand, type MapState } from './command.js';

export class CommandHistory {
  private undoStack: { command: MapCommand; inverse: MapCommand }[] = [];

  private redoStack: { command: MapCommand; inverse: MapCommand }[] = [];

  private _currentState: MapState;

  private savedState: MapState;

  constructor(initialState: MapState) {
    this._currentState = initialState;
    this.savedState = initialState;
  }

  get currentState(): MapState {
    return this._currentState;
  }

  execute(command: MapCommand): MapState {
    const result = executeCommand(command, this._currentState);
    this.undoStack.push({ command, inverse: result.inverse });
    this.redoStack = [];
    this._currentState = result.state;
    return this._currentState;
  }

  undo(): MapState | null {
    const entry = this.undoStack.pop();
    if (!entry) return null;
    const result = executeCommand(entry.inverse, this._currentState);
    this.redoStack.push({ command: entry.command, inverse: result.inverse });
    this._currentState = result.state;
    return this._currentState;
  }

  redo(): MapState | null {
    const entry = this.redoStack.pop();
    if (!entry) return null;
    const result = executeCommand(entry.command, this._currentState);
    this.undoStack.push({ command: entry.command, inverse: result.inverse });
    this._currentState = result.state;
    return this._currentState;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  get isDirty(): boolean {
    return this._currentState !== this.savedState;
  }

  markSaved(): void {
    this.savedState = this._currentState;
  }
}
