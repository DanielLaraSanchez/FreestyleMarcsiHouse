import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth-callback',
  template: '<p>Redirecting...</p>',
})
export class AuthCallbackComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Get token from query parameters
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (token) {
        // Save the token and navigate to the home page
        this.authService.saveToken(token);
        this.router.navigate(['/']);
      } else {
        // Handle error
        console.error('No token received');
        this.router.navigate(['/login']);
      }
    });
  }
}