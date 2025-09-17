// src/app/update-product/update-product.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProdService, Product } from '../prod.service';

@Component({
  selector: 'app-update-product',
  templateUrl: './update-product.component.html',
})
export class UpdateProductComponent implements OnInit {
  id = '';                     // Mongo _id
  model: Product | null = null;
  error = '';
  saving = false;
  loading = true;

  constructor(
    private svc: ProdService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') || '';
    this.load();
  }

  load(): void {
    this.loading = true;
    this.svc.getProducts().subscribe({
      next: (list: Product[]) => {
        this.model = list.find((p: Product) => p._id === this.id) ?? null;
        this.loading = false;
        if (!this.model) this.error = 'Product not found';
      },
      error: (err: any) => {
        console.error(err);
        this.loading = false;
        this.error = 'Failed to load';
      },
    });
  }

  submit(): void {
    if (!this.model) return;
    this.saving = true;
    this.error = '';
    this.svc.updateProduct(this.id, this.model).subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(['/products']);
      },
      error: (err: any) => {
        console.error(err);
        this.saving = false;
        this.error = 'Update failed';
      },
    });
  }
}
