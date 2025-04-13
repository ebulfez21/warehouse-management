import  { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Product, Transaction } from '../types';
import { format, startOfMonth, endOfMonth, parseISO, subMonths } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Download, Plus, Filter, TrendingUp, TrendingDown, Package, Boxes } from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

function Reports() {
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionForm, setTransactionForm] = useState({
    productId: '',
    type: 'in',
    quantity: '',
    note: '',
  });
  const [summary, setSummary] = useState({
    totalIn: 0,
    totalOut: 0,
    productCounts: 0,
    transactionCounts: 0
  });

  const [palletSummary, setPalletSummary] = useState({
    totalPalletsIn: 0,
    totalPalletsOut: 0,
    totalPalletProducts: 0,
  });

  useEffect(() => {
    fetchProducts();
    fetchTransactions();
  }, [dateRange]);

  useEffect(() => {
    calculateSummary();
  }, [transactions]);

  useEffect(() => {
    calculatePalletSummary();
  }, [transactions, products]);

  const fetchProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const productsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(productsData);
    } catch (error) {
      toast.error('Məhsulları yükləyərkən xəta baş verdi');
    }
  };

  const calculatePalletSummary = () => {
    const palletTransactions = transactions.filter(t => {
      const product = products.find(p => p.id === t.productId);
      return product?.unit === 'pallet';
    });

    const totalPalletsIn = palletTransactions
      .filter(t => t.type === 'in')
      .reduce((sum, t) => sum + t.quantity, 0);

    const totalPalletsOut = palletTransactions
      .filter(t => t.type === 'out')
      .reduce((sum, t) => sum + t.quantity, 0);

    const totalPalletProducts = new Set(
      palletTransactions.map(t => t.productId)
    ).size;

    setPalletSummary({
      totalPalletsIn,
      totalPalletsOut,
      totalPalletProducts,
    });
  };

  const fetchTransactions = async () => {
    try {
      const start = Timestamp.fromDate(parseISO(dateRange.start));
      const end = Timestamp.fromDate(parseISO(dateRange.end));
      
      const q = query(
        collection(db, 'transactions'),
        where('date', '>=', start),
        where('date', '<=', end)
      );
      
      const querySnapshot = await getDocs(q);
      const transactionsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
      })) as Transaction[];
      
      setTransactions(transactionsData);
    } catch (error) {
      toast.error('Əməliyyatları yükləyərkən xəta baş verdi');
    }
  };

  const calculateSummary = () => {
    const totalIn = transactions
      .filter(t => t.type === 'in')
      .reduce((sum, t) => sum + t.totalWeight, 0);
    
    const totalOut = transactions
      .filter(t => t.type === 'out')
      .reduce((sum, t) => sum + t.totalWeight, 0);

    const uniqueProducts = new Set(transactions.map(t => t.productId)).size;

    setSummary({
      totalIn,
      totalOut,
      productCounts: uniqueProducts,
      transactionCounts: transactions.length
    });
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

  const calculateTransactionWeight = (quantity: number, product: Product): number => {
    switch (product.unit) {
      case 'pallet':
        return quantity * (product.palletWeight || 0);
      case 'box':
        return quantity * (product.boxWeight || 0);
      default:
        return quantity;
    }
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const product = products.find(p => p.id === transactionForm.productId);
      if (!product) {
        toast.error('Məhsul tapılmadı');
        return;
      }

      const quantity = Number(transactionForm.quantity);
      if (quantity <= 0) {
        toast.error('Miqdar müsbət olmalıdır');
        return;
      }

      // Calculate current stock
      const productTransactions = transactions.filter(t => t.productId === product.id);
      const totalIn = productTransactions
        .filter(t => t.type === 'in')
        .reduce((sum, t) => sum + t.quantity, 0);
      const totalOut = productTransactions
        .filter(t => t.type === 'out')
        .reduce((sum, t) => sum + t.quantity, 0);
      const currentStock = totalIn - totalOut;

      // For outgoing transactions, check if there's enough stock
      if (transactionForm.type === 'out' && quantity > currentStock) {
        toast.error(`Kifayət qədər stok yoxdur. Mövcud stok: ${currentStock} ${getUnitLabel(product.unit)}`);
        return;
      }

      const totalWeight = calculateTransactionWeight(quantity, product);

      const transactionData = {
        ...transactionForm,
        quantity: quantity,
        totalWeight,
        date: new Date(),
      };

      // Update product's quantity and total weight in the products collection
      const newQuantity = transactionForm.type === 'in' 
        ? product.quantity + quantity 
        : product.quantity - quantity;

      const newTotalWeight = calculateTransactionWeight(newQuantity, product);

      await updateDoc(doc(db, 'products', product.id), {
        quantity: newQuantity,
        totalWeight: newTotalWeight,
        updatedAt: new Date(),
      });

      await addDoc(collection(db, 'transactions'), transactionData);
      toast.success('Əməliyyat əlavə edildi');
      setIsModalOpen(false);
      setTransactionForm({
        productId: '',
        type: 'in',
        quantity: '',
        note: '',
      });
      fetchProducts();
      fetchTransactions();
    } catch (error) {
      toast.error('Xəta baş verdi');
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const product = products.find(p => p.id === transaction.productId);
    if (!product) return false;
    
    return (
      (!selectedProduct || transaction.productId === selectedProduct) &&
      (!selectedCompany || product.company === selectedCompany)
    );
  });

  const companies = [...new Set(products.map(p => p.company))];

  const exportToExcel = () => {
    const data = filteredTransactions.map(transaction => {
      const product = products.find(p => p.id === transaction.productId);
      return {
        'Tarix': format(transaction.date, 'dd.MM.yyyy HH:mm'),
        'Məhsul': product?.name,
        'Firma': product?.company,
        'Növ': transaction.type === 'in' ? 'Giriş' : 'Çıxış',
        'Miqdar': `${transaction.quantity} ${product ? getUnitLabel(product.unit) : 'kg'}`,
        'Ümumi Çəki (kg)': transaction.totalWeight,
        'Qeyd': transaction.note,
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hesabat');
    XLSX.writeFile(wb, `hesabat-${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    const tableData = filteredTransactions.map(transaction => {
      const product = products.find(p => p.id === transaction.productId);
      return [
        format(transaction.date, 'dd.MM.yyyy HH:mm'),
        product?.name,
        product?.company,
        transaction.type === 'in' ? 'Giriş' : 'Çıxış',
        `${transaction.quantity} ${product ? getUnitLabel(product.unit) : 'kg'}`,
        `${transaction.totalWeight} kg`,
        transaction.note || '',
      ];
    });

    doc.autoTable({
      head: [['Tarix', 'Məhsul', 'Firma', 'Növ', 'Miqdar', 'Ümumi Çəki', 'Qeyd']],
      body: tableData,
    });

    doc.save(`hesabat-${format(new Date(), 'dd-MM-yyyy')}.pdf`);
  };

  const productChartData = products.map(product => {
    const productTransactions = filteredTransactions.filter(t => t.productId === product.id);
    const totalIn = productTransactions
      .filter(t => t.type === 'in')
      .reduce((sum, t) => sum + t.totalWeight, 0);
    const totalOut = productTransactions
      .filter(t => t.type === 'out')
      .reduce((sum, t) => sum + t.totalWeight, 0);

    return {
      name: product.name,
      giriş: totalIn,
      çıxış: totalOut,
      qalıq: totalIn - totalOut
    };
  });

  const monthlyTrendData = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(new Date(), i);
    const monthTransactions = transactions.filter(t => 
      t.date.getMonth() === month.getMonth() &&
      t.date.getFullYear() === month.getFullYear()
    );

    const totalIn = monthTransactions
      .filter(t => t.type === 'in')
      .reduce((sum, t) => sum + t.totalWeight, 0);

    const totalOut = monthTransactions
      .filter(t => t.type === 'out')
      .reduce((sum, t) => sum + t.totalWeight, 0);

    return {
      month: format(month, 'MMM yyyy'),
      giriş: totalIn,
      çıxış: totalOut,
    };
  }).reverse();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Hesabatlar</h1>
        <div className="flex gap-4">
          {/* <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Yeni Əməliyyat
          </button> */}
          <button
            onClick={exportToExcel}
            className="bg-green-600 text-white px-4 py-2 rounded-md flex items-center"
          >
            <Download className="w-5 h-5 mr-2" />
            Excel
          </button>
          <button
            onClick={exportToPDF}
            className="bg-red-600 text-white px-4 py-2 rounded-md flex items-center"
          >
            <Download className="w-5 h-5 mr-2" />
            PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Ümumi Giriş</p>
              <p className="text-2xl font-bold">{summary.totalIn.toFixed(2)} kg</p>
            </div>
            <TrendingUp className="w-10 h-10 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Ümumi Çıxış</p>
              <p className="text-2xl font-bold">{summary.totalOut.toFixed(2)} kg</p>
            </div>
            <TrendingDown className="w-10 h-10 text-red-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Məhsul Sayı</p>
              <p className="text-2xl font-bold">{summary.productCounts}</p>
            </div>
            <Package className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Palet Girişi</p>
              <p className="text-2xl font-bold">{palletSummary.totalPalletsIn} palet</p>
            </div>
            <Boxes className="w-10 h-10 text-emerald-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Palet Çıxışı</p>
              <p className="text-2xl font-bold">{palletSummary.totalPalletsOut} palet</p>
            </div>
            <Boxes className="w-10 h-10 text-orange-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Əməliyyat Sayı</p>
              <p className="text-2xl font-bold">{summary.transactionCounts}</p>
            </div>
            <Filter className="w-10 h-10 text-purple-500" />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Başlanğıc Tarix
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Son Tarix
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Məhsul
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="">Bütün məhsullar</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Firma
            </label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="">Bütün firmalar</option>
              {companies.map(company => (
                <option key={company} value={company}>
                  {company}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Aylıq Trend</h2>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="giriş" stroke="#4CAF50" />
              <Line type="monotone" dataKey="çıxış" stroke="#f44336" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Məhsul Hərəkəti</h2>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={productChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="giriş" fill="#4CAF50" />
              <Bar dataKey="çıxış" fill="#f44336" />
              <Bar dataKey="qalıq" fill="#2196F3" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow mb-6 overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tarix
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Məhsul
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Firma
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Növ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Miqdar
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ümumi Çəki
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Qeyd
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTransactions.map((transaction) => {
              const product = products.find(p => p.id === transaction.productId);
              return (
                <tr key={transaction.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {format(transaction.date, 'dd.MM.yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {product?.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {product?.company}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center ${
                      transaction.type === 'in' 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {transaction.type === 'in' ? (
                        <TrendingUp className="w-4 h-4 mr-1" />
                      ) : (
                        <TrendingDown className="w-4 h-4 mr-1" />
                      )}
                      {transaction.type === 'in' ? 'Giriş' : 'Çıxış'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {transaction.quantity} {product ? getUnitLabel(product.unit) : 'kg'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {transaction.totalWeight} kg
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {transaction.note}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-6">Yeni Əməliyyat</h2>
            <form onSubmit={handleTransactionSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Məhsul
                </label>
                <select
                  value={transactionForm.productId}
                  onChange={(e) => {
                    const product = products.find(p => p.id === e.target.value);
                    setTransactionForm({ 
                      ...transactionForm, 
                      productId: e.target.value,
                      quantity: ''  // Reset quantity when product changes
                    });
                  }}
                  className="w-full p-2 border rounded-md"
                  required
                >
                  <option value="">Məhsul seçin</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {product.company} ({product.quantity} {getUnitLabel(product.unit)} mövcud)
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Əməliyyat Növü
                </label>
                <select
                  value={transactionForm.type}
                  onChange={(e) => setTransactionForm({ ...transactionForm, type: e.target.value as 'in' | 'out' })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="in">Giriş</option>
                  <option value="out">Çıxış</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Miqdar {transactionForm.productId && `(${getUnitLabel(products.find(p => p.id === transactionForm.productId)?.unit || 'kg')})`}
                </label>
                <input
                  type="number"
                  value={transactionForm.quantity}
                  onChange={(e) => setTransactionForm({ ...transactionForm, quantity: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  required
                  min="0.01"
                  step="0.01"
                />
                {transactionForm.productId && transactionForm.type === 'out' && (
                  <p className="text-sm text-gray-600 mt-1">
                    Mövcud stok: {products.find(p => p.id === transactionForm.productId)?.quantity} 
                    {' '}{getUnitLabel(products.find(p => p.id === transactionForm.productId)?.unit || 'kg')}
                  </p>
                )}
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Qeyd
                </label>
                <textarea
                  value={transactionForm.note}
                  onChange={(e) => setTransactionForm({ ...transactionForm, note: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setTransactionForm({
                      productId: '',
                      type: 'in',
                      quantity: '',
                      note: '',
                    });
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Ləğv et
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Əlavə et
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;