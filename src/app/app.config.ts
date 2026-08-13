import { ApplicationConfig, inject, provideAppInitializer, provideZonelessChangeDetection, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';


import { routes } from './app.routes';
import { provideClientHydration, withEventReplay, withNoIncrementalHydration } from '@angular/platform-browser';
import { GoogleAnalyticsService } from './services/analytics/google-analytics.service';
import { provideServiceWorker } from '@angular/service-worker';
import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { credentialsInterceptor } from './interceptors/credentials.interceptor';


export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(withEventReplay(), withNoIncrementalHydration()),
    provideAppInitializer(() => {
      const gaService = inject(GoogleAnalyticsService);
      gaService.initialize('G-J0ZMYBT112');
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
    provideHttpClient(withInterceptors([credentialsInterceptor])
    ),
  ]
};