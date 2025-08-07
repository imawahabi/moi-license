import React, { useState, useEffect } from 'react';
import { Employee } from '../types';
import { Edit, X } from 'lucide-react';

interface EditEmployeeModalProps {
  employee: Employee;
  onUpdate: (employee: Partial<Employee>) => void;
  onClose: () => void;
}

const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({ employee, onUpdate, onClose }) => {
  const [formData, setFormData] = useState({
    full_name: employee.full_name,
    rank: employee.rank,
    file_number: employee.file_number,
    category: employee.category,
  });

  useEffect(() => {
    setFormData({
        full_name: employee.full_name,
        rank: employee.rank,
        file_number: employee.file_number,
        category: employee.category,
    });
  }, [employee]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name?.trim() || !formData.category) {
      alert('يرجى إدخال الاسم الكامل وتحديد الفئة');
      return;
    }
    onUpdate(formData);
  };

  return (
    <div className="modal-overlay animate-fade-in" dir="rtl">
      <div className="modal-container animate-fade-in-down">
        <div className="modal-header">
          <h3 className="modal-title">
            <Edit className="w-6 h-6 text-primary-600" />
            تعديل بيانات الموظف
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-secondary-600" />
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} className="space-y-6">
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
            <div className="modal-footer">
              <button type="button" onClick={onClose} className="btn-secondary">
                إلغاء
              </button>
              <button type="submit" className="btn-primary">
                حفظ التغييرات
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditEmployeeModal;
