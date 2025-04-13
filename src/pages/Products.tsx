import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Product } from '../types';
import { Plus, Edit2, Search, LogOut, Trash2, Loader } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

function Products() {
  const { isAdmin, userData } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [exitQuantity, setExitQuantity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    unit: 'kg',
    boxWeight: '',
    palletWeight: '',
    boxesPerPallet: '',
    quantity: '',
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'products'), orderBy('updatedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const productsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(productsData);
    } catch (error) {
      toast.error('Məhsulları yükləyərkən xəta baş verdi');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotalWeight = (data: typeof formData): number => {
    const quantity = Number(data.quantity);
    switch (data.unit) {
      case 'pallet':
        return quantity * Number(data.palletWeight);
      case 'box':
        return quantity * Number(data.boxWeight);
      default:
        return quantity;
    }
  };

  const validateFormData = () => {
    if (!formData.name.trim()) {
      toast.error('Məhsul adı daxil edin');
      return false;
    }
    if (!formData.company.trim()) {
      toast.error('Firma adı daxil edin');
      return false;
    }
    
    const quantity = Number(formData.quantity);
    if (isNaN(quantity)) {
      toast.error('Düzgün miqdar daxil edin');
      return false;
    }
    
    if (quantity < 0) {
      toast.error('Miqdar mənfi ola bilməz');
      return false;
    }
    
    if (formData.unit === 'box' || formData.unit === 'pallet') {
      const boxWeight = Number(formData.boxWeight);
      if (isNaN(boxWeight)) {
        toast.error('Qutu çəkisini düzgün daxil edin');
        return false;
      }
      if (boxWeight < 0) {
        toast.error('Qutu çəkisi mənfi ola bilməz');
        return false;
      }
    }
    
    if (formData.unit === 'pallet') {
      const palletWeight = Number(formData.palletWeight);
      const boxesPerPallet = Number(formData.boxesPerPallet);
      
      if (isNaN(palletWeight)) {
        toast.error('Palet çəkisini düzgün daxil edin');
        return false;
      }
      if (palletWeight < 0) {
        toast.error('Palet çəkisi mənfi ola bilməz');
        return false;
      }
      if (isNaN(boxesPerPallet)) {
        toast.error('Paletdəki qutu sayını düzgün daxil edin');
        return false;
      }
      if (boxesPerPallet < 0) {
        toast.error('Paletdəki qutu sayı mənfi ola bilməz');
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateFormData()) return;
    
    setIsSubmitting(true);
    try {
      const productData = {
        ...formData,
        quantity: Number(formData.quantity),
        boxWeight: formData.unit === 'box' || formData.unit === 'pallet' ? Number(formData.boxWeight) : null,
        palletWeight: formData.unit === 'pallet' ? Number(formData.palletWeight) : null,
        boxesPerPallet: formData.unit === 'pallet' ? Number(formData.boxesPerPallet) : null,
        totalWeight: calculateTotalWeight(formData),
        createdAt: selectedProduct ? selectedProduct.createdAt : new Date(),
        updatedAt: new Date(),
      };

      if (selectedProduct) {
        await updateDoc(doc(db, 'products', selectedProduct.id), productData);

        const quantityDiff = Number(formData.quantity) - selectedProduct.quantity;
        if (quantityDiff !== 0) {
          await addDoc(collection(db, 'transactions'), {
            productId: selectedProduct.id,
            type: quantityDiff > 0 ? 'in' : 'out',
            quantity: Math.abs(quantityDiff),
            totalWeight: Math.abs(calculateTotalWeight({
              ...formData,
              quantity: Math.abs(quantityDiff).toString()
            })),
            date: new Date(),
            note: 'Məhsul yenilənməsi',
          });
        }

        toast.success('Məhsul yeniləndi');
      } else {
        const docRef = await addDoc(collection(db, 'products'), productData);
        await addDoc(collection(db, 'transactions'), {
          productId: docRef.id,
          type: 'in',
          quantity: Number(formData.quantity),
          totalWeight: productData.totalWeight,
          date: new Date(),
          note: 'İlkin məhsul əlavəsi',
        });
        toast.success('Məhsul əlavə edildi');
      }

      setIsModalOpen(false);
      setSelectedProduct(null);
      setFormData({
        name: '',
        company: '',
        unit: 'kg',
        boxWeight: '',
        palletWeight: '',
        boxesPerPallet: '',
        quantity: '',
      });
      fetchProducts();
    } catch (error) {
      toast.error('Xəta baş verdi: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!isAdmin) {
      toast.error('Məhsulu silmək üçün admin səlahiyyətiniz yoxdur');
      return;
    }

    try {
      setIsDeleting(true);
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('productId', '==', productId),
        limit(1)
      );
      const transactionsSnapshot = await getDocs(transactionsQuery);
      
      if (!transactionsSnapshot.empty) {
        toast.error('Bu məhsula aid əməliyyatlar var. Silmək mümkün deyil.');
        return;
      }

      if (window.confirm('Bu məhsulu silmək istədiyinizə əminsiniz?')) {
        await deleteDoc(doc(db, 'products', productId));
        toast.success('Məhsul silindi');
        fetchProducts();
      }
    } catch (error) {
      toast.error('Məhsul silinərkən xəta baş verdi: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExit = async () => {
    if (!selectedProduct || !exitQuantity) return;

    setIsSubmitting(true);
    try {
      const exitQty = Number(exitQuantity);
      if (exitQty <= 0) {
        toast.error('Miqdar müsbət olmalıdır');
        return;
      }

      if (exitQty > selectedProduct.quantity) {
        toast.error('Kifayət qədər stok yoxdur');
        return;
      }

      const newQuantity = selectedProduct.quantity - exitQty;
      let newTotalWeight = 0;

      switch (selectedProduct.unit) {
        case 'pallet':
          newTotalWeight = newQuantity * (selectedProduct.palletWeight || 0);
          break;
        case 'box':
          newTotalWeight = newQuantity * (selectedProduct.boxWeight || 0);
          break;
        default:
          newTotalWeight = newQuantity;
      }

      await updateDoc(doc(db, 'products', selectedProduct.id), {
        quantity: newQuantity,
        totalWeight: newTotalWeight,
        updatedAt: new Date(),
      });

      const exitTotalWeight = selectedProduct.unit === 'pallet'
        ? exitQty * (selectedProduct.palletWeight || 0)
        : selectedProduct.unit === 'box'
          ? exitQty * (selectedProduct.boxWeight || 0)
          : exitQty;

      await addDoc(collection(db, 'transactions'), {
        productId: selectedProduct.id,
        type: 'out',
        quantity: exitQty,
        totalWeight: exitTotalWeight,
        date: new Date(),
        note: 'Məhsul çıxışı',
      });

      toast.success('Çıxış qeydə alındı');
      setIsExitModalOpen(false);
      setExitQuantity('');
      setSelectedProduct(null);
      fetchProducts();
    } catch (error) {
      toast.error('Xəta baş verdi: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUnitLabel = (unit: string) => {
    switch (unit) {
      case 'pallet':
        return 'palet';
      case 'box':
        return 'qutu';
      default:
        return 'kg';
    }
  };

  const canManageProducts = isAdmin || (userData?.permissions?.canAddProducts ?? false);
  const canDeleteProducts = isAdmin;
  const canManageTransactions = isAdmin || (userData?.permissions?.canManageTransactions ?? false);

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading && products.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Məhsullar</h1>
        {canManageProducts && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"
            disabled={isSubmitting}
          >
            <Plus className="w-5 h-5 mr-2" />
            Yeni Məhsul
          </button>
        )}
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Məhsul və ya firma adına görə axtar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-md"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Məhsul Adı
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Firma
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Miqdar
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ümumi Çəki (kg)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Əməliyyatlar
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProducts.map((product) => (
              <tr key={product.id}>
                <td className="px-6 py-4 whitespace-nowrap">{product.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{product.company}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {product.quantity} {getUnitLabel(product.unit)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{product.totalWeight.toFixed(2)} kg</td>
                <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                  {canManageProducts && (
                    <button
                      onClick={() => {
                        setSelectedProduct(product);
                        setFormData({
                          name: product.name,
                          company: product.company,
                          unit: product.unit,
                          boxWeight: product.boxWeight?.toString() || '',
                          palletWeight: product.palletWeight?.toString() || '',
                          boxesPerPallet: product.boxesPerPallet?.toString() || '',
                          quantity: product.quantity.toString(),
                        });
                        setIsModalOpen(true);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                      disabled={isSubmitting}
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                  )}
                  {canManageTransactions && (
                    <button
                      onClick={() => {
                        if (product.quantity <= 0) {
                          toast.error('Bu məhsuldan stokda qalmayıb');
                          return;
                        }
                        setSelectedProduct(product);
                        setIsExitModalOpen(true);
                      }}
                      className={`text-red-600 hover:text-red-900 ${product.quantity <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={isSubmitting || product.quantity <= 0}
                      title={product.quantity <= 0 ? 'Stokda məhsul qalmayıb' : 'Çıxış et'}
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  )}
                  {canDeleteProducts && (
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-red-600 hover:text-red-900"
                      disabled={isSubmitting || isDeleting}
                    >
                      {isDeleting ? (
                        <Loader className="w-5 h-5 animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  Məhsul tapılmadı
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-6">
              {selectedProduct ? 'Məhsulu Yenilə' : 'Yeni Məhsul'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Məhsul Adı
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Firma
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Ölçü Vahidi
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value as 'kg' | 'box' | 'pallet' })}
                  className="w-full p-2 border rounded-md"
                  disabled={selectedProduct !== null}
                >
                  <option value="kg">Kiloqram</option>
                  <option value="box">Qutu</option>
                  <option value="pallet">Palet</option>
                </select>
                {selectedProduct && (
                  <p className="text-sm text-gray-500 mt-1">
                    Mövcud məhsulun ölçü vahidi dəyişdirilə bilməz
                  </p>
                )}
              </div>
              {(formData.unit === 'box' || formData.unit === 'pallet') && (
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Qutu Çəkisi (kg)
                  </label>
                  <input
                    type="number"
                    value={formData.boxWeight}
                    onChange={(e) => setFormData({ ...formData, boxWeight: e.target.value })}
                    className="w-full p-2 border rounded-md"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
              )}
              {formData.unit === 'pallet' && (
                <>
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      Palet Çəkisi (kg)
                    </label>
                    <input
                      type="number"
                      value={formData.palletWeight}
                      onChange={(e) => setFormData({ ...formData, palletWeight: e.target.value })}
                      className="w-full p-2 border rounded-md"
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      Paletdəki Qutu Sayı
                    </label>
                    <input
                      type="number"
                      value={formData.boxesPerPallet}
                      onChange={(e) => setFormData({ ...formData, boxesPerPallet: e.target.value })}
                      className="w-full p-2 border rounded-md"
                      required
                      min="0"
                      step="1"
                    />
                  </div>
                </>
              )}
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Miqdar ({getUnitLabel(formData.unit)})
                </label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  required
                  min="0"
                  step={formData.unit === 'kg' ? "0.01" : "1"}
                />
              </div>
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedProduct(null);
                    setFormData({
                      name: '',
                      company: '',
                      unit: 'kg',
                      boxWeight: '',
                      palletWeight: '',
                      boxesPerPallet: '',
                      quantity: '',
                    });
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  disabled={isSubmitting}
                >
                  Ləğv et
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <Loader className="w-4 h-4 animate-spin mr-2" />
                      Gözləyin...
                    </div>
                  ) : (
                    selectedProduct ? 'Yenilə' : 'Əlavə et'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Exit Product Modal */}
      {isExitModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-6">Məhsul Çıxışı</h2>
            <div className="mb-6">
              <p className="text-gray-600 mb-2">Məhsul: {selectedProduct.name}</p>
              <p className="text-gray-600 mb-4">
                Mövcud stok: {selectedProduct.quantity} {getUnitLabel(selectedProduct.unit)}
                {selectedProduct.quantity <= 0 && (
                  <span className="text-red-600 ml-2">(Stokda qalmayıb)</span>
                )}
              </p>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Çıxış Miqdarı ({getUnitLabel(selectedProduct.unit)})
              </label>
              <input
                type="number"
                value={exitQuantity}
                onChange={(e) => setExitQuantity(e.target.value)}
                className="w-full p-2 border rounded-md"
                required
                min="0.01"
                step={selectedProduct.unit === 'kg' ? "0.01" : "1"}
                max={selectedProduct.quantity}
                disabled={selectedProduct.quantity <= 0}
              />
              {selectedProduct.quantity <= 0 && (
                <p className="text-red-600 text-sm mt-2">
                  Bu məhsuldan stokda qalmayıb. Çıxış edilə bilməz.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => {
                  setIsExitModalOpen(false);
                  setSelectedProduct(null);
                  setExitQuantity('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={isSubmitting}
              >
                Ləğv et
              </button>
              <button
                onClick={handleExit}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:bg-red-400"
                disabled={isSubmitting || !exitQuantity || Number(exitQuantity) <= 0 || 
                  Number(exitQuantity) > selectedProduct.quantity || selectedProduct.quantity <= 0}
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <Loader className="w-4 h-4 animate-spin mr-2" />
                    Gözləyin...
                  </div>
                ) : (
                  'Çıxış et'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Products;