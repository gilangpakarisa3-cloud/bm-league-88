
import { useLanguage } from '@/context/language-context';

export const useTranslation = () => {
  const { t, t_dynamic } = useLanguage();
  return { t, t_dynamic };
};
