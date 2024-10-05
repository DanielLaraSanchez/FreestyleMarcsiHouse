import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import {jwtDecode} from 'jwt-decode'; // Correcting the import
const TOKEN_KEY = 'auth-token';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private tokenSubject = new BehaviorSubject<string | null>(this.getToken());
  public token$ = this.tokenSubject.asObservable();

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<any> {
    return this.http.post(`http://localhost:3000/auth/login`, { email, password });
  }

  loginWithGoogle(): void {
    // Redirect the browser to the backend endpoint that initiates Google authentication
    window.location.href = 'http://localhost:3000/auth/google';
  }

  signup(name: string, email: string, password: string): Observable<any> {
    return this.http.post(`http://localhost:3000/auth/signup`, { name, email, password });
  }

  saveToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this.tokenSubject.next(token);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.tokenSubject.next(null);
  }

  decodeToken(token: string): any {
    try {
      return jwtDecode(token);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }
}