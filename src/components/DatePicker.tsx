import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import './DatePicker.css';

interface DatePickerProps {
  value?: string;
  onChange: (date: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = "اختر التاريخ",
  label,
  required = false,
  className = "",
  disabled = false,
  minDate,
  maxDate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  const monthNames = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen) {
        // إعادة حساب الموضع عند التمرير
        const inputElement = containerRef.current?.querySelector('.date-picker-input') as HTMLElement;
        const calendar = containerRef.current?.querySelector('.date-picker-calendar') as HTMLElement;

        if (calendar && inputElement) {
          const rect = inputElement.getBoundingClientRect();
          // إذا خرج الحقل من الشاشة، أغلق الكالندر
          if (rect.bottom < 0 || rect.top > window.innerHeight) {
            setIsOpen(false);
          }
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen]);

  // تحديد موضع الكالندر بناءً على موقع العنصر في الشاشة
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const inputElement = containerRef.current.querySelector('.date-picker-input') as HTMLElement;
      const calendar = containerRef.current.querySelector('.date-picker-calendar') as HTMLElement;

      if (calendar && inputElement) {
        const rect = inputElement.getBoundingClientRect();
        const screenWidth = window.innerWidth;
        const calendarWidth = 400; // العرض الجديد
        const calendarHeight = 380;

        // حساب الموضع الأفقي - وسط الحقل
        let left = rect.left + (rect.width / 2) - (calendarWidth / 2);

        // التأكد من عدم تجاوز الحدود الأفقية
        if (left + calendarWidth > screenWidth - 16) {
          left = screenWidth - calendarWidth - 16;
        }
        if (left < 16) {
          left = 16;
        }

        // حساب الموضع العمودي - أعلى الحقل بشكل افتراضي
        let top = rect.top - calendarHeight - 8;

        // إذا لم تكن هناك مساحة كافية أعلى، اعرضه أسفل
        if (top < 16) {
          top = rect.bottom + 8;
          // إذا كان سيتجاوز أسفل الشاشة أيضاً، اعرضه في أفضل موضع ممكن
          if (top + calendarHeight > window.innerHeight - 16) {
            top = Math.max(16, window.innerHeight - calendarHeight - 16);
          }
        }

        calendar.style.left = `${left}px`;
        calendar.style.top = `${top}px`;
        calendar.style.transform = 'none';
        calendar.style.position = 'fixed';
        calendar.style.zIndex = '99999';
      }
    }
  }, [isOpen]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const weeks = [];
    let currentWeek = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      currentWeek.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(new Date(year, month, day));

      // If week is complete (7 days) or it's the last day, push to weeks
      if (currentWeek.length === 7) {
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
    }

    // Fill the last week if needed
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return weeks;
  };

  const handleDateSelect = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    onChange(dateString);
    setIsOpen(false);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const isDateDisabled = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    if (minDate && dateString < minDate) return true;
    if (maxDate && dateString > maxDate) return true;
    return false;
  };

  const isDateSelected = (date: Date) => {
    if (!value) return false;
    return date.toISOString().split('T')[0] === value;
  };

  const weeks = getDaysInMonth(currentMonth);

  return (
    <div className={`date-picker-container ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2 text-right">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`text-right
          date-picker-input
          ${disabled ? 'disabled' : ''}
          ${isOpen ? 'open' : ''}
        `}
      >
        <div className="flex items-center justify-between text-right">
          <Calendar className="w-5 h-5 text-gray-400" />
          <span className={`text-right ${value ? 'text-gray-900' : 'text-gray-500'}`}>
            {value ? formatDate(value) : placeholder}
          </span>
        </div>
      </div>

      {isOpen && (
        <div className="date-picker-calendar">
          {/* Calendar Header */}
          <div className="date-picker-header">
            <button
              onClick={() => navigateMonth('next')}
              className="date-picker-nav-button"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <h3 className="date-picker-month-year">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>

            <button
              onClick={() => navigateMonth('prev')}
              className="date-picker-nav-button"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Day Names */}
          <div className="date-picker-days-header">
            {dayNames.map(day => (
              <div key={day} className="date-picker-day-name">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="date-picker-days-grid">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="date-picker-week">
                {week.map((date, dayIndex) => (
                  <div key={dayIndex}>
                    {date ? (
                      <button
                        onClick={() => handleDateSelect(date)}
                        disabled={isDateDisabled(date)}
                        className={`
                          date-picker-day
                          ${isDateSelected(date) ? 'selected' : ''}
                          ${isDateDisabled(date) ? 'disabled' : ''}
                          ${date.toDateString() === new Date().toDateString() ? 'today' : ''}
                        `}
                      >
                        {date.getDate()}
                      </button>
                    ) : (
                      <div className="date-picker-day"></div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
