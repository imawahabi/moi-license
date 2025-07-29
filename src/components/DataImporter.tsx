import React, { useState } from 'react';
import { Upload, Download, FileText, Users, BarChart3, Database, Save } from 'lucide-react';
import { SQLImporter } from '../utils/sqlImporter';
import { Employee } from '../types';
import { EmployeeService } from '../services/employeeService';

const DataImporter: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isSQL = file.name.endsWith('.sql');
    const isJSON = file.name.endsWith('.json');

    if (!isSQL && !isJSON) {
      setMessage({ type: 'error', text: 'يرجى اختيار ملف SQL أو JSON فقط' });
      return;
    }

    setLoading(true);
    try {
      const content = await file.text();
      let parsedEmployees: Employee[] = [];

      if (isSQL) {
        parsedEmployees = SQLImporter.parseEmployeesFromSQL(content);
      } else if (isJSON) {
        const jsonData = JSON.parse(content);
        parsedEmployees = Array.isArray(jsonData) ? jsonData : [];
      }

      if (parsedEmployees.length === 0) {
        setMessage({ type: 'error', text: 'لم يتم العثور على بيانات الموظفين في الملف' });
        return;
      }

      setEmployees(parsedEmployees);
      setStats(SQLImporter.getEmployeeStats(parsedEmployees));
      setMessage({
        type: 'success',
        text: `تم استيراد ${parsedEmployees.length} موظف بنجاح من ملف ${isSQL ? 'SQL' : 'JSON'}`
      });
    } catch (error) {
      console.error('Error parsing file:', error);
      setMessage({ type: 'error', text: 'خطأ في تحليل الملف' });
    } finally {
      setLoading(false);
    }
  };

  const downloadJSON = () => {
    if (employees.length === 0) return;
    
    const jsonData = SQLImporter.employeesToJSON(employees);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employees.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTypeScript = () => {
    if (employees.length === 0) return;
    
    const tsCode = SQLImporter.employeesToTypeScript(employees);
    const blob = new Blob([tsCode], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mockEmployees.ts';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async (data: string, type: string) => {
    try {
      await navigator.clipboard.writeText(data);
      setMessage({ type: 'success', text: `تم نسخ ${type} إلى الحافظة` });
    } catch (error) {
      setMessage({ type: 'error', text: 'فشل في النسخ إلى الحافظة' });
    }
  };

  const saveToDatabase = async () => {
    if (employees.length === 0) {
      setMessage({ type: 'error', text: 'لا توجد بيانات للحفظ' });
      return;
    }

    setSaving(true);

    try {
      setMessage({ type: 'info', text: 'جاري حفظ البيانات في قاعدة البيانات...' });

      // تحضير بيانات الموظفين للحفظ
      const employeesData = employees.map(employee => ({
        full_name: employee.full_name,
        rank: employee.rank,
        file_number: employee.file_number,
        category: employee.category
      }));

      // استخدام الإضافة المجمعة
      const result = await EmployeeService.createBulk(employeesData);

      if (result.success_count > 0) {
        setMessage({
          type: 'success',
          text: `تم حفظ ${result.success_count} موظف بنجاح${result.error_count > 0 ? ` (فشل في حفظ ${result.error_count} موظف)` : ''}`
        });
      } else {
        setMessage({ type: 'error', text: 'فشل في حفظ جميع الموظفين' });
      }
    } catch (error) {
      console.error('Error saving to database:', error);
      setMessage({ type: 'error', text: 'خطأ في الاتصال بقاعدة البيانات' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
          <Upload className="h-6 w-6" />
          استيراد بيانات الموظفين
        </h1>

        {/* رسائل التنبيه */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* رفع الملف */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            رفع ملف البيانات
          </h2>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".sql,.json"
              onChange={handleFileUpload}
              className="hidden"
              id="data-file-input"
              disabled={loading}
            />
            <label
              htmlFor="data-file-input"
              className={`cursor-pointer flex flex-col items-center gap-2 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Upload className="h-12 w-12 text-gray-400" />
              <span className="text-lg font-medium text-gray-700">
                {loading ? 'جاري التحليل...' : 'اختر ملف SQL أو JSON'}
              </span>
              <span className="text-sm text-gray-500">
                اسحب الملف هنا أو انقر للاختيار (.sql أو .json)
              </span>
            </label>
          </div>
        </div>

        {/* الإحصائيات */}
        {stats && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              إحصائيات الموظفين
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-blue-800">إجمالي الموظفين</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.officers}</div>
                <div className="text-sm text-green-800">ضباط</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{stats.nonCommissioned}</div>
                <div className="text-sm text-yellow-800">ضباط صف</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{stats.professional}</div>
                <div className="text-sm text-purple-800">مهنيين</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">{stats.civilian}</div>
                <div className="text-sm text-gray-800">مدنيين</div>
              </div>
            </div>
          </div>
        )}

        {/* حفظ في قاعدة البيانات */}
        {employees.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Database className="h-5 w-5" />
              حفظ في قاعدة البيانات
            </h2>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-800 text-sm mb-2">
                <strong>تنبيه:</strong> سيتم حفظ جميع الموظفين ({employees.length} موظف) في قاعدة البيانات.
              </p>
              <p className="text-blue-700 text-xs">
                تأكد من أن الخادم يعمل وقاعدة البيانات متصلة قبل الحفظ.
              </p>
            </div>

            <button
              onClick={saveToDatabase}
              disabled={saving}
              className={`w-full flex items-center justify-center gap-2 p-4 rounded-lg font-semibold transition-colors ${
                saving
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  حفظ جميع الموظفين في قاعدة البيانات
                </>
              )}
            </button>
          </div>
        )}

        {/* أدوات التصدير */}
        {employees.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Download className="h-5 w-5" />
              تصدير البيانات
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={downloadJSON}
                className="flex items-center justify-center gap-2 p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                تحميل JSON
              </button>
              
              <button
                onClick={downloadTypeScript}
                className="flex items-center justify-center gap-2 p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                تحميل TypeScript
              </button>
              
              <button
                onClick={() => copyToClipboard(SQLImporter.employeesToJSON(employees), 'JSON')}
                className="flex items-center justify-center gap-2 p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <FileText className="h-4 w-4" />
                نسخ JSON
              </button>
              
              <button
                onClick={() => copyToClipboard(SQLImporter.employeesToTypeScript(employees), 'TypeScript')}
                className="flex items-center justify-center gap-2 p-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <FileText className="h-4 w-4" />
                نسخ TypeScript
              </button>
            </div>
          </div>
        )}

        {/* معاينة البيانات */}
        {employees.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              معاينة البيانات (أول 10 موظفين)
            </h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الاسم</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الرتبة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">رقم الملف</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الفئة</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employees.slice(0, 10).map((employee) => (
                    <tr key={employee.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {employee.full_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {employee.rank}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {employee.file_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          employee.category === 'ضابط' ? 'bg-green-100 text-green-800' :
                          employee.category === 'ضابط صف' ? 'bg-blue-100 text-blue-800' :
                          employee.category === 'مهني' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {employee.category}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {employees.length > 10 && (
              <div className="mt-4 text-center text-sm text-gray-500">
                وعدد {employees.length - 10} موظف آخر...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DataImporter;
