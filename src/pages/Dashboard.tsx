import  { useState, useEffect } from 'react';
import { collection, query, getDocs, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Product, Transaction } from '../types';
import { format, subDays } from 'date-fns';
import { Package, TrendingUp, TrendingDown, Box, Scale, Building, Boxes } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalCompanies: 0,
    totalWeight: 0,
    totalBoxes: 0,
    totalPallets: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch products
      const productsSnapshot = await getDocs(collection(db, 'products'));
      const productsData = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(productsData);

      // Calculate product stats
      const companies = new Set(productsData.map(p => p.company));
      const totalBoxes = productsData
        .filter(p => p.unit === 'box')
        .reduce((sum, p) => sum + p.quantity, 0);
      const totalPallets = productsData
        .filter(p => p.unit === 'pallet')
        .reduce((sum, p) => sum + p.quantity, 0);
      const totalWeight = productsData.reduce((sum, p) => sum + p.totalWeight, 0);

      setStats({
        totalProducts: productsData.length,
        totalCompanies: companies.size,
        totalWeight,
        totalBoxes,
        totalPallets,
      });

      // Fetch recent transactions
      const sevenDaysAgo = Timestamp.fromDate(subDays(new Date(), 7));
      const recentTransactionsQuery = query(
        collection(db, 'transactions'),
        where('date', '>=', sevenDaysAgo),
        orderBy('date', 'desc'),
        limit(10)
      );
      
      const recentTransactionsSnapshot = await getDocs(recentTransactionsQuery);
      const recentTransactionsData = recentTransactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
      })) as Transaction[];
      
      setRecentTransactions(recentTransactionsData);

      // Fetch all transactions for the chart
      const transactionsSnapshot = await getDocs(collection(db, 'transactions'));
      const transactionsData = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
      })) as Transaction[];
      
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || 'Unknown Product';
  };

  const getProductCompany = (productId: string) => {
    return products.find(p => p.id === productId)?.company || 'Unknown Company';
  };

  // Prepare chart data
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), i);
    const dayTransactions = transactions.filter(t => 
      format(t.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );

    const totalIn = dayTransactions
      .filter(t => t.type === 'in')
      .reduce((sum, t) => sum + t.totalWeight, 0);

    const totalOut = dayTransactions
      .filter(t => t.type === 'out')
      .reduce((sum, t) => sum + t.totalWeight, 0);

    return {
      date: format(date, 'dd.MM'),
      giriş: totalIn,
      çıxış: totalOut,
    };
  }).reverse();

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Ümumi Məhsullar</p>
              <p className="text-2xl font-bold">{stats.totalProducts}</p>
            </div>
            <Package className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Ümumi Firmalar</p>
              <p className="text-2xl font-bold">{stats.totalCompanies}</p>
            </div>
            <Building className="w-10 h-10 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Ümumi Çəki</p>
              <p className="text-2xl font-bold">{stats.totalWeight.toFixed(2)} kg</p>
            </div>
            <Scale className="w-10 h-10 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Ümumi Qutu</p>
              <p className="text-2xl font-bold">{stats.totalBoxes}</p>
            </div>
            <Box className="w-10 h-10 text-orange-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Ümumi Palet</p>
              <p className="text-2xl font-bold">{stats.totalPallets}</p>
            </div>
            <Boxes className="w-10 h-10 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Son 7 Günün Hərəkəti</h2>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area 
                type="monotone" 
                dataKey="giriş" 
                stackId="1"
                stroke="#4CAF50" 
                fill="#4CAF50" 
                fillOpacity={0.3}
              />
              <Area 
                type="monotone" 
                dataKey="çıxış" 
                stackId="1"
                stroke="#f44336" 
                fill="#f44336" 
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Son Əməliyyatlar</h2>
        </div>
        <div className="overflow-x-auto">
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
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentTransactions.map((transaction) => {
                const product = products.find(p => p.id === transaction.productId);
                return (
                  <tr key={transaction.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {format(transaction.date, 'dd.MM.yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getProductName(transaction.productId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getProductCompany(transaction.productId)}
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
                      {transaction.quantity} {product?.unit === 'box' ? 'qutu' : product?.unit === 'pallet' ? 'palet' : 'kg'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;