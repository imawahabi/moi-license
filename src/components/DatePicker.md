# DatePicker Component

مكون كالندر محسن ومخصص للتطبيقات العربية مع دعم كامل للغة العربية والتصميم المتجاوب.

## المميزات

- ✅ دعم كامل للغة العربية (RTL)
- ✅ تصميم متجاوب وأنيق
- ✅ سهولة الاستخدام والتخصيص
- ✅ دعم تحديد نطاق التواريخ (minDate, maxDate)
- ✅ تصميم يتماشى مع Tailwind CSS
- ✅ إمكانية التعطيل والتفعيل
- ✅ رسائل خطأ وتحقق من صحة البيانات
- ✅ أنيميشن سلس للفتح والإغلاق

## الاستخدام الأساسي

```tsx
import DatePicker from './DatePicker';

function MyComponent() {
  const [selectedDate, setSelectedDate] = useState('');

  return (
    <DatePicker
      label="تاريخ الميلاد"
      value={selectedDate}
      onChange={setSelectedDate}
      placeholder="اختر التاريخ"
      required
    />
  );
}
```

## الخصائص (Props)

| الخاصية | النوع | الافتراضي | الوصف |
|---------|------|----------|-------|
| `value` | `string` | `undefined` | القيمة الحالية للتاريخ بصيغة YYYY-MM-DD |
| `onChange` | `(date: string) => void` | - | دالة يتم استدعاؤها عند تغيير التاريخ |
| `label` | `string` | `undefined` | تسمية الحقل |
| `placeholder` | `string` | `"اختر التاريخ"` | النص الظاهر عند عدم وجود قيمة |
| `required` | `boolean` | `false` | هل الحقل مطلوب |
| `disabled` | `boolean` | `false` | هل الحقل معطل |
| `className` | `string` | `""` | فئات CSS إضافية |
| `minDate` | `string` | `undefined` | أقل تاريخ مسموح (YYYY-MM-DD) |
| `maxDate` | `string` | `undefined` | أكبر تاريخ مسموح (YYYY-MM-DD) |

## أمثلة الاستخدام

### مثال بسيط
```tsx
<DatePicker
  value={date}
  onChange={setDate}
  placeholder="اختر التاريخ"
/>
```

### مع تسمية ومطلوب
```tsx
<DatePicker
  label="تاريخ الرخصة"
  value={licenseDate}
  onChange={setLicenseDate}
  placeholder="اختر تاريخ الرخصة"
  required
/>
```

### مع نطاق تواريخ محدد
```tsx
<DatePicker
  label="تاريخ البداية"
  value={startDate}
  onChange={setStartDate}
  placeholder="اختر تاريخ البداية"
  maxDate={endDate} // لا يمكن اختيار تاريخ بعد تاريخ النهاية
/>

<DatePicker
  label="تاريخ النهاية"
  value={endDate}
  onChange={setEndDate}
  placeholder="اختر تاريخ النهاية"
  minDate={startDate} // لا يمكن اختيار تاريخ قبل تاريخ البداية
/>
```

### معطل
```tsx
<DatePicker
  label="تاريخ غير قابل للتعديل"
  value={fixedDate}
  onChange={() => {}} // لن يتم استدعاؤها
  disabled
/>
```

## التخصيص

يمكن تخصيص مظهر المكون من خلال:

1. **ملف CSS المخصص**: تعديل `DatePicker.css`
2. **فئات Tailwind**: إضافة فئات CSS عبر خاصية `className`
3. **متغيرات CSS**: تعديل الألوان والخطوط

### مثال على التخصيص
```tsx
<DatePicker
  value={date}
  onChange={setDate}
  className="border-green-300 focus:border-green-500 focus:ring-green-200"
  placeholder="تاريخ مخصص"
/>
```

## الدعم والمتوافقية

- ✅ React 16.8+
- ✅ TypeScript
- ✅ جميع المتصفحات الحديثة
- ✅ الأجهزة المحمولة والحاسوب
- ✅ قارئات الشاشة (Accessibility)

## الملاحظات

- التواريخ يتم تمريرها وإرجاعها بصيغة ISO (YYYY-MM-DD)
- المكون يدعم التنقل بلوحة المفاتيح
- يتم إغلاق الكالندر تلقائياً عند النقر خارجه
- الأسماء العربية للشهور والأيام مدمجة

## التطوير المستقبلي

- [ ] دعم اختيار نطاق تواريخ
- [ ] دعم التوقيت (ساعة ودقيقة)
- [ ] دعم التقويم الهجري
- [ ] المزيد من خيارات التخصيص
