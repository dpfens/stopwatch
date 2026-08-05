import { 
  Annotatable, 
  Objective, 
  CreationModificationDates,
  StopwatchState,
  IContextualStopwatchController,
  UniqueIdentifier,
} from "../../models/sequence/interfaces";
import { AnnotationController } from "../annotation-controller";

/**
 * Implementation of the StopwatchInterface that manages stopwatch state
 * and provides operations for controlling and analyzing stopwatch events.
 */
export class ContextualStopwatchController extends AnnotationController implements IContextualStopwatchController {
  private state: StopwatchState = { sequence: [], lap: null };
  private objective?: Objective;
  
  /**
   * Creates a new StopwatchController instance
   * @param id Unique identifier for this stopwatch
   * @param title Display title for the stopwatch
   * @param description Optional detailed description
   * @param existingState Optional existing state to initialize with
   * @param objective Optional performance objective
   */
  constructor(
    id: UniqueIdentifier, 
    annotation: Annotatable, 
    objective?: Objective
  ) {
    super(id, annotation);
    
    // Initialize metadata with creation timestamp
    const now = this.createActionTracking();
    this.metadata = {
      creation: now,
      lastModification: now
    };
    
    // Set objective if provided
    if (objective) {
      this.objective = objective;
    }
  }
  
  /**
   * Gets the stopwatch metadata
   * @returns Metadata object
   */
  getMetadata(): CreationModificationDates {
    return { ...this.metadata };
  }
  
  /**
   * Sets the performance objective
   * @param objective Objective to set
   */
  setObjective(objective: Objective): void {
    this.objective = objective;
    this.updateLastModified(new Date());
  }
  
  /**
   * Gets the current performance objective
   * @returns Current objective or undefined if none set
   */
  getObjective(): Objective | undefined {
    return this.objective;
  }
  
  /**
   * Evaluates current performance based on the objective
   * @returns Performance score, or undefined if no objective set
   */
  evaluatePerformance(): number | undefined {
    if (!this.objective) {
      return undefined;
    }
    
    return this.objective.evaluate(this.state);
  }
  
  /**
   * Gets a copy of the current state
   * @returns Current state
   */
  getState(): StopwatchState {
    return { ...this.state };
  }
}