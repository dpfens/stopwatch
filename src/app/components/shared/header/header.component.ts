import { Component, inject} from '@angular/core';
import {FormBuilder, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HeaderActionService } from '../../../services/action/header-action.service';
import { GLOBAL } from '../../../utilities/constants';
import { GoogleAnalyticsService } from '../../../services/analytics/google-analytics.service';

@Component({
  selector: 'app-header',
  imports: [
    RouterLink, RouterLinkActive,
    MatToolbarModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatAutocompleteModule,
    FormsModule, ReactiveFormsModule
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  private formBuilder = inject(FormBuilder);
  public readonly headerActionService = inject(HeaderActionService);
  private readonly analytics = inject(GoogleAnalyticsService);

  searchForm = this.formBuilder.group({
    query: '',
  })

  hasMenu(): boolean {
    return this.headerActionService.has(GLOBAL.SIDENAV_TOGGLE);
  }

  executeMenuToggle() {
    this.headerActionService.execute(GLOBAL.SIDENAV_TOGGLE);
  }

  hasCreate(): boolean {
    return this.headerActionService.has(GLOBAL.CREATE);
  }

  async createNew(): Promise<void> {
    this.headerActionService.execute(GLOBAL.CREATE);
  }

  private getShareData(): ShareData {
    const full = {
      url: location.href,
      title: "Multi-Stopwatch - Epochron",
      text: "A stopwatch that actually handles multiple timers. Runs in your browser, keeps your data local and works offline.",
    };
    
    // Try full data first, then progressively simpler versions
    if (navigator.canShare?.(full)) return full;
    
    const urlAndTitle = { url: location.href, title: full.title };
    if (navigator.canShare?.(urlAndTitle)) return urlAndTitle;
    
    const urlOnly = { url: location.href };
    if (navigator.canShare?.(urlOnly)) return urlOnly;
    
    return full; // Fallback, let share() handle it
  }

  canShare(): boolean {
    return ('share' in navigator) && ('canShare' in navigator) && navigator.canShare({ url: location.href });
  }

  async executeShare() {
    try {
      await navigator.share(this.getShareData());
      this.analytics.trackEvent({
        category: 'social',
        action: 'share',
        label: document.title
      });
    } catch (err) {
      console.error('Share failed:', err);
    }
  }


  hasSearch(): boolean {
    return this.headerActionService.has(GLOBAL.SEARCH);
  }

  async executeSearch(): Promise<void> {

  } 
}
