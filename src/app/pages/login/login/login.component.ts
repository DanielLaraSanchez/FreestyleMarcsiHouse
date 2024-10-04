import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  
  loginForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {
    // Initialize the form with form controls and validators
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
      rememberMe: [false]
    });
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.loginForm.valid) {
      const { username, password, rememberMe } = this.loginForm.value;
      // Implement your authentication logic here
      console.log('Username:', username);
      console.log('Password:', password);
      console.log('Remember Me:', rememberMe);

      // Example: Redirect to the dashboard on successful login
      this.router.navigate(['/battlefield']);
    } else {
      // Handle form errors
      console.log('Form is invalid');
    }
  }

}