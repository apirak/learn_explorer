import Page from '~/components/page'
import AppLayout from '~/layouts/app'

// ponytail: placeholder so the Admin link and role:admin have a target; #12 builds the dashboard.
export default function AdminDashboard() {
  return <Page title="Admin" description="The dashboard arrives in a later release." />
}

AdminDashboard.layout = [AppLayout]
