'use client';

import React, { memo, ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  children: ReactNode;
  required?: boolean;
  className?: string;
}

const FormField = memo(function FormField({
  label,
  children,
  required = false,
  className = ''
}: FormFieldProps) {
  return (
    <div className={className}>
      <label className="block text-[10px] font-medium text-gray-500 dark:text-white/50 mb-1 uppercase tracking-wide select-none">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
});

export default FormField;
