import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { jwtDecode } from 'jwt-decode'; // Correct import statement

const TOKEN_KEY = 'auth-token';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private tokenSubject = new BehaviorSubject<string | null>(this.getToken());
  public token$ = this.tokenSubject.asObservable();
  private currentUserId: string | null = null;
  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<any> {
    return this.http.post(`http://localhost:3000/auth/login`, { email, password });
  }

  loginWithGoogle(): void {
    window.location.href = 'http://localhost:3000/auth/google';
  }

  signup(name: string, email: string, password: string): Observable<any> {
    return this.http.post(`http://localhost:3000/auth/signup`, { name, email, password });
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  saveToken(token: string): void {
    console.log('AuthService: Saving token:', token);
    localStorage.setItem(TOKEN_KEY, token);
    this.tokenSubject.next(token); // Emit the new token
    const decoded = this.decodeToken(token);
    this.currentUserId = decoded?.id ?? null;
    console.log("here", this.currentUserId)

  }

  getToken(): string | null {
    const token = localStorage.getItem(TOKEN_KEY);
    console.log('AuthService: Retrieved token:', token);
    return token;
  }

  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  decodeToken(token: string): any {
    try {
      const decoded = jwtDecode<{ id: string }>(token);
      console.log('AuthService: Decoded token:', decoded);
      return decoded;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  logout(): void {
    // localStorage.removeItem(TOKEN_KEY);
    this.tokenSubject.next(null); // Emit null to indicate logout
    // this.currentUserId = null;
  }
}
