import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Product {
  _id?: string;
  id: number;
  name: string;
  description: string;
  price: number;
  units: number;
}

@Injectable({ providedIn: 'root' })
export class ProdService {
  private api = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.api}/products`);
  }

  addProduct(prod: Product) {
    return this.http.post(`${this.api}/add`, prod);
  }

  updateProduct(id: string, prod: Product) {
    return this.http.put(`${this.api}/update/${id}`, prod);
  }

  deleteProduct(id: string) {
    return this.http.delete(`${this.api}/delete/${id}`);
  }
}
