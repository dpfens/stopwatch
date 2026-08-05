import {ApplicationRef, Component, computed, DOCUMENT, effect, inject, PLATFORM_ID, Renderer2} from '@angular/core';
import {NavigationEnd, Router, RouterOutlet} from '@angular/router';
import { HeaderComponent } from './components/shared/header/header.component';
import { SettingsService } from './services/settings/settings.service';
import { isPlatformBrowser } from '@angular/common';
import { SwUpdate } from '@angular/service-worker';
import {concat, interval} from 'rxjs';
import {filter, first} from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Time } from './utilities/constants';
import { VERSION } from './version';
import { TimeService } from './services/time/time.service';
import { CanonicalService } from './services/canonical/canonical.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Stopwatch';
  version = VERSION.version;
  private readonly platformId = inject(PLATFORM_ID)
  private renderer = inject(Renderer2);
  private document = inject(DOCUMENT);
  private readonly settings = inject(SettingsService);
  private readonly updates = inject(SwUpdate);
  private appRef = inject(ApplicationRef);
  protected readonly snackbar = inject(MatSnackBar);
  protected readonly time = inject(TimeService);

  private readonly router = inject(Router);
  private readonly canonical = inject(CanonicalService);

  rawBuildDate = VERSION.buildDate;
  buildDate = this.time.dateTimeFormatter.format(new Date(VERSION.buildDate));
  private baseUrl = 'https://stopwatch.dougfenstermacher.com';

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      effect(() => {
        const theme = this.settings.getEffectiveValue('theme');
        this.renderer.setStyle(this.document.body, 'color-scheme', theme);
      });

      const appIsStable$ = this.appRef.isStable.pipe(first((isStable) => isStable === true));
      const everyHour$ = interval(Time.ONE_HOUR);
      const everyHourOnceAppIsStable$ = concat(appIsStable$, everyHour$);

      everyHourOnceAppIsStable$.subscribe(async () => {
        try {
          const updateFound = await this.updates.checkForUpdate();
          if (updateFound) {
            const snackBarRef = this.snackbar.open("A new application version is available", 'Load');
            snackBarRef.onAction().subscribe(() => {
              window.location.reload();
            });
            setTimeout(() => this.snackbar.dismiss(), Time.ONE_MINUTE);
          }
        } catch (err) {
          console.error('Failed to check for updates:', err);
        }
      });
    }
  }

  ngOnInit(): void {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        this.canonical.set(`${this.baseUrl}${e.urlAfterRedirects}`);
      });
  }
}
