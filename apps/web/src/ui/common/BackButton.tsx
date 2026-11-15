// SI-assisted (Claude Code); reviewed by <name>
import { type Locale, t } from '../../i18n';
import { Icon } from './Icon';

interface Props {
  locale: Locale;
  /** Where it goes ("Back to the field"), for screen readers and the tooltip; the text is just "Back". */
  label: string;
  onClick: () => void;
}

/** The one Back control: same place, icon and word on every step after the globe. */
export function BackButton({ locale, label, onClick }: Props) {
  return (
    <button type="button" className="backbtn" onClick={onClick} aria-label={label} title={label}>
      <Icon name="back" size={18} />
      {t(locale, 'nav.back')}
    </button>
  );
}
