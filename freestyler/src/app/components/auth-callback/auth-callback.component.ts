import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user';

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
    // Get token and user from query parameters
    this.route.queryParams.subscribe(params => {
      console.log(params, "params");
      const token = params['token'];
      const userJson = params['user'];

      if (token && userJson) {
        // Parse the user JSON string
        const parsedUser = JSON.parse(userJson);

        // Map to the User interface
        const user: User = {
          _id: parsedUser.id, // Map the `_id` correctly
          name: parsedUser.name,
          profilePicture: parsedUser.profilePicture, // Default or map if available
          stats: undefined, // Or map if you have stats
          isOnline: false, // Default or set according to your needs
          status: '', // Default or set according to your needs
          isInBattlefield: false // Default or set according to your needs
        };

        console.log('AuthCallbackComponent: Token and User received:', token, user);

        // Save the token and user, then navigate
        this.authService.saveToken(token, user);
        this.router.navigate(['/chat']);
      } else {
        // Handle error
        console.error('AuthCallbackComponent: No token or user received');
        this.router.navigate(['/login']);
      }
    });
  }
}

