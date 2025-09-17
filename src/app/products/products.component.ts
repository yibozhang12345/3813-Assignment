// src/app/products/products.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ProdService, Product } from '../prod.service';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
})
export class ProductsComponent implements OnInit {
  loading = false;
  error = '';
  products: Product[] = [];

  constructor(private svc: ProdService, private router: Router) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.svc.getProducts().subscribe({
      next: (list: Product[]) => {
        this.products = list;
        this.loading = false;
      },
      error: (err: any) => {
        console.error(err);
        this.error = 'Failed to load products';
        this.loading = false;
      },
    });
  }

  toAdd(): void {
    this.router.navigate(['/products/add']);
  }

  toEdit(p: Product): void {
    if (!p._id) return;
    this.router.navigate(['/products', p._id, 'edit']);
  }

  remove(p: Product): void {
    if (!p._id) return;
    if (!confirm(`Delete "${p.name}"?`)) return;
    this.svc.deleteProduct(p._id).subscribe({
      next: () => this.load(),
      error: (err: any) => {
        console.error(err);
        this.error = 'Delete failed';
      },
    });
  }

  trackById = (_: number, p: Product) => p._id ?? p.id;
}
