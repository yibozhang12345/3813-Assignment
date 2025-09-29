import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  username = '';
  password = '';
  email = '';
  message = '';
  errorMessage = '';

  constructor(private auth: AuthService) {}

  onRegister() {
    this.auth.register({
      username: this.username,
      password: this.password,
      email: this.email
    }).subscribe({
      next: () => {
        this.message = 'Registration successful. Please log in.';
        this.errorMessage = '';
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Registration failed';
      }
    });
  }
}
