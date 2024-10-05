import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../models/user';

const API_URL = 'http://localhost:3000';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  constructor(private http: HttpClient) {}

  // Method to get all users (if needed)
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${API_URL}/users`);
  }

  // Method to get a user by ID
  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${API_URL}/users/${id}`);
  }

  // Method to get users by IDs (if needed)
  getUsersByIds(ids: string[]): Observable<User[]> {
    return this.http.post<User[]>(`${API_URL}/users/getByIds`, { ids });
  }

  // **Method to get online users**
  getOnlineUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${API_URL}/users/online`);
  }
}
