import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { jwtDecode } from 'jwt-decode'; // Correct import statement
import { User } from '../models/user';

const TOKEN_KEY = 'auth-token';
const USER_KEY = 'auth-user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private tokenSubject = new BehaviorSubject<string | null>(this.getToken());
  public token$ = this.tokenSubject.asObservable();
  private currentUserId: string | null = null;

  private userSubject = new BehaviorSubject<User | null>(this.getUser());
  public user$ = this.userSubject.asObservable();



  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<{ token: string, user: User }> {
    return this.http.post<{ token: string, user: User }>(`http://localhost:3000/auth/login`, { email, password }).pipe(
      tap((response) => {
        this.saveToken(response.token, response.user);
      })
    );
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

  saveToken(token: string, user: User): void {
    console.log('AuthService: Saving token:', token, user);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));

    this.tokenSubject.next(token); // Emit the new token
    this.userSubject.next(user);   // Emit the new user

    const decoded = this.decodeToken(token);
    this.currentUserId = decoded?.id ?? null;
  }

  getToken(): string | null {
    const token = localStorage.getItem(TOKEN_KEY);
    console.log('AuthService: Retrieved token:', token);
    return token;
  }

  getUser(): User | null {
    const userJson = localStorage.getItem(USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
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
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.tokenSubject.next(null); // Emit null to indicate logout
    this.userSubject.next(null);  // Emit null user
    this.currentUserId = null;
  }
}
