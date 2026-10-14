import { useSearchParams } from 'react-router';
import { Shell } from '../components/Layout';
import { RINGS_DESKTOP, RINGS_MOBILE } from '../features/auth/signIn';
import { DecorRings, ExploreWithoutAccount, HomeLogo, LinkStatus, OpenDemoLink, SentBlock, SignInForm, Tagline } from '../features/auth/SignInParts';
import styles from '../features/auth/SignIn.module.css';
import { useMagicLink, useSignIn } from '../features/auth/useSignIn';
import { useIsDesktop } from '../lib/useMedia';

/** Entrar sem palavra-passe: pedir um link por email (contentor: estado do link e layout) */
export default function Entrar() {
  const desktop = useIsDesktop();
  const [params] = useSearchParams();
  const link = useMagicLink(params.get('token'));
  const s = useSignIn();

  if (link.state !== 'idle') {
    return (
      <Shell chrome="none">
        <LinkStatus state={link.state} onRetry={link.reset} />
      </Shell>
    );
  }

  if (desktop) {
    return (
      <Shell chrome="none">
        <div className={`row wrap ${styles.desktop}`}>
          <div className={`stack between ${styles.brand}`}>
            <HomeLogo height={72} className={styles.brandLogo} />
            <div aria-hidden="true" className={styles.brandRings}>
              <DecorRings rings={RINGS_DESKTOP} unit="%" />
            </div>
            <Tagline />
          </div>
          <div className={`row ${styles.formSide}`}>
            <div className={styles.formBox}>
              {s.sent ? <SentBlock s={s} desktop /> : <SignInForm s={s} desktop />}
              <ExploreWithoutAccount />
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell chrome="none">
      <div className={styles.mobile}>
        <div className={styles.mobileTop}>
          <HomeLogo height={64} className={styles.mobileLogo} />
          <div aria-hidden="true" className={styles.mobileRings}>
            <DecorRings rings={RINGS_MOBILE} unit="px" />
          </div>
        </div>
        <div className={styles.sheet}>
          <div className={styles.sheetInner}>
            {s.sent ? (
              <>
                <SentBlock s={s} desktop={false} />
                <OpenDemoLink s={s} className={styles.bottom} />
              </>
            ) : (
              <div className={styles.grow}>
                <SignInForm s={s} desktop={false} />
              </div>
            )}
            <ExploreWithoutAccount />
          </div>
        </div>
      </div>
    </Shell>
  );
}
