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
      await EmployeeService.update(String(employeeToEdit.id), employeeData);
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
      const licenses = await LicenseService.getByEmployee(String(employee.id));
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
    <div className="space-y-8">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-500">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">إدارة الموظفين</h1>
                <p className="text-blue-100 text-sm mt-1">إجمالي {filteredEmployees.length} موظف من أصل {employees.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-white/20 px-4 py-2 rounded-xl">
                <span className="text-white font-bold text-lg">{filteredEmployees.length}</span>
                <span className="text-blue-100 text-sm mr-1">موظف</span>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors duration-200 flex items-center gap-2"
              >
                <Plus size={20} />
                إضافة موظف جديد
              </button>
            </div>
          </div>
        </div>

        {message && (
          <div className={`p-4 mb-4 text-sm rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`} role="alert">
            {message.text}
          </div>
        )}

        <div className="search-container">
          <div className="flex flex-wrap items-center gap-6">
            <div className="search-input flex-grow">
              <input
                type="text"
                placeholder="بحث بالاسم، الرتبة، أو رقم الملف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent bg-white transition-all duration-200 shadow-sm hover:shadow-md"
              />
              <div className="search-icon">
                <Search size={20} />
              </div>
            </div>
            <div className="min-w-[200px]">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="filter-select w-full"
              >
                <option value="">جميع الفئات</option>
                <option value="ضابط">ضباط</option>
                <option value="ضابط صف">ضباط صف</option>
                <option value="مهني">مهنيين</option>
                <option value="مدني">مدنيين</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b-2 border-gray-200">م</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b-2 border-gray-200">الرتبة</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b-2 border-gray-200">الاسم الكامل</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b-2 border-gray-200">رقم الملف</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b-2 border-gray-200">الفئة</th>
                <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 border-b-2 border-gray-200">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEmployees.map((employee, index) => (
                <tr key={employee.id} className="hover:bg-blue-50 transition-colors duration-200 group">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600 group-hover:bg-blue-200">
                      {index + 1}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-700">
                    <span className="bg-gray-100 px-3 py-1 rounded-full text-xs font-semibold group-hover:bg-gray-200">
                      {employee.category === 'ضابط' || employee.category === 'ضابط صف'
                        ? employee.rank
                        : employee.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{employee.full_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{employee.file_number}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      employee.category === 'ضابط' ? 'bg-blue-100 text-blue-800' :
                      employee.category === 'ضابط صف' ? 'bg-purple-100 text-purple-800' :
                      employee.category === 'مهني' ? 'bg-green-100 text-green-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {employee.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleViewDetails(employee)}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200 group/btn"
                        title="عرض التفاصيل"
                      >
                        <Eye className="w-4 h-4 group-hover/btn:scale-110 transition-transform duration-200" />
                      </button>
                      <button
                        onClick={() => openEditModal(employee)}
                        className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-all duration-200 group/btn"
                        title="تعديل"
                      >
                        <Edit className="w-4 h-4 group-hover/btn:scale-110 transition-transform duration-200" />
                      </button>
                      <button
                        onClick={() => handleDelete(String(employee.id))}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200 group/btn"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform duration-200" />
                      </button>
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