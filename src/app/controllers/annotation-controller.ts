import { TZDate } from "../models/date";
import { 
  Annotatable, 
  CreationModificationDates,
  ActionTracking,
  IAnnotatableController,
  UniqueIdentifier,
} from "../models/sequence/interfaces";

/**
 * Implementation of the StopwatchInterface that manages stopwatch state
 * and provides operations for controlling and analyzing stopwatch events.
 */
export class AnnotationController implements IAnnotatableController {
  protected id: UniqueIdentifier;  
  protected annotation: Annotatable;
  protected metadata: CreationModificationDates;
  
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
  ) {
    this.id = id;
    this.annotation = annotation;

    const now = this.createActionTracking();
    this.metadata = {
      creation: now,
      lastModification: now
    };
  }
  
  /**
   * Gets the stopwatch annotation
   * @returns Annotation object
   */
  getAnnotation(): Annotatable {
    return { ...this.annotation };
  }
  
  /**
   * Updates the stopwatch annotation
   * @param title New title
   * @param description New description
   */
  updateAnnotation(title: string, description: string): void {
    this.annotation = { title, description };
    this.updateLastModified(new Date());
  }
  
  /**
   * Gets the unique ID of this stopwatch
   * @returns Stopwatch ID
   */
  getId(): string | number {
    return this.id;
  }
  

  /**
   * Creates an action tracking object for the current time
   * @param timestamp Optional timestamp, defaults to now
   * @returns Action tracking object
   */
  protected createActionTracking(timestamp: Date = new Date()): ActionTracking {
    return {
      timestamp: new TZDate(timestamp)
    };
  }
  
  /**
   * Updates the last modified timestamp
   * @param timestamp Time of modification
   */
  protected updateLastModified(timestamp: Date): void {
    this.metadata.lastModification = this.createActionTracking(timestamp);
  }
}