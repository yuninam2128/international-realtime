import type { InputHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export default function Input({ label, className = '', id, ...rest }: InputProps) {
  return (
    <label htmlFor={id} className="flex flex-col gap-[6px]">
      {label && <span className="body-02 text-gray-900">{label}</span>}
      <input
        id={id}
        className={twMerge(
          'h-[45px] rounded-2 border border-gray-100 bg-white px-4 py-3 body-03 text-gray-900 outline-none transition-colors placeholder:text-gray-300 hover:bg-gray-50 focus:border-primary-300',
          className
        )}
        {...rest}
      />
    </label>
  );
}
