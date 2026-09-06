'use client';

import React, { useEffect, useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Tag,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  Layers,
  DollarSign,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { formatRupiah, formatMultiUnitStock } from '@/lib/utils';
import { warungStore } from '@/lib/store/warungStore';
import { Product, Category, ProductUnit } from '@/types';

export default function BarangPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [baseUnit, setBaseUnit] = useState('Pcs');
  const [minimumStock, setMinimumStock] = useState<number>(5);
  const [initialStock, setInitialStock] = useState<number>(0);
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Multi-Units State
  const [units, setUnits] = useState<Omit<ProductUnit, 'id' | 'product_id'>[]>([
    { unit_name: 'Pcs', conversion_to_base: 1, cost_price: 1000, selling_price: 1500, is_default: true },
  ]);

  const loadData = () => {
    warungStore.initializeDefaultDataIfEmpty();
    const prods = warungStore.getProducts();
    const cats = warungStore.getCategories();
    setProducts(prods);
    setCategories(cats);
    if (cats.length > 0 && !categoryId) {
      setCategoryId(cats[0].id);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setCategoryId(categories[0]?.id || '');
    setBaseUnit('Pcs');
    setMinimumStock(5);
    setInitialStock(0);
    setImageUrl('');
    setIsActive(true);
    setUnits([
      { unit_name: 'Pcs', conversion_to_base: 1, cost_price: 1000, selling_price: 1500, is_default: true },
    ]);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setCategoryId(p.category_id);
    setBaseUnit(p.base_unit);
    setMinimumStock(p.minimum_stock);
    setInitialStock(p.current_stock_base);
    setImageUrl(p.image_url || '');
    setIsActive(p.is_active);
    setUnits(p.units.map((u) => ({ ...u })));
    setIsModalOpen(true);
  };

  const handleUnitChange = (index: number, field: keyof Omit<ProductUnit, 'id' | 'product_id'>, value: any) => {
    const updated = [...units];
    updated[index] = { ...updated[index], [field]: value };
    setUnits(updated);
  };

  const addUnitRow = () => {
    setUnits([
      ...units,
      {
        unit_name: 'Dus',
        conversion_to_base: 12,
        cost_price: 10000,
        selling_price: 12000,
        is_default: false,
      },
    ]);
  };

  const removeUnitRow = (index: number) => {
    if (units.length <= 1) return;
    setUnits(units.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const formattedUnits: ProductUnit[] = units.map((u, i) => ({
      id: editingProduct?.units[i]?.id || `unit-${Date.now()}-${i}`,
      product_id: editingProduct?.id || '',
      unit_name: u.unit_name || baseUnit,
      conversion_to_base: Number(u.conversion_to_base) || 1,
      cost_price: Number(u.cost_price) || 0,
      selling_price: Number(u.selling_price) || 0,
      is_default: Boolean(u.is_default),
    }));

    if (editingProduct) {
      warungStore.updateProduct({
        ...editingProduct,
        name,
        category_id: categoryId,
        base_unit: baseUnit,
        minimum_stock: Number(minimumStock),
        image_url: imageUrl,
        is_active: isActive,
        units: formattedUnits,
      });
    } else {
      warungStore.addProduct({
        name,
        category_id: categoryId,
        base_unit: baseUnit,
        minimum_stock: Number(minimumStock),
        initial_stock_base: Number(initialStock),
        image_url: imageUrl,
        is_active: isActive,
        units: formattedUnits,
      });
    }

    setIsModalOpen(false);
    loadData();
  };

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
      warungStore.deleteProduct(id);
      loadData();
    }
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-600" />
            Master Data Barang
          </h1>
          <p className="text-sm text-gray-500">Kelola daftar produk, foto, harga modal, harga jual & multi-satuan</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Tambah Produk Baru
        </button>
      </div>

      {/* Search & Category Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === 'ALL' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Semua Kategori
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Products Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-200">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-50 text-gray-400" />
            <p className="text-sm">Tidak ada produk ditemukan.</p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const defaultUnit = product.units.find((u) => u.is_default) || product.units[0];
            return (
              <Card key={product.id} className="flex flex-col justify-between hover:border-emerald-200">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-12 h-12 rounded-xl object-cover border border-gray-200 bg-gray-50"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-gray-900 text-base leading-snug">{product.name}</h3>
                        <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                          <Tag className="w-3 h-3 text-emerald-600" />
                          {product.category_name}
                        </span>
                      </div>
                    </div>
                    <Badge variant={product.is_active ? 'emerald' : 'gray'}>
                      {product.is_active ? 'Aktif' : 'Non-Aktif'}
                    </Badge>
                  </div>

                  {/* Stock Breakdown */}
                  <div className="bg-gray-50 p-3 rounded-xl mb-3 space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Stok Saat Ini:</span>
                      <span className="font-bold text-gray-900">
                        {formatMultiUnitStock(product.current_stock_base, product.base_unit, product.units)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Satuan Dasar:</span>
                      <span className="font-semibold text-emerald-800">{product.base_unit}</span>
                    </div>
                  </div>

                  {/* Multi Units Listing */}
                  <div className="space-y-1.5 mb-4">
                    <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Satuan Penjualan:</span>
                    {product.units.map((unit) => (
                      <div key={unit.id} className="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-none">
                        <div className="font-semibold text-gray-800">
                          {unit.unit_name} {unit.conversion_to_base > 1 && `(${unit.conversion_to_base} ${product.base_unit})`}
                        </div>
                        <div className="text-right">
                          <span className="text-emerald-700 font-bold">{formatRupiah(unit.selling_price)}</span>
                          <span className="text-gray-400 text-[10px] block">Modal: {formatRupiah(unit.cost_price)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => openEditModal(product)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
        maxWidth="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nama Produk *</label>
              <input
                type="text"
                required
                placeholder="Contoh: Rokok A, Indomie Goreng"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Kategori *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Satuan Dasar (Terkecil) *</label>
              <input
                type="text"
                required
                placeholder="Contoh: Batang, Botol, Butir, Pcs, Sachet"
                value={baseUnit}
                onChange={(e) => setBaseUnit(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-gray-400 mt-0.5 block">Digunakan sebagai basis hitung stok akurat</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Minimum Stok Warning *</label>
              <input
                type="number"
                required
                min={0}
                value={minimumStock}
                onChange={(e) => setMinimumStock(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {!editingProduct && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Stok Awal ({baseUnit})</label>
                <input
                  type="number"
                  min={0}
                  value={initialStock}
                  onChange={(e) => setInitialStock(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">URL Foto Produk (Opsional)</label>
              <input
                type="url"
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Multi-Satuan Management */}
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" />
                Pengaturan Multi-Satuan Penjualan
              </h4>
              <button
                type="button"
                onClick={addUnitRow}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg"
              >
                + Tambah Satuan (misal: Bungkus/Dus)
              </button>
            </div>

            <div className="space-y-2">
              {units.map((unit, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2.5 rounded-xl text-xs">
                  <div className="col-span-3">
                    <span className="text-[10px] text-gray-400 block">Nama Satuan</span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bungkus"
                      value={unit.unit_name}
                      onChange={(e) => handleUnitChange(idx, 'unit_name', e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-gray-400 block">Isi ({baseUnit})</span>
                    <input
                      type="number"
                      required
                      min={1}
                      value={unit.conversion_to_base}
                      onChange={(e) => handleUnitChange(idx, 'conversion_to_base', Number(e.target.value))}
                      className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="col-span-3">
                    <span className="text-[10px] text-gray-400 block">Harga Modal (Rp)</span>
                    <input
                      type="number"
                      required
                      min={0}
                      value={unit.cost_price}
                      onChange={(e) => handleUnitChange(idx, 'cost_price', Number(e.target.value))}
                      className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="col-span-3">
                    <span className="text-[10px] text-gray-400 block">Harga Jual (Rp)</span>
                    <input
                      type="number"
                      required
                      min={0}
                      value={unit.selling_price}
                      onChange={(e) => handleUnitChange(idx, 'selling_price', Number(e.target.value))}
                      className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    {units.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeUnitRow(idx)}
                        className="text-rose-500 p-1 hover:bg-rose-100 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-xl text-xs hover:bg-gray-200"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 shadow-sm"
            >
              {editingProduct ? 'Simpan Perubahan' : 'Simpan Produk Baru'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
