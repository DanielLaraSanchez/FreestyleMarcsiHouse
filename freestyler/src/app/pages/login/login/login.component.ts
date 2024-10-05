import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  errorMessage: string = '';
  loginForm: FormGroup;

  constructor(private auth: AuthService, private router: Router, private fb: FormBuilder) {

this.loginForm = this.fb.group({
  username: ['', [Validators.required, Validators.minLength(4)]],
  email: ['', [Validators.required, Validators.email]],
  password: ['', [Validators.required, Validators.minLength(6)]],
  confirmPassword: ['', Validators.required],
  rememberMe: [false]
}, { validators: this.passwordMatchValidator });
  }

  onSubmit() {
    // if (this.loginForm.invalid) {
    //   // Handle form validation errors
    //   return;
    // }

    const email = this.loginForm.get('email')?.value;
    const password = this.loginForm.get('password')?.value;

    this.auth.login(email, password).subscribe({
      next: (data) => {
        this.auth.saveToken(data.token);
        console.log("happening for login normal")
        this.router.navigate(['/chat']); // Redirect after login
      },
      error: (error) => {
        this.errorMessage = error.error.message;
      },
    });
  }

  // Custom validator to check if password and confirmPassword match
  passwordMatchValidator(form: AbstractControl): ValidationErrors | null {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    if (password !== confirmPassword) {
      form.get('confirmPassword')?.setErrors({ mismatch: true });
      return { mismatch: true };
    } else {
      // If confirmPassword has other errors, retain them
      const errors = form.get('confirmPassword')?.errors;
      if (errors) {
        delete errors['mismatch'];
        if (Object.keys(errors).length === 0) {
          form.get('confirmPassword')?.setErrors(null);
        } else {
          form.get('confirmPassword')?.setErrors(errors);
        }
      }
      return null;
    }
  }

  loginWithGoogle() {
    this.auth.loginWithGoogle();
  }
}
