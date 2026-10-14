import { useParams } from 'react-router';
import { useOrg } from '../api/orgs';
import { Shell } from '../components/Layout';
import { findTarget } from '../features/report/report';
import { ReportNotFound } from '../features/report/ReportParts';
import { ReportDesktop, ReportMobile } from '../features/report/ReportViews';
import { useReport } from '../features/report/useReport';
import { useIsDesktop } from '../lib/useMedia';

/** Denunciar uma avaliação ou entrevista (contentor: o que se denuncia, estado e layout) */
export default function Denunciar() {
  const { id, reviewId } = useParams();
  const org = useOrg(id);
  const target = findTarget(org, reviewId);
  const desktop = useIsDesktop();
  const r = useReport(id, reviewId, target?.kind);
  const orgPath = org ? `/org/${org.id}` : '/ranking';

  if (!org || !target) {
    return (
      <Shell chrome="full">
        <ReportNotFound orgPath={orgPath} orgName={org?.name} desktop={desktop} />
      </Shell>
    );
  }
  const props = { org, target, r, orgPath };
  return desktop ? (
    <Shell chrome="full">
      <ReportDesktop {...props} />
    </Shell>
  ) : (
    <Shell chrome="none">
      <ReportMobile {...props} />
    </Shell>
  );
}
