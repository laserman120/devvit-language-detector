import { franc } from 'franc-min';

export const detectLanguage = (text: string): string => {
  const langCode = franc(text);
  return langCode;
};