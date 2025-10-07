import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoginRequest } from '../../models/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="login-form">
        <h2>Chat System Login</h2>

        <form (ngSubmit)="onLogin()" #loginForm="ngForm">
          <div class="form-group">
            <label for="username">Username:</label>
            <input
              type="text"
              id="username"
              name="username"
              [(ngModel)]="credentials.username"
              required
              #username="ngModel"
              placeholder="Please enter username">
            <div *ngIf="username.invalid && username.touched" class="error">
              Username cannot be empty
            </div>
          </div>

          <div class="form-group">
            <label for="password">Password:</label>
            <input
              type="password"
              id="password"
              name="password"
              [(ngModel)]="credentials.password"
              required
              #password="ngModel"
              placeholder="Please enter password">
            <div *ngIf="password.invalid && password.touched" class="error">
              Password cannot be empty
            </div>
          </div>

          <div *ngIf="errorMessage" class="error">
            {{ errorMessage }}
          </div>

          <button
            type="submit"
            class="btn btn-primary"
            [disabled]="!loginForm.form.valid || isLoading">
            {{ isLoading ? 'Logging in...' : 'Login' }}
          </button>
        </form>

        <div class="login-help">
          <p>Default super administrator account:</p>
          <p>Username: super, Password: 123</p>
          <button class="btn btn-secondary" (click)="showRegister = !showRegister">
            {{ showRegister ? 'Back to Login' : 'Register New User' }}
          </button>
        </div>

        <div *ngIf="showRegister" class="register-form">
          <h3>Register New User</h3>
          <form (ngSubmit)="onRegister()" #registerForm="ngForm">
            <div class="form-group">
              <label for="newUsername">Username:</label>
              <input
                type="text"
                id="newUsername"
                name="newUsername"
                [(ngModel)]="newUser.username"
                required
                placeholder="Please enter username">
            </div>

            <div class="form-group">
              <label for="email">Email:</label>
              <input
                type="email"
                id="email"
                name="email"
                [(ngModel)]="newUser.email"
                required
                placeholder="Please enter email">
            </div>

            <div class="form-group">
              <label for="newPassword">Password:</label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                [(ngModel)]="newUser.password"
                required
                placeholder="Please enter password (at least 6 characters)">
            </div>

            <button type="submit" class="btn btn-primary">Register</button>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .login-form {
      background: white;
      padding: 40px;
      border-radius: 10px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      width: 100%;
      max-width: 400px;
    }

    .login-form h2 {
      text-align: center;
      margin-bottom: 30px;
      color: #333;
    }

    .login-help {
      margin-top: 20px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }

    .login-help p {
      margin: 5px 0;
    }

    .btn-secondary {
      background-color: #6c757d;
      color: white;
      margin-top: 10px;
    }

    .btn-secondary:hover {
      background-color: #545b62;
    }

    .register-form {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #eee;
    }

    .register-form h3 {
      text-align: center;
      margin-bottom: 20px;
      color: #333;
    }
  `]
})
export class LoginComponent {
  credentials: LoginRequest = {
    username: '',
    password: ''
  };

  newUser = {
    username: '',
    email: '',
    password: ''
  };

  errorMessage = '';
  isLoading = false;
  showRegister = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onLogin(): void {
    if (!this.credentials.username || !this.credentials.password) {
      this.errorMessage = 'Please fill in username and password';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.credentials).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage = response.message || 'Login failed';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Login failed, please try again';
        console.error('Login error:', error);
      }
    });
  }

  onRegister(): void {
    if (!this.newUser.username || !this.newUser.email || !this.newUser.password) {
      this.errorMessage = 'Please fill in all registration information';
      return;
    }

    if (this.newUser.password.length < 6) {
      this.errorMessage = 'Password needs at least 6 characters';
      return;
    }

    this.authService.registerUser(this.newUser).subscribe({
      next: (response) => {
        if (response.success) {
          alert('Registration successful! Please login with your new account.');
          this.showRegister = false;
          this.newUser = { username: '', email: '', password: '' };
        }
      },
      error: (error) => {
        this.errorMessage = 'Registration failed, please try again';
        console.error('Register error:', error);
      }
    });
  }
}