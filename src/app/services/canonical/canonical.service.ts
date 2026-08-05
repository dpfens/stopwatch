import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class CanonicalService {
  private linkEl: HTMLLinkElement | null = null;

  constructor(@Inject(DOCUMENT) private doc: Document) {}

  set(url: string): void {
    if (!this.linkEl) {
      this.linkEl = this.doc.querySelector('link[rel="canonical"]');
      if (!this.linkEl) {
        this.linkEl = this.doc.createElement('link');
        this.linkEl.setAttribute('rel', 'canonical');
        this.doc.head.appendChild(this.linkEl);
      }
    }
    this.linkEl.setAttribute('href', url);
  }
}