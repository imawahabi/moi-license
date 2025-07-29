import React, { useState } from 'react';
import { Employee } from '../types';

interface AddEmployeeModalProps {
  onAdd: (employee: Omit<Employee, 'id'>) => void;
  onClose: () => void;
}

const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({ onAdd, onClose }) => {
  const [formData, setFormData] = useState<Omit<Employee, 'id'>>({
    full_name: '',
    rank: '',
    file_number: '',
    category: 'ضابط',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim() || !formData.category) {
      alert('يرجى إدخال الاسم الكامل وتحديد الفئة');
      return;
    }
    onAdd(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" dir="rtl">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl transform transition-all">
        <h3 className="text-xl font-semibold mb-6 text-secondary-900">إضافة موظف جديد</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">الاسم الكامل *</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">الرتبة</label>
            <input
              type="text"
              value={formData.rank}
              onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">رقم الملف</label>
            <input
              type="text"
              value={formData.file_number}
              onChange={(e) => setFormData({ ...formData, file_number: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">الفئة *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as Employee['category'] })}
              className="input-field"
              required
            >
              <option value="ضابط">ضابط</option>
              <option value="ضابط صف">ضابط صف</option>
              <option value="مهني">مهني</option>
              <option value="مدني">مدني</option>
            </select>
          </div>
          <div className="flex justify-end space-x-2 space-x-reverse pt-6">
            <button type="button" onClick={onClose} className="btn-secondary">
              إلغاء
            </button>
            <button type="submit" className="btn-primary">
              إضافة الموظف
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmployeeModal;
