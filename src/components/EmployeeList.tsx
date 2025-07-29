import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { EmployeeService } from '../services/employeeService';
import { LicenseService } from '../services/licenseService';
import { Employee, License } from '../types';
import { sortEmployees } from '../utils/sorting';
import EmployeeDetailsModal from './EmployeeDetailsModal';
import AddEmployeeModal from './AddEmployeeModal';
import EditEmployeeModal from './EditEmployeeModal';

const EmployeeList: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
  const [employeeLicenses, setEmployeeLicenses] = useState<License[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [employees, searchQuery, categoryFilter]);

  const loadEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await EmployeeService.getAll();
      setEmployees(data);
    } catch (err) {
      console.error('Error loading employees:', err);
      setError('فشل في تحميل قائمة الموظفين. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...employees];
    if (searchQuery) {
      filtered = filtered.filter(emp =>
        emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.rank.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.file_number.includes(searchQuery)
      );
    }
    if (categoryFilter) {
      filtered = filtered.filter(emp => emp.category === categoryFilter);
    }
    setFilteredEmployees(sortEmployees(filtered));
  };
  
  const handleAdd = async (employeeData: Omit<Employee, 'id'>) => {
    try {
      await EmployeeService.create(employeeData);
      setMessage({ type: 'success', text: 'تمت إضافة الموظف بنجاح' });
      setShowAddModal(false);
      loadEmployees();
    } catch (error) {
      console.error('Error adding employee:', error);
      setMessage({ type: 'error', text: 'فشل في إضافة الموظف' });
    }
  };

  const handleUpdate = async (employeeData: Partial<Employee>) => {
    if (!employeeToEdit) return;
    try {
      await EmployeeService.update(employeeToEdit.id, employeeData);
      setMessage({ type: 'success', text: 'تم تحديث بيانات الموظف بنجاح' });
      setShowEditModal(false);
      setEmployeeToEdit(null);
      loadEmployees();
    } catch (error) {
      console.error('Error updating employee:', error);
      setMessage({ type: 'error', text: 'فشل في تحديث بيانات الموظف' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الموظف؟ سيتم حذف جميع الرخص المرتبطة به.')) return;
    try {
      await EmployeeService.delete(id);
      setMessage({ type: 'success', text: 'تم حذف الموظف بنجاح' });
      loadEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      setMessage({ type: 'error', text: 'فشل في حذف الموظف' });
    }
  };

  const handleViewDetails = async (employee: Employee) => {
    try {
      const licenses = await LicenseService.getByEmployee(employee.id);
      setSelectedEmployee(employee);
      setEmployeeLicenses(licenses);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error loading employee licenses:', error);
      setMessage({ type: 'error', text: 'فشل في تحميل رخص الموظف' });
    }
  };

  const openEditModal = (employee: Employee) => {
    setEmployeeToEdit(employee);
    setShowEditModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600 font-semibold text-lg">{error}</p>
        <button onClick={loadEmployees} className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans" dir="rtl">
      <div className="bg-white p-6 rounded-2xl shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-800">إدارة الموظفين</h1>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn-primary inline-flex items-center gap-2 mt-4 md:mt-0">
            <Plus size={20} />
            إضافة موظف جديد
          </button>
        </div>

        {message && (
          <div className={`p-4 mb-4 text-sm rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`} role="alert">
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="بحث بالاسم، الرتبة، أو رقم الملف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field"
          >
            <option value="">كل الفئات</option>
            <option value="ضابط">ضباط</option>
            <option value="ضابط صف">ضباط صف</option>
            <option value="مهني">مهنيين</option>
            <option value="مدني">مدنيين</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="table-unified">
            <thead>
              <tr>
                <th>م</th>
                <th>الاسم الكامل</th>
                <th>الرتبة</th>
                <th>رقم الملف</th>
                <th>الفئة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((employee, index) => (
                <tr key={employee.id}>
                  <td>{index + 1}</td>
                  <td className="font-medium">{employee.full_name}</td>
                  <td>{employee.rank}</td>
                  <td>{employee.file_number}</td>
                  <td><span className="category-badge">{employee.category}</span></td>
                  <td>
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleViewDetails(employee)} className="btn-icon text-blue-600 hover:text-blue-800"><Eye size={18} /></button>
                      <button onClick={() => openEditModal(employee)} className="btn-icon text-yellow-600 hover:text-yellow-800"><Edit size={18} /></button>
                      <button onClick={() => handleDelete(employee.id)} className="btn-icon text-red-600 hover:text-red-800"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && <AddEmployeeModal onAdd={handleAdd} onClose={() => setShowAddModal(false)} />}
      {showEditModal && employeeToEdit && <EditEmployeeModal employee={employeeToEdit} onUpdate={handleUpdate} onClose={() => setShowEditModal(false)} />}
      {showDetailsModal && selectedEmployee && <EmployeeDetailsModal employee={selectedEmployee} licenses={employeeLicenses} onClose={() => setShowDetailsModal(false)} />}
    </div>
  );
};

export default EmployeeList;