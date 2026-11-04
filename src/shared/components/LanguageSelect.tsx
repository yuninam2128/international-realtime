import type { SelectHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';
import { LANGUAGES } from '../lib/languages';

type LanguageSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> & {
  value: string;
  onChange: (language: string) => void;
};

export default function LanguageSelect({ className, onChange, ...rest }: LanguageSelectProps) {
  return (
    <select
      className={twMerge(
        'h-[45px] rounded-2 border border-gray-100 bg-white px-3 body-03 text-gray-900 outline-none transition-colors hover:bg-gray-50 focus:border-primary-300',
        className
      )}
      onChange={e => onChange(e.target.value)}
      {...rest}
    >
      {LANGUAGES.map(({ code, label }) => (
        <option key={code} value={code}>
          {label}
        </option>
      ))}
    </select>
  );
}
