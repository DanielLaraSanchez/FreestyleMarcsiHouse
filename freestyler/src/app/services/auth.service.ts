import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const TOKEN_KEY = 'auth-token';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<any> {
    return this.http.post('/login', { email, password });
  }

  signup(name: string, email: string, password: string): Observable<any> {
    return this.http.post(`http://localhost:3000/auth/signup`, { name, email, password });
  }

  saveToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
  }
}