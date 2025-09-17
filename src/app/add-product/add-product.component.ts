// src/app/add-product/add-product.component.ts
import { Component } from '@angular/core';
import { ProdService, Product } from '../prod.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-add-product',
  templateUrl: './add-product.component.html',
})
export class AddProductComponent {
  model: Product = {
    id: 0, name: '', description: '', price: 0, units: 0,
  };
  error = '';
  saving = false;

  constructor(private svc: ProdService, private router: Router) {}

  submit() {
    this.error = '';
    if (!this.model.id || !this.model.name) {
      this.error = 'ID and Name are required';
      return;
    }
    this.saving = true;
    this.svc.addProduct(this.model).subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(['/products']);
      },
      error: (err) => {
        this.saving = false;
        this.error = err?.error?.error || 'Add failed';
        console.error(err);
      },
    });
  }
}
