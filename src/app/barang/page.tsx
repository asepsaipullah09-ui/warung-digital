'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Tag,
  Image as ImageIcon,
  X,
  Save,
  Loader2,
  FolderPlus,
} from 'lucide-react';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatRupiah, formatMultiUnitStock } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';

import type { Category, Product, ProductUnit } from '@/types';

type UnitForm = {
  id?: string;
  unit_name: string;
  conversion_to_base: number;
  cost_price: number;
  selling_price: number;
  is_default: boolean;
};

type StockMovementRow = {
  product_id: string;
  quantity_base: number;
};

export default function BarangPage() {
  // =========================================================
  // DATA
  // =========================================================

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // =========================================================
  // UI STATE
  // =========================================================

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // =========================================================
  // PRODUCT FORM
  // =========================================================

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [baseUnit, setBaseUnit] = useState('Pcs');
  const [minimumStock, setMinimumStock] = useState(5);
  const [initialStock, setInitialStock] = useState(0);
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [units, setUnits] = useState<UnitForm[]>([
    {
      unit_name: 'Pcs',
      conversion_to_base: 1,
      cost_price: 1000,
      selling_price: 1500,
      is_default: true,
    },
  ]);

  // =========================================================
  // CATEGORY FORM
  // =========================================================

  const [categoryName, setCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // =========================================================
  // HELPERS
  // =========================================================

  const showError = (message: string) => {
    alert(message);
  };

  // =========================================================
  // LOAD DATA
  // =========================================================

  const loadData = async () => {
    if (!supabase) {
      showError(
        'Supabase belum terkonfigurasi. Periksa file .env.local.'
      );
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // -----------------------------------------------------
      // 1. LOAD CATEGORIES
      // -----------------------------------------------------

      const { data: categoryData, error: categoryError } =
        await supabase
          .from('categories')
          .select('*')
          .order('name', { ascending: true });

      if (categoryError) {
        throw new Error(
          `Gagal mengambil kategori: ${categoryError.message}`
        );
      }

      const loadedCategories = (categoryData || []) as Category[];

      // -----------------------------------------------------
      // 2. LOAD PRODUCTS
      // -----------------------------------------------------

      const { data: productData, error: productError } =
        await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

      if (productError) {
        throw new Error(
          `Gagal mengambil produk: ${productError.message}`
        );
      }

      const rawProducts = productData || [];

      // -----------------------------------------------------
      // 3. LOAD PRODUCT UNITS
      // -----------------------------------------------------

      const productIds = rawProducts.map((product) => product.id);

      let loadedUnits: ProductUnit[] = [];

      if (productIds.length > 0) {
        const { data: unitData, error: unitError } =
          await supabase
            .from('product_units')
            .select('*')
            .in('product_id', productIds)
            .order('is_default', { ascending: false });

        if (unitError) {
          throw new Error(
            `Gagal mengambil satuan produk: ${unitError.message}`
          );
        }

        loadedUnits = (unitData || []) as ProductUnit[];
      }

      // -----------------------------------------------------
      // 4. LOAD STOCK MOVEMENTS
      // -----------------------------------------------------

      let movements: StockMovementRow[] = [];

      if (productIds.length > 0) {
        const { data: movementData, error: movementError } =
          await supabase
            .from('stock_movements')
            .select('product_id, quantity_base')
            .in('product_id', productIds);

        if (movementError) {
          throw new Error(
            `Gagal mengambil stok: ${movementError.message}`
          );
        }

        movements = (movementData || []) as StockMovementRow[];
      }

      // -----------------------------------------------------
      // 5. HITUNG STOK PER PRODUK
      // -----------------------------------------------------

      const stockMap = new Map<string, number>();

      movements.forEach((movement) => {
        const current = stockMap.get(movement.product_id) || 0;

        stockMap.set(
          movement.product_id,
          current + Number(movement.quantity_base || 0)
        );
      });

      // -----------------------------------------------------
      // 6. GABUNG DATA
      // -----------------------------------------------------

      const categoryMap = new Map(
        loadedCategories.map((category) => [
          category.id,
          category.name,
        ])
      );

      const unitsMap = new Map<string, ProductUnit[]>();

      loadedUnits.forEach((unit) => {
        const existing = unitsMap.get(unit.product_id) || [];
        existing.push(unit);
        unitsMap.set(unit.product_id, existing);
      });

      const finalProducts: Product[] = rawProducts.map((product) => ({
        id: product.id,
        category_id: product.category_id || '',
        category_name:
          categoryMap.get(product.category_id) || 'Umum',
        name: product.name,
        image_url: product.image_url || '',
        base_unit: product.base_unit,
        minimum_stock: Number(product.minimum_stock || 0),
        is_active: Boolean(product.is_active),
        current_stock_base: stockMap.get(product.id) || 0,
        units: unitsMap.get(product.id) || [],
        created_at: product.created_at,
        updated_at: product.updated_at,
      }));

      setCategories(loadedCategories);
      setProducts(finalProducts);

      // Set default category kalau belum ada pilihan
      if (
        !categoryId &&
        loadedCategories.length > 0
      ) {
        setCategoryId(loadedCategories[0].id);
      }
    } catch (error) {
      console.error(error);

      showError(
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat mengambil data.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // =========================================================
  // PRODUCT MODAL
  // =========================================================

  const resetProductForm = () => {
    setEditingProduct(null);

    setName('');
    setCategoryId(categories[0]?.id || '');
    setBaseUnit('Pcs');
    setMinimumStock(5);
    setInitialStock(0);
    setImageUrl('');
    setIsActive(true);

    setUnits([
      {
        unit_name: 'Pcs',
        conversion_to_base: 1,
        cost_price: 1000,
        selling_price: 1500,
        is_default: true,
      },
    ]);
  };

  const openAddModal = () => {
    resetProductForm();
    setIsProductModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);

    setName(product.name);
    setCategoryId(product.category_id || '');
    setBaseUnit(product.base_unit);
    setMinimumStock(product.minimum_stock);
    setInitialStock(product.current_stock_base);
    setImageUrl(product.image_url || '');
    setIsActive(product.is_active);

    setUnits(
      product.units.map((unit) => ({
        id: unit.id,
        unit_name: unit.unit_name,
        conversion_to_base: unit.conversion_to_base,
        cost_price: unit.cost_price,
        selling_price: unit.selling_price,
        is_default: Boolean(unit.is_default),
      }))
    );

    setIsProductModalOpen(true);
  };

  const closeProductModal = () => {
    if (!saving) {
      setIsProductModalOpen(false);
    }
  };

  // =========================================================
  // UNIT FORM
  // =========================================================

  const handleUnitChange = (
    index: number,
    field: keyof UnitForm,
    value: string | number | boolean
  ) => {
    setUnits((current) =>
      current.map((unit, i) => {
        if (i !== index) return unit;

        return {
          ...unit,
          [field]: value,
        };
      })
    );
  };

  const addUnitRow = () => {
    setUnits((current) => [
      ...current,
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
    if (units.length <= 1) {
      showError('Minimal harus ada 1 satuan.');
      return;
    }

    const target = units[index];

    if (target.is_default) {
      showError(
        'Satuan default tidak boleh dihapus. Jadikan satuan lain sebagai default terlebih dahulu.'
      );
      return;
    }

    setUnits((current) =>
      current.filter((_, i) => i !== index)
    );
  };

  const setDefaultUnit = (index: number) => {
    setUnits((current) =>
      current.map((unit, i) => ({
        ...unit,
        is_default: i === index,
      }))
    );
  };

  // =========================================================
  // SAVE PRODUCT
  // =========================================================

  const handleSubmitProduct = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!supabase) {
      showError('Supabase belum terkonfigurasi.');
      return;
    }

    if (!name.trim()) {
      showError('Nama produk wajib diisi.');
      return;
    }

    if (!categoryId) {
      showError('Pilih kategori produk terlebih dahulu.');
      return;
    }

    if (!baseUnit.trim()) {
      showError('Satuan dasar wajib diisi.');
      return;
    }

    if (units.length === 0) {
      showError('Minimal harus ada satu satuan produk.');
      return;
    }

    // Validasi satuan
    for (const unit of units) {
      if (!unit.unit_name.trim()) {
        showError('Nama satuan tidak boleh kosong.');
        return;
      }

      if (
        !Number.isFinite(Number(unit.conversion_to_base)) ||
        Number(unit.conversion_to_base) <= 0
      ) {
        showError(
          `Konversi untuk satuan "${unit.unit_name}" harus lebih dari 0.`
        );
        return;
      }

      if (Number(unit.cost_price) < 0) {
        showError('Harga modal tidak boleh negatif.');
        return;
      }

      if (Number(unit.selling_price) < 0) {
        showError('Harga jual tidak boleh negatif.');
        return;
      }
    }

    const defaultCount = units.filter(
      (unit) => unit.is_default
    ).length;

    if (defaultCount !== 1) {
      showError(
        'Harus ada tepat satu satuan yang menjadi default.'
      );
      return;
    }

    setSaving(true);

    try {
      // =====================================================
      // EDIT PRODUCT
      // =====================================================

      if (editingProduct) {
        const { error: productError } = await supabase
          .from('products')
          .update({
            name: name.trim(),
            category_id: categoryId,
            base_unit: baseUnit.trim(),
            minimum_stock: Number(minimumStock),
            image_url: imageUrl.trim() || null,
            is_active: isActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingProduct.id);

        if (productError) {
          throw new Error(
            `Gagal mengubah produk: ${productError.message}`
          );
        }

        // ---------------------------------------------------
        // Ambil unit lama
        // ---------------------------------------------------

        const { data: oldUnits, error: oldUnitsError } =
          await supabase
            .from('product_units')
            .select('id')
            .eq('product_id', editingProduct.id);

        if (oldUnitsError) {
          throw new Error(
            `Gagal membaca satuan lama: ${oldUnitsError.message}`
          );
        }

        const oldUnitIds = (oldUnits || []).map(
          (unit) => unit.id
        );

        const keptUnitIds = units
          .filter((unit) => unit.id)
          .map((unit) => unit.id as string);

        // ---------------------------------------------------
        // Hapus unit yang sudah tidak digunakan
        // ---------------------------------------------------

        const unitsToDelete = oldUnitIds.filter(
          (id) => !keptUnitIds.includes(id)
        );

        if (unitsToDelete.length > 0) {
          const { error: deleteUnitsError } =
            await supabase
              .from('product_units')
              .delete()
              .in('id', unitsToDelete);

          if (deleteUnitsError) {
            throw new Error(
              `Gagal menghapus satuan lama: ${deleteUnitsError.message}`
            );
          }
        }

        // ---------------------------------------------------
        // Update / Insert satuan
        // ---------------------------------------------------

        for (const unit of units) {
          const payload = {
            product_id: editingProduct.id,
            unit_name: unit.unit_name.trim(),
            conversion_to_base: Number(
              unit.conversion_to_base
            ),
            cost_price: Number(unit.cost_price),
            selling_price: Number(unit.selling_price),
            is_default: Boolean(unit.is_default),
            updated_at: new Date().toISOString(),
          };

          if (unit.id) {
            const { error: unitError } =
              await supabase
                .from('product_units')
                .update(payload)
                .eq('id', unit.id);

            if (unitError) {
              throw new Error(
                `Gagal mengubah satuan "${unit.unit_name}": ${unitError.message}`
              );
            }
          } else {
            const { error: unitError } =
              await supabase
                .from('product_units')
                .insert(payload);

            if (unitError) {
              throw new Error(
                `Gagal menambahkan satuan "${unit.unit_name}": ${unitError.message}`
              );
            }
          }
        }
      }

      // =====================================================
      // ADD PRODUCT
      // =====================================================

      else {
        const { data: newProduct, error: productError } =
          await supabase
            .from('products')
            .insert({
              name: name.trim(),
              category_id: categoryId,
              base_unit: baseUnit.trim(),
              minimum_stock: Number(minimumStock),
              image_url: imageUrl.trim() || null,
              is_active: isActive,
            })
            .select()
            .single();

        if (productError || !newProduct) {
          throw new Error(
            `Gagal menambahkan produk: ${
              productError?.message || 'Data produk tidak ditemukan.'
            }`
          );
        }

        // ---------------------------------------------------
        // Insert product units
        // ---------------------------------------------------

        const unitPayloads = units.map((unit) => ({
          product_id: newProduct.id,
          unit_name: unit.unit_name.trim(),
          conversion_to_base: Number(
            unit.conversion_to_base
          ),
          cost_price: Number(unit.cost_price),
          selling_price: Number(unit.selling_price),
          is_default: Boolean(unit.is_default),
        }));

        const { error: unitsError } = await supabase
          .from('product_units')
          .insert(unitPayloads);

        if (unitsError) {
          // Rollback manual: hapus produk kalau unit gagal
          await supabase
            .from('products')
            .delete()
            .eq('id', newProduct.id);

          throw new Error(
            `Gagal menyimpan satuan produk: ${unitsError.message}`
          );
        }

        // ---------------------------------------------------
        // Simpan stok awal sebagai stock movement
        // ---------------------------------------------------

        if (Number(initialStock) > 0) {
          const { error: movementError } =
            await supabase
              .from('stock_movements')
              .insert({
                product_id: newProduct.id,
                quantity_base: Number(initialStock),
                movement_type: 'PURCHASE',
                date: new Date()
                  .toISOString()
                  .slice(0, 10),
                note: 'Stok awal produk baru',
              });

          if (movementError) {
            // Jangan hapus product karena produk sudah berhasil
            // disimpan. Beri pesan bahwa stok awal gagal.
            throw new Error(
              `Produk berhasil dibuat, tetapi stok awal gagal disimpan: ${movementError.message}`
            );
          }
        }
      }

      setIsProductModalOpen(false);

      await loadData();

      alert(
        editingProduct
          ? 'Produk berhasil diperbarui.'
          : 'Produk berhasil ditambahkan.'
      );
    } catch (error) {
      console.error(error);

      showError(
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat menyimpan produk.'
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // DELETE PRODUCT
  // =========================================================

  const handleDeleteProduct = async (product: Product) => {
    if (!supabase) {
      showError('Supabase belum terkonfigurasi.');
      return;
    }

    const confirmed = confirm(
      `Hapus produk "${product.name}"?\n\nData satuan produk juga akan dihapus.`
    );

    if (!confirmed) return;

    try {
      setSaving(true);

      // product_units dan stock_movements akan ikut terhapus
      // karena schema menggunakan ON DELETE CASCADE pada product.
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);

      if (error) {
        throw new Error(
          `Gagal menghapus produk: ${error.message}`
        );
      }

      await loadData();

      alert('Produk berhasil dihapus.');
    } catch (error) {
      console.error(error);

      showError(
        error instanceof Error
          ? error.message
          : 'Gagal menghapus produk.'
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // CATEGORY CRUD
  // =========================================================

  const openAddCategory = () => {
    setEditingCategory(null);
    setCategoryName('');
    setIsCategoryModalOpen(true);
  };

  const openEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setIsCategoryModalOpen(true);
  };

  const handleSubmitCategory = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!supabase) {
      showError('Supabase belum terkonfigurasi.');
      return;
    }

    const trimmedName = categoryName.trim();

    if (!trimmedName) {
      showError('Nama kategori wajib diisi.');
      return;
    }

    setSaving(true);

    try {
      // EDIT
      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update({
            name: trimmedName,
          })
          .eq('id', editingCategory.id);

        if (error) {
          throw new Error(
            `Gagal mengubah kategori: ${error.message}`
          );
        }

        alert('Kategori berhasil diperbarui.');
      }

      // ADD
      else {
        const { error } = await supabase
          .from('categories')
          .insert({
            name: trimmedName,
          });

        if (error) {
          if (error.code === '23505') {
            throw new Error(
              'Kategori tersebut sudah ada.'
            );
          }

          throw new Error(
            `Gagal menambahkan kategori: ${error.message}`
          );
        }

        alert('Kategori berhasil ditambahkan.');
      }

      setIsCategoryModalOpen(false);
      setCategoryName('');
      setEditingCategory(null);

      await loadData();
    } catch (error) {
      console.error(error);

      showError(
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan kategori.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (
    category: Category
  ) => {
    if (!supabase) {
      showError('Supabase belum terkonfigurasi.');
      return;
    }

    const productCount = products.filter(
      (product) => product.category_id === category.id
    ).length;

    const warning =
      productCount > 0
        ? `Kategori "${category.name}" masih digunakan oleh ${productCount} produk.\n\nJika dihapus, produk tersebut akan menjadi "Umum".\n\nLanjutkan?`
        : `Hapus kategori "${category.name}"?`;

    if (!confirm(warning)) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id);

      if (error) {
        throw new Error(
          `Gagal menghapus kategori: ${error.message}`
        );
      }

      if (selectedCategory === category.id) {
        setSelectedCategory('ALL');
      }

      await loadData();

      alert('Kategori berhasil dihapus.');
    } catch (error) {
      console.error(error);

      showError(
        error instanceof Error
          ? error.message
          : 'Gagal menghapus kategori.'
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // FILTER
  // =========================================================

  const filteredProducts = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return products.filter((product) => {
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query);

      const matchesCategory =
        selectedCategory === 'ALL' ||
        product.category_id === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [
    products,
    searchQuery,
    selectedCategory,
  ]);

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="space-y-6">
      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-600" />
            Master Data Barang
          </h1>

          <p className="text-sm text-gray-500">
            Kelola daftar produk, foto, harga modal, harga jual
            & multi-satuan
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={openAddCategory}
            disabled={saving}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl shadow-sm transition-colors text-sm disabled:opacity-50"
          >
            <FolderPlus className="w-4 h-4" />
            Kategori
          </button>

          <button
            onClick={openAddModal}
            disabled={saving}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-colors text-sm disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Tambah Produk Baru
          </button>
        </div>
      </div>

      {/* ===================================================
          SEARCH + CATEGORY
      =================================================== */}

      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* SEARCH */}

          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />

            <input
              type="text"
              placeholder="Cari nama produk..."
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(e.target.value)
              }
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* CATEGORY */}

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === 'ALL'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Semua Kategori
            </button>

            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center gap-1 shrink-0"
              >
                <button
                  onClick={() =>
                    setSelectedCategory(category.id)
                  }
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>

                <button
                  onClick={() =>
                    openEditCategory(category)
                  }
                  className="p-1 text-gray-400 hover:text-emerald-600"
                  title="Edit kategori"
                >
                  <Edit2 className="w-3 h-3" />
                </button>

                <button
                  onClick={() =>
                    handleDeleteCategory(category)
                  }
                  className="p-1 text-gray-400 hover:text-rose-600"
                  title="Hapus kategori"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ===================================================
          LOADING
      =================================================== */}

      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-8 h-8 mx-auto text-emerald-600 animate-spin" />

          <p className="text-sm text-gray-500 mt-3">
            Mengambil data dari Supabase...
          </p>
        </div>
      ) : (
        <>
          {/* =================================================
              PRODUCTS GRID
          ================================================= */}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full py-16 text-center text-gray-400 bg-white rounded-2xl border border-gray-200">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />

                <p className="text-sm">
                  Tidak ada produk ditemukan.
                </p>

                <button
                  onClick={openAddModal}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Produk
                </button>
              </div>
            ) : (
              filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className="flex flex-col justify-between hover:border-emerald-200"
                >
                  <div>
                    {/* PRODUCT HEADER */}

                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-12 h-12 rounded-xl object-cover border border-gray-200 bg-gray-50 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                            <ImageIcon className="w-6 h-6" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <h3 className="font-bold text-gray-900 text-base leading-snug">
                            {product.name}
                          </h3>

                          <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                            <Tag className="w-3 h-3 text-emerald-600" />

                            {product.category_name ||
                              'Umum'}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant={
                          product.is_active
                            ? 'emerald'
                            : 'gray'
                        }
                      >
                        {product.is_active
                          ? 'Aktif'
                          : 'Non-Aktif'}
                      </Badge>
                    </div>

                    {/* STOCK */}

                    <div className="bg-gray-50 p-3 rounded-xl mb-3 space-y-1">
                      <div className="flex justify-between text-xs text-gray-500 gap-3">
                        <span>Stok Saat Ini:</span>

                        <span className="font-bold text-gray-900 text-right">
                          {formatMultiUnitStock(
                            product.current_stock_base,
                            product.base_unit,
                            product.units
                          )}
                        </span>
                      </div>

                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Satuan Dasar:</span>

                        <span className="font-semibold text-emerald-800">
                          {product.base_unit}
                        </span>
                      </div>
                    </div>

                    {/* UNITS */}

                    <div className="space-y-1.5 mb-4">
                      <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                        Satuan Penjualan:
                      </span>

                      {product.units.length === 0 ? (
                        <p className="text-xs text-gray-400">
                          Belum ada satuan.
                        </p>
                      ) : (
                        product.units.map((unit) => (
                          <div
                            key={unit.id}
                            className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100 last:border-none"
                          >
                            <div className="font-semibold text-gray-800">
                              {unit.unit_name}

                              {unit.conversion_to_base >
                                1 &&
                                ` (${unit.conversion_to_base} ${product.base_unit})`}
                            </div>

                            <div className="text-right">
                              <span className="text-emerald-700 font-bold">
                                {formatRupiah(
                                  unit.selling_price
                                )}
                              </span>

                              <span className="text-gray-400 text-[10px] block">
                                Modal:{' '}
                                {formatRupiah(
                                  unit.cost_price
                                )}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* ACTION */}

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                    <button
                      onClick={() =>
                        openEditModal(product)
                      }
                      disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit
                    </button>

                    <button
                      onClick={() =>
                        handleDeleteProduct(product)
                      }
                      disabled={saving}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Hapus produk"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </>
      )}

      {/* =====================================================
          PRODUCT MODAL
      ===================================================== */}

      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-4xl max-h-[92vh] sm:max-h-[90vh] overflow-hidden">
            {/* HEADER */}

            <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-4 border-b">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingProduct
                    ? 'Edit Produk'
                    : 'Tambah Produk Baru'}
                </h2>

                <p className="text-xs text-gray-500 mt-0.5">
                  Data akan langsung disimpan ke Supabase.
                </p>
              </div>

              <button
                onClick={closeProductModal}
                aria-label="Tutup modal produk"
                className="shrink-0 p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* BODY */}

            <form
              onSubmit={handleSubmitProduct}
              className="overflow-y-auto max-h-[calc(92vh-140px)] sm:max-h-[calc(90vh-140px)]"
            >
              <div className="p-4 sm:p-6 space-y-5">
                {/* BASIC DATA */}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* NAME */}

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Nama Produk *
                    </label>

                    <input
                      type="text"
                      required
                      placeholder="Contoh: Rokok A"
                      value={name}
                      onChange={(e) =>
                        setName(e.target.value)
                      }
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* CATEGORY */}

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Kategori *
                    </label>

                    <div className="flex gap-2">
                      <select
                        required
                        value={categoryId}
                        onChange={(e) =>
                          setCategoryId(e.target.value)
                        }
                        className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">
                          Pilih kategori
                        </option>

                        {categories.map((category) => (
                          <option
                            key={category.id}
                            value={category.id}
                          >
                            {category.name}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={openAddCategory}
                        className="px-3 bg-gray-100 hover:bg-gray-200 rounded-xl"
                        title="Tambah kategori"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* BASE UNIT */}

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Satuan Dasar *
                    </label>

                    <input
                      type="text"
                      required
                      placeholder="Batang, Botol, Butir, Pcs"
                      value={baseUnit}
                      onChange={(e) =>
                        setBaseUnit(e.target.value)
                      }
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />

                    <span className="text-[11px] text-gray-400 mt-1 block">
                      Satuan terkecil yang digunakan untuk
                      menghitung stok.
                    </span>
                  </div>

                  {/* MINIMUM STOCK */}

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Minimum Stok Warning
                    </label>

                    <input
                      type="number"
                      min={0}
                      value={minimumStock}
                      onChange={(e) =>
                        setMinimumStock(
                          Number(e.target.value)
                        )
                      }
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* INITIAL STOCK */}

                  {!editingProduct && (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Stok Awal ({baseUnit})
                      </label>

                      <input
                        type="number"
                        min={0}
                        value={initialStock}
                        onChange={(e) =>
                          setInitialStock(
                            Number(e.target.value)
                          )
                        }
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />

                      <span className="text-[11px] text-gray-400 mt-1 block">
                        Akan dicatat sebagai stok masuk.
                      </span>
                    </div>
                  )}

                  {/* IMAGE URL */}

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      URL Foto Produk
                    </label>

                    <input
                      type="url"
                      placeholder="https://..."
                      value={imageUrl}
                      onChange={(e) =>
                        setImageUrl(e.target.value)
                      }
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* ACTIVE */}

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) =>
                      setIsActive(e.target.checked)
                    }
                    className="w-4 h-4 accent-emerald-600"
                  />

                  <span className="text-sm font-semibold text-gray-700">
                    Produk aktif
                  </span>
                </label>

                {/* =================================================
                    UNITS
                ================================================= */}

                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">
                        Satuan & Harga
                      </h3>

                      <p className="text-[11px] text-gray-500">
                        Semua konversi dihitung dari satuan dasar.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={addUnitRow}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah Satuan
                    </button>
                  </div>

                  <div className="p-4 space-y-3">
                    {units.map((unit, index) => (
                      <div
                        key={unit.id || `new-${index}`}
                        className="p-3 border border-gray-100 rounded-xl bg-white"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                          {/* UNIT NAME */}

                          <div>
                            <label className="block text-[11px] font-bold text-gray-600 mb-1">
                              Nama Satuan
                            </label>

                            <input
                              type="text"
                              value={unit.unit_name}
                              onChange={(e) =>
                                handleUnitChange(
                                  index,
                                  'unit_name',
                                  e.target.value
                                )
                              }
                              placeholder="Batang"
                              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                            />
                          </div>

                          {/* CONVERSION */}

                          <div>
                            <label className="block text-[11px] font-bold text-gray-600 mb-1">
                              Konversi ke {baseUnit}
                            </label>

                            <input
                              type="number"
                              min={1}
                              value={
                                unit.conversion_to_base
                              }
                              onChange={(e) =>
                                handleUnitChange(
                                  index,
                                  'conversion_to_base',
                                  Number(e.target.value)
                                )
                              }
                              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                            />
                          </div>

                          {/* COST */}

                          <div>
                            <label className="block text-[11px] font-bold text-gray-600 mb-1">
                              Harga Modal
                            </label>

                            <input
                              type="number"
                              min={0}
                              value={unit.cost_price}
                              onChange={(e) =>
                                handleUnitChange(
                                  index,
                                  'cost_price',
                                  Number(e.target.value)
                                )
                              }
                              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                            />
                          </div>

                          {/* SELLING */}

                          <div>
                            <label className="block text-[11px] font-bold text-gray-600 mb-1">
                              Harga Jual
                            </label>

                            <input
                              type="number"
                              min={0}
                              value={unit.selling_price}
                              onChange={(e) =>
                                handleUnitChange(
                                  index,
                                  'selling_price',
                                  Number(e.target.value)
                                )
                              }
                              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                            />
                          </div>

                          {/* ACTION */}

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setDefaultUnit(index)
                              }
                              className={`flex-1 px-2 py-2 rounded-lg text-[11px] font-bold ${
                                unit.is_default
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              }`}
                            >
                              {unit.is_default
                                ? 'Default'
                                : 'Jadikan Default'}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                removeUnitRow(index)
                              }
                              className="px-2 py-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* CONVERSION INFO */}

                        {Number(
                          unit.conversion_to_base
                        ) > 1 && (
                          <p className="text-[11px] text-gray-400 mt-2">
                            1 {unit.unit_name} ={' '}
                            {unit.conversion_to_base}{' '}
                            {baseUnit}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* FOOTER */}

              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                <button
                  type="button"
                  onClick={closeProductModal}
                  disabled={saving}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Simpan Produk
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          CATEGORY MODAL
      ===================================================== */}

      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md max-h-[92vh] overflow-y-auto sm:overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-4 sm:px-5 py-4 border-b">
              <div>
                <h2 className="font-bold text-gray-900">
                  {editingCategory
                    ? 'Edit Kategori'
                    : 'Tambah Kategori'}
                </h2>

                <p className="text-xs text-gray-500 mt-0.5">
                  Data tersimpan langsung di Supabase.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  !saving &&
                  setIsCategoryModalOpen(false)
                }
                aria-label="Tutup modal kategori"
                className="shrink-0 p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCategory}>
              <div className="p-4 sm:p-5">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nama Kategori *
                </label>

                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Contoh: Rokok"
                  value={categoryName}
                  onChange={(e) =>
                    setCategoryName(e.target.value)
                  }
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 px-5 py-4 border-t bg-gray-50">
                <button
                  type="button"
                  onClick={() =>
                    setIsCategoryModalOpen(false)
                  }
                  disabled={saving}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Simpan
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}