// src/app/core/guards/auth.guard.ts
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthenticationService } from '../services/authentication/authentication.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthenticationService);
  const router = inject(Router);

  // Check if user is authenticated
  const authStatus = await authService.checkAuthStatus();

  if (authStatus.authenticated) {
    return true;
  }

  // Store the attempted URL for redirecting after login
  router.navigate(['/login'], { 
    queryParams: { returnUrl: state.url }
  });
  return false;
};