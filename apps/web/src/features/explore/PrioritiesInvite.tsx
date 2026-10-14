import { Link } from 'react-router';
import { Icon } from '../../components/Icon';
import { tr } from '../../i18n';
import styles from './Explore.module.css';

/** Primeira visita: escolher prioridades é um convite, não uma porta obrigatória antes de ver organizações */
export function PrioritiesInvite() {
  return (
    <Link to="/preferencias" className={`plain row lift ${styles.invite}`} data-ev="cta_click" data-ev-cta="prioridades" data-ev-area="explorar">
      <span className={styles.inviteText}>
        <span className={styles.inviteTitle}>{tr('Ordenar pelo que importa para ti', 'Sort by what matters to you')}</span>
        <span className="small muted">{tr('Escolhe até 3 prioridades. Leva 10 segundos.', 'Pick up to 3 priorities. Takes 10 seconds.')}</span>
      </span>
      <Icon name="next" size={18} className={styles.inviteIcon} />
    </Link>
  );
}
