import { executeCommand, type MapCommand, type MapState } from './command.js';

export class CommandHistory {
  private undoStack: MapCommand[] = [];
  private redoStack: MapCommand[] = [];
  public currentState: MapState;
  private savedState: MapState;

  constructor(initialState: MapState) {
    this.currentState = initialState;
    this.savedState = initialState;
  }

  execute(command: MapCommand): MapState {
    const result = executeCommand(command, this.currentState);
    this.undoStack.push(result.inverse);
    this.redoStack = [];
    this.currentState = result.state;
    return this.currentState;
  }

  undo(): MapState | null { return null; }
  redo(): MapState | null { return null; }

  get canUndo(): boolean { return this.undoStack.length > 0; }
  get canRedo(): boolean { return this.redoStack.length > 0; }
  get isDirty(): boolean { return this.currentState !== this.savedState; }
  
  markSaved(): void { this.savedState = this.currentState; }
}
