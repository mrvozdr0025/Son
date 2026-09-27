import { getAds } from "@/app/actions/admin"
import { AdManager } from "@/components/admin/ad-manager"

export default async function AdminAdsPage() {
  const adList = await getAds()
  return <AdManager ads={adList} />
}
