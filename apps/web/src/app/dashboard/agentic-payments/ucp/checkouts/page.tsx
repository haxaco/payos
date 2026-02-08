import { redirect } from 'next/navigation';

export default function UcpCheckoutsRedirect() {
    redirect('/dashboard/settlements');
}
