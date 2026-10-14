import { useParams } from 'react-router';
import { useOrg, useOrgStatus } from '../api/orgs';
import { Shell } from '../components/Layout';
import type { OrgTab } from '../features/org/org';
import { OrgLoading, OrgNotFound } from '../features/org/OrgCommon';
import { OrgDesktop } from '../features/org/OrgDesktop';
import { OrgMobile } from '../features/org/OrgMobile';
import { useOrgMeta } from '../features/org/useOrgPage';
import { useIsDesktop } from '../lib/useMedia';

/** Página de uma organização: avaliações, entrevistas ou salários (contentor: dados, estados e escolha do layout) */
export default function OrgPage({ tab }: { tab: OrgTab }) {
  const { id } = useParams();
  const org = useOrg(id);
  const status = useOrgStatus(id);
  const desktop = useIsDesktop();
  useOrgMeta(org, tab);

  let content;
  if (!org && status === 'loading') content = <OrgLoading />;
  else if (!org) content = <OrgNotFound id={id} desktop={desktop} />;
  // key: o estado local (local escolhido, "ver mais") recomeça ao mudar de organização
  else if (desktop) content = <OrgDesktop key={org.id} org={org} tab={tab} />;
  else content = <OrgMobile key={org.id} org={org} tab={tab} />;
  return <Shell nav>{content}</Shell>;
}
