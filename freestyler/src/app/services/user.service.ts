import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_URL = 'http://localhost:3000';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  constructor(private http: HttpClient) {}

  getUsers(): Observable<any> {
    return this.http.get(`${API_URL}/users`);
  }

  getUserById(id: string): Observable<any> {
    return this.http.get(`${API_URL}/users/${id}`);
  }

  // Add this method
  getUsersByIds(ids: string[]): Observable<any> {
    return this.http.post(`${API_URL}/users/getByIds`, { ids });
  }
}
