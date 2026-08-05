import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class StructuredDataService {
  private readonly SCHEMA_SELECTOR = 'script[type="application/ld+json"]';
  private readonly KEY_ATTRIBUTE = 'data-schema-key';
  
  constructor(@Inject(DOCUMENT) private document: Document) {}

  /**
   * Add or update structured data with a specific key
   * @param key Unique identifier for this schema
   * @param schema The schema object to add
   */
  add(key: string, schema: object): void {
    if (!key || key.trim() === '') {
      console.error('StructuredDataService: key cannot be empty');
      return;
    }

    let script = this.getScriptByKey(key);
    
    if (script) {
      // Update existing script
      script.text = JSON.stringify(schema);
    } else {
      // Create new script
      script = this.document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute(this.KEY_ATTRIBUTE, key);
      script.text = JSON.stringify(schema);
      this.document.head.appendChild(script);
    }
  }

  /**
   * Check if a schema with the given key exists
   * @param key The key to check
   * @returns true if a schema with this key exists
   */
  has(key: string): boolean {
    return this.getScriptByKey(key) !== null;
  }

  /**
   * Remove structured data by key
   * @param key The key of the schema to remove
   * @returns true if removed, false if not found
   */
  remove(key: string): boolean {
    const script = this.getScriptByKey(key);
    
    if (script) {
      this.document.head.removeChild(script);
      return true;
    }
    
    return false;
  }

  /**
   * Clear all structured data schemas
   * @returns The number of schemas removed
   */
  clear(): number {
    const scripts = this.document.head.querySelectorAll(
      `${this.SCHEMA_SELECTOR}[${this.KEY_ATTRIBUTE}]`
    );
    
    scripts.forEach(script => {
      this.document.head.removeChild(script);
    });
    
    return scripts.length;
  }

  /**
   * Get all schema keys currently in the document
   * @returns Array of all schema keys
   */
  getKeys(): string[] {
    const scripts = this.document.head.querySelectorAll(
      `${this.SCHEMA_SELECTOR}[${this.KEY_ATTRIBUTE}]`
    );
    
    return Array.from(scripts)
      .map(script => script.getAttribute(this.KEY_ATTRIBUTE))
      .filter((key): key is string => key !== null);
  }

  /**
   * Get the schema object by key
   * @param key The key to retrieve
   * @returns The schema object or null if not found
   */
  get(key: string): object | null {
    const script = this.getScriptByKey(key);
    
    if (script && script.text) {
      try {
        return JSON.parse(script.text);
      } catch (e) {
        console.error(`StructuredDataService: Failed to parse schema for key "${key}"`, e);
        return null;
      }
    }
    
    return null;
  }

  /**
   * Get script element by key
   * @param key The key to search for
   * @returns The script element or null
   */
  private getScriptByKey(key: string): HTMLScriptElement | null {
    return this.document.head.querySelector(
      `${this.SCHEMA_SELECTOR}[${this.KEY_ATTRIBUTE}="${key}"]`
    ) as HTMLScriptElement | null;
  }
}