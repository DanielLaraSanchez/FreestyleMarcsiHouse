import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent implements OnInit {

  // Define the FormGroup
  signupForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {
    // Initialize the form with form controls and validators
    this.signupForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(4)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      rememberMe: [false]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {}

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

  // Handle form submission
  onSubmit(): void {
    if (this.signupForm.valid) {
      const { username, email, password, rememberMe } = this.signupForm.value;
      // Implement your registration logic here (e.g., API call)
      console.log('Username:', username);
      console.log('Email:', email);
      console.log('Password:', password);
      console.log('Remember Me:', rememberMe);

      // Example: Redirect to the login page upon successful registration
      this.router.navigate(['/login']);
    } else {
      // Handle form errors
      this.signupForm.markAllAsTouched();
      console.log('Form is invalid');
    }
  }

}