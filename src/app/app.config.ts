import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { GoogleAnalyticsService } from './services/analytics/google-analytics.service';
import { provideServiceWorker } from '@angular/service-worker';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { credentialsInterceptor } from './interceptors/credentials.interceptor';


export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideAppInitializer(() => {
      const gaService = inject(GoogleAnalyticsService);
      gaService.initialize('G-J0ZMYBT112'); // Your GA4 measurement ID
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
    provideHttpClient(
      withInterceptors([credentialsInterceptor])
    ),
  ]
};