import { Shell } from '../components/Layout';
import { ProfileDesktop } from '../features/profile/ProfileDesktop';
import { ProfileMobile } from '../features/profile/ProfileMobile';
import { SignInInvite } from '../features/profile/ProfileParts';
import styles from '../features/profile/Profile.module.css';
import { useProfile } from '../features/profile/useProfile';
import { useIsDesktop } from '../lib/useMedia';

/** A tua conta (contentor: sessão, dados e layout) */
export default function Perfil() {
  const desktop = useIsDesktop();
  const p = useProfile(desktop);

  let content;
  if (!p.user)
    content = (
      <div className={`${desktop ? 'container dpage' : 'page'} ${styles.invitePage}`}>
        <SignInInvite p={p} />
      </div>
    );
  else if (desktop) content = <ProfileDesktop p={p} email={p.user.email} />;
  else content = <ProfileMobile p={p} email={p.user.email} />;
  return <Shell nav>{content}</Shell>;
}
